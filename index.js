export default {
  async fetch(request) {
    const CORS = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "POST only" }), {
        status: 405,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    if (!payload.url) {
      return new Response(JSON.stringify({ ok:false, error:"Missing url field" }), {
        status:400,
        headers:{ ...CORS, "Content-Type":"application/json" }
      });
    }

    try {
      const fl = await fetch("https://online.fliflik.com/get-video-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({ url: payload.url })
      });

      const data = await fl.json();

      if (data.code !== 200 || !data.data) {
        return new Response(JSON.stringify({ ok:false, error:"Failed at fliflik", detail:data }), {
          status:502,
          headers:{ ...CORS, "Content-Type":"application/json" }
        });
      }

      return new Response(JSON.stringify({
        ok:true,
        url:data.data
      }), {
        headers:{ ...CORS, "Content-Type":"application/json" }
      });

    } catch (e) {
      return new Response(JSON.stringify({ ok:false, error:e.toString() }), {
        status:500,
        headers:{ ...CORS, "Content-Type":"application/json" }
      });
    }
  }
};
