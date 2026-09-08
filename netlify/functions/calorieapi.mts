// Server-side proxy for CalorieAPI - it doesn't send Access-Control-Allow-Origin,
// so browsers block calling it directly from client-side JS. This function runs
// on Netlify (not subject to CORS) and holds the API key server-side, so it
// never ships in the client bundle the way a VITE_-prefixed var would.

const CALORIEAPI_BASE = "https://calorieapiadmin.com/api/v1";

export default async (req: Request) => {
  const apiKey = process.env.CALORIEAPI_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "CALORIEAPI_KEY is not configured on the server." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");

  let targetUrl: string;
  if (endpoint === "suggest") {
    const q = url.searchParams.get("q") ?? "";
    targetUrl = `${CALORIEAPI_BASE}/search/suggest?q=${encodeURIComponent(q)}&limit=15`;
  } else if (endpoint === "food") {
    const id = url.searchParams.get("id") ?? "";
    targetUrl = `${CALORIEAPI_BASE}/foods/${encodeURIComponent(id)}`;
  } else {
    return new Response(JSON.stringify({ error: "Unknown endpoint." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(targetUrl, { headers: { "X-API-Key": apiKey } });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
};
