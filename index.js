addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Worker Endpoint: menerima JSON { "url": "<URL Sora>" }
 * Mengembalikan JSON { code:200, data:"<video_link>", msg:"success" }
 */
async function handleRequest(request) {
  try {
    // Pastikan method POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ code:405, msg:"Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Parse body JSON
    const reqData = await request.json()
    const soraUrl = reqData.url
    if (!soraUrl) {
      return new Response(JSON.stringify({ code:400, msg:"Invalid request: missing url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Fetch data dari URL Sora
    const soraResponse = await fetch(soraUrl)
    if (!soraResponse.ok) {
      return new Response(JSON.stringify({ code:500, msg:"Failed to fetch Sora URL" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    const soraJson = await soraResponse.json()
    // Ambil video link dari property `data`
    const videoLink = soraJson.data
    if (!videoLink) {
      return new Response(JSON.stringify({ code:500, msg:"Video link not found in Sora response" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Kembalikan JSON ke client
    return new Response(JSON.stringify({
      code: 200,
      data: videoLink,
      msg: "success"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    })

  } catch (err) {
    return new Response(JSON.stringify({ code:500, msg:"Internal Server Error", error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
