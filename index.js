// ===================== CONFIG =====================
const ENDPOINT_ASLI = "https://online.fliflik.com/get-video-link";
const CACHE_TTL = 5 * 60 * 1000; // 5 menit
const MAX_RETRIES = 2;

// Supabase Config
const SUPABASE_URL = "https://hcbpwzwconkhslapuxmt.supabase.co";
const SUPABASE_KEY = "sb_secret__EnkKRHj69I1SdldF8Vppw_8DeRN0mD";

// ===================== MEMORY CACHE =====================
const cache = new Map();

// ===================== UTILS =====================
async function fetchFromSupabase(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    }
  });
  return res.json();
}

async function insertToSupabase(table, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(data)
  });
}

// ===================== WORKER =====================
export default {
  async fetch(request) {
    const urlObj = new URL(request.url);
    const path = urlObj.pathname;

    // Root check
    if (!["/", "/get-video-link"].includes(path)) {
      return new Response(JSON.stringify({ code: 404, msg: "Endpoint not found" }), { status: 404, headers: { "Content-Type": "application/json" }});
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key"
        }
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ code: 405, msg: "Method Not Allowed" }), { status: 405, headers: { "Content-Type": "application/json" }});
    }

    try {
      const body = await request.json();
      let urls = body.url;

      // Support array of URLs
      if (!urls) throw new Error("Missing URL parameter");
      if (!Array.isArray(urls)) urls = [urls];

      // Check API-key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) return new Response(JSON.stringify({ code: 403, msg: "Missing API-key" }), { status: 403, headers: { "Content-Type": "application/json" }});
      
      const clients = await fetchFromSupabase("clients", `api_key=eq.${encodeURIComponent(apiKey)}`);
      if (!clients || clients.length === 0) return new Response(JSON.stringify({ code: 403, msg: "Invalid API-key" }), { status: 403, headers: { "Content-Type": "application/json" }});
      const client = clients[0];

      // Check rate-limit
      const now = new Date();
      const lastReset = new Date(client.last_reset || 0);
      let used_today = client.used_today || 0;
      if (now.toDateString() !== lastReset.toDateString()) used_today = 0; // reset daily limit

      if (used_today + urls.length > client.daily_limit) {
        return new Response(JSON.stringify({ code: 429, msg: "Daily limit exceeded" }), { status: 429, headers: { "Content-Type": "application/json" }});
      }

      const results = [];

      for (let url of urls) {
        const nowTs = Date.now();

        // Check memory cache
        const cached = cache.get(url);
        if (cached && nowTs - cached.timestamp < CACHE_TTL) {
          results.push({ url, ...cached.data, source: "cache" });
          continue;
        }

        // Check Supabase DB
        let dbData = await fetchFromSupabase("videos", `url=eq.${encodeURIComponent(url)}`);
        dbData = dbData.length > 0 ? dbData[0] : null;
        if (dbData) {
          cache.set(url, { data: dbData, timestamp: nowTs });
          results.push({ url, ...dbData, source: "supabase" });
          continue;
        }

        // Fetch original endpoint with retry
        let videoData = null;
        let attempt = 0;
        while (attempt <= MAX_RETRIES) {
          try {
            const resp = await fetch(ENDPOINT_ASLI, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
            if (!resp.ok) throw new Error(`Endpoint asli failed: ${resp.status}`);
            videoData = await resp.json();
            break;
          } catch (err) {
            attempt++;
            if (attempt > MAX_RETRIES) throw err;
          }
        }

        // Save to memory cache + Supabase
        const payload = { url, ...videoData, created_at: new Date().toISOString() };
        cache.set(url, { data: videoData, timestamp: nowTs });
        await insertToSupabase("videos", payload);

        results.push({ url, ...videoData, source: "fetched" });
      }

      // Update client usage
      await insertToSupabase("clients_usage", {
        client_id: client.id,
        api_key: apiKey,
        used_today: used_today + urls.length,
        last_reset: now.toISOString(),
        timestamp: now.toISOString()
      });

      return new Response(JSON.stringify({ code: 200, data: results, msg: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json;charset=UTF-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ code: 500, msg: err.message }), { status: 500, headers: { "Content-Type": "application/json" }});
    }
  }
          }
