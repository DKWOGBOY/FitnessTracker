import { addDays, format, parseISO, isToday as isTodayFns, isYesterday } from "date-fns";

export const DATE_FMT = "yyyy-MM-dd";

export function todayStr(): string {
  return format(new Date(), DATE_FMT);
}

export function shiftDate(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), DATE_FMT);
}

export function formatDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isTodayFns(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE d MMM");
}

export function daysAgoStr(days: number): string {
  return format(addDays(new Date(), -days), DATE_FMT);
}
