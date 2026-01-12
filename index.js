export default {
  async fetch(request) {
    try {
      const u = new URL(request.url);
      const fliflik = u.searchParams.get("url");

      if (!fliflik) {
        return new Response(JSON.stringify({ error: "missing-url" }), {
          status: 400,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
        });
      }

      const out = await fetch(`https://online.fliflik.com/get-video-link?url=${encodeURIComponent(fliflik)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      });

      const json = await out.json();

      if (!json?.data) {
        return new Response(JSON.stringify({ error: "no-video", json }), {
          status: 404,
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
        });
      }

      const videoURL = json.data;

      const vid = await fetch(videoURL, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      const h = new Headers(vid.headers);
      h.set("access-control-allow-origin", "*");
      h.set("content-disposition", "inline");

      if (!h.get("content-type")) {
        h.set("content-type", "video/mp4");
      }

      return new Response(vid.body, {
        status: vid.status,
        headers: h
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: "worker-fatal", msg: e.toString() }), {
        status: 500,
        headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
      });
    }
  }
}
