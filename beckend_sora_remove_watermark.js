export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const target = url.searchParams.get("url");

      if (!target) {
        return new Response(JSON.stringify({
          error: "missing ?url param"
        }), {
          status: 400,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*"
          }
        });
      }

      // Step 1: fetch JSON link dari Fliflik
      const meta = await fetch(
        `https://online.fliflik.com/get-video-link?url=${encodeURIComponent(target)}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
          }
        }
      );

      if (!meta.ok) {
        return new Response(JSON.stringify({
          error: "fliflik-request-failed",
          status: meta.status
        }), {
          status: 500,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*"
          }
        });
      }

      const json = await meta.json();
      const videoUrl = json?.data;

      if (!videoUrl) {
        return new Response(JSON.stringify({
          error: "direct-video-link-not-found",
          raw: json
        }), {
          status: 404,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*"
          }
        });
      }

      // Step 2: streaming dari direct video
      const stream = await fetch(videoUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (!stream.ok) {
        return new Response(JSON.stringify({
          error: "video-stream-failed",
          status: stream.status
        }), {
          status: 500,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*"
          }
        });
      }

      // Step 3: kirim ke browser (stream)
      const headers = new Headers(stream.headers);
      headers.set("access-control-allow-origin", "*");
      headers.set("content-disposition", "inline");

      if (!headers.get("content-type")) {
        headers.set("content-type", "video/mp4");
      }

      return new Response(stream.body, { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({
        error: "internal-error",
        detail: err.toString()
      }), {
        status: 500,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*"
        }
      });
    }
  }
};
