export default {
  async fetch(req) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: cors })
    }

    try {
      const url = "https://online.fliflik.com/get-video-link"

      const r = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Worker Backend)"
        }
      })

      const json = await r.json()

      return new Response(JSON.stringify({
        ok: true,
        url: json.data,
        msg: "success"
      }), {
        headers: {
          ...cors,
          "Content-Type": "application/json"
        }
      })

    } catch (e) {
      return new Response(JSON.stringify({
        ok: false,
        error: e.toString()
      }), {
        status: 500,
        headers: {
          ...cors,
          "Content-Type": "application/json"
        }
      })
    }
  }
}
