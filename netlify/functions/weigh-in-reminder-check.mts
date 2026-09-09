// Scheduled job (see `config.schedule` below): finds every user who is
// overdue for a weigh-in (per-user threshold from user_settings, mirroring
// WeighInReminder.tsx's in-app banner) and hasn't already been nudged in
// that same number of days, and sends them a push notification.
//
// Runs with the Supabase service-role key, not a user session - there is no
// signed-in user in a scheduled job, so this deliberately bypasses RLS to
// read across every user's weigh-in, settings, and subscription rows (the
// same trust boundary as any other server-side admin job).

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_REMIND_AFTER_DAYS = 7;

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(b) - Date.parse(a)) / msPerDay);
}

export default async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: "Missing required environment variables." }), { status: 500 });
  }

  webpush.setVapidDetails("mailto:noreply@example.com", vapidPublicKey, vapidPrivateKey);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: subscriptions, error: subsErr }, { data: lastWeighIns, error: weighErr }, { data: settingsRows, error: settingsErr }] =
    await Promise.all([
      supabase.from("push_subscriptions").select("*"),
      supabase
        .from("weight_logs")
        .select("user_id, log_date")
        .order("log_date", { ascending: false }),
      supabase.from("user_settings").select("user_id, weigh_in_reminder_days"),
    ]);

  if (subsErr || weighErr || settingsErr) {
    return new Response(JSON.stringify({ error: (subsErr ?? weighErr ?? settingsErr)?.message }), { status: 500 });
  }

  const lastWeighInByUser = new Map<string, string>();
  for (const row of lastWeighIns ?? []) {
    if (!lastWeighInByUser.has(row.user_id)) lastWeighInByUser.set(row.user_id, row.log_date);
  }
  const reminderDaysByUser = new Map<string, number>();
  for (const row of settingsRows ?? []) reminderDaysByUser.set(row.user_id, row.weigh_in_reminder_days);

  let sent = 0;
  let pruned = 0;

  for (const sub of subscriptions ?? []) {
    const remindAfterDays = reminderDaysByUser.get(sub.user_id) ?? DEFAULT_REMIND_AFTER_DAYS;
    const lastDate = lastWeighInByUser.get(sub.user_id) ?? null;
    const daysSince = lastDate ? daysBetween(lastDate, today) : Infinity;
    const overdue = daysSince >= remindAfterDays;
    if (!overdue) continue;

    const daysSinceLastNudge = sub.last_reminder_sent_date ? daysBetween(sub.last_reminder_sent_date, today) : Infinity;
    if (daysSinceLastNudge < remindAfterDays) continue;

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: "Weigh-in reminder",
          body: lastDate
            ? `It's been ${daysSince} days since your last weigh-in - log it in KOUR.`
            : "You haven't logged a weigh-in yet - log it in KOUR.",
        }),
      );
      await supabase.from("push_subscriptions").update({ last_reminder_sent_date: today }).eq("id", sub.id);
      sent++;
    } catch (err: any) {
      // 404/410 means the browser/device unsubscribed or the subscription
      // expired - remove it so future runs don't keep retrying a dead endpoint.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        pruned++;
      }
    }
  }

  return new Response(JSON.stringify({ sent, pruned }), { status: 200 });
};

export const config = {
  // 22:00 UTC daily - roughly early morning in Adelaide (UTC+9:30/+10:30).
  schedule: "0 22 * * *",
};
