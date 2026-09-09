// AI meal-photo scan: sends a photo to Claude (Anthropic Messages API) for a
// rough guess at what's on the plate. Always a starting point for the user
// to review/edit, never logged automatically - a 2D photo can't reveal
// exact weights, only a plausible name + serving guess per item.
//
// Runs server-side so ANTHROPIC_API_KEY never ships to the client, same
// pattern as netlify/functions/calorieapi.mts.

const MODEL = "claude-sonnet-5";

const PROMPT = `You are analyzing a photo of a meal for a food-tracking app. Identify each distinct food item visible and estimate a reasonable serving amount for each.

Respond with ONLY a JSON array (no markdown, no prose, no code fences) of objects shaped like:
[{"name": "grilled chicken breast", "quantity": 1, "unit": "piece"}, {"name": "steamed rice", "quantity": 1, "unit": "cup"}]

- "unit" should be a short, common household unit (e.g. "cup", "slice", "piece", "g", "ml", "tbsp") - whatever best matches how a person would naturally describe that food's amount.
- Keep "name" short and generic (e.g. "white rice", not "a delicious bowl of white rice with herbs").
- List each visually distinct food/ingredient separately - don't merge a whole plate into one item.
- If you cannot identify anything, return an empty array [].`;

interface DetectedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export default async (req: Request) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on the server." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { image?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!body.image || !body.mediaType) {
    return new Response(JSON.stringify({ error: "Missing image data." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.mediaType, data: body.image } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    return new Response(JSON.stringify({ error: `Photo analysis failed (${upstream.status}): ${detail}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await upstream.json();
  const text = (data.content?.[0]?.text ?? "[]") as string;
  // Claude occasionally wraps JSON in a code fence despite instructions -
  // strip it defensively rather than failing the whole scan.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");

  let ingredients: DetectedIngredient[];
  try {
    const parsed = JSON.parse(cleaned);
    ingredients = Array.isArray(parsed) ? parsed : [];
  } catch {
    return new Response(JSON.stringify({ error: "Couldn't parse the AI's response." }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(ingredients), { status: 200, headers: { "Content-Type": "application/json" } });
};
