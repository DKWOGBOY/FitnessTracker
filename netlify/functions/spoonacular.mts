// Server-side proxy for Spoonacular - holds SPOONACULAR_API_KEY server-side
// so it never ships in the client bundle (Spoonacular itself does send CORS
// headers, so this isn't strictly needed for that reason, but the API key
// must still never be visible in client-side network requests).

const SPOONACULAR_BASE = "https://api.spoonacular.com";

// Quota headers Spoonacular returns - exposed to the client so the Recipes
// tab can show remaining daily quota instead of failing silently once it
// runs out (the free tier is a per-day cap, not per-minute).
const QUOTA_HEADERS = ["x-api-quota-left", "x-api-quota-used", "x-api-quota-request"];

export default async (req: Request) => {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "SPOONACULAR_API_KEY is not configured on the server." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");

  let targetUrl: string;
  if (endpoint === "search") {
    const params = new URLSearchParams({ addRecipeNutrition: "true", number: "12" });
    for (const key of [
      "query",
      "diet",
      "maxReadyTime",
      "number",
      "minProtein",
      "maxProtein",
      "minCalories",
      "maxCalories",
      "minCarbs",
      "maxCarbs",
      "minFat",
      "maxFat",
    ]) {
      const value = url.searchParams.get(key);
      if (value) params.set(key, value);
    }
    targetUrl = `${SPOONACULAR_BASE}/recipes/complexSearch?${params.toString()}`;
  } else if (endpoint === "detail") {
    const id = url.searchParams.get("id") ?? "";
    targetUrl = `${SPOONACULAR_BASE}/recipes/${encodeURIComponent(id)}/information?includeNutrition=true`;
  } else {
    return new Response(JSON.stringify({ error: "Unknown endpoint." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(targetUrl, { headers: { "x-api-key": apiKey } });
  const body = await upstream.text();

  const headers = new Headers({ "Content-Type": "application/json" });
  for (const key of QUOTA_HEADERS) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }

  return new Response(body, { status: upstream.status, headers });
};
