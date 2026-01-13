export default {
  async fetch(request) {
    // Pastikan endpoint Worker adalah /get-video-link
    if (new URL(request.url).pathname !== "/get-video-link") {
      return new Response(JSON.stringify({ code: 404, msg: "Endpoint not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ code: 405, msg: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      // Parse JSON dari front-end
      const reqData = await request.json();
      const videoPageUrl = reqData.url;
      if (!videoPageUrl) throw new Error("Missing URL");

      // 🔑 Fetch ke endpoint asli (LiveClick / Fliflik)
      const endpointAsli = "https://online.fliflik.com/get-video-link";
      const responseAsli = await fetch(endpointAsli, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoPageUrl })
      });

      if (!responseAsli.ok) throw new Error("Failed to fetch from original endpoint");

      const dataAsli = await responseAsli.json();

      // Return JSON persis format aslinya
      return new Response(JSON.stringify(dataAsli), {
        status: 200,
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ code: 500, msg: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}
