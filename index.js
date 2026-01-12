export default {
  async fetch(req) {
    try {
      const r = await fetch("https://online.fliflik.com/get-video-link")
      const j = await r.json()

      return Response.json({
        ok: true,
        url: j.data,
        msg: "success"
      }, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      })

    } catch (e) {
      return Response.json({
        ok: false,
        msg: "worker-error",
        error: e.toString()
      }, { status: 500 })
    }
  }
}
