const DEFAULT_QUOTA = 5; // default quota per user
const JWT_SECRET = "supersecretkey123"; // ganti dengan secret kamu

// Helpers untuk JWT
async function signJWT(payload, secret, expSeconds) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  function base64url(str) {
    return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }

  const header = base64url(JSON.stringify({ alg:"HS256", typ:"JWT" }));
  payload.exp = Math.floor(Date.now()/1000) + expSeconds;
  const body = base64url(JSON.stringify(payload));
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(header + "." + body));
  const signature = base64url(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  return `${header}.${body}.${signature}`;
}

async function verifyJWT(token, secret) {
  const [headerB64, bodyB64, sigB64] = token.split(".");
  if (!headerB64 || !bodyB64 || !sigB64) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name:"HMAC", hash:"SHA-256" },
    false,
    ["sign"]
  );

  function base64urlDecode(str) {
    str = str.replace(/-/g,"+").replace(/_/g,"/");
    while(str.length % 4) str += "=";
    return atob(str);
  }

  function base64urlEncode(str) {
    return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }

  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(headerB64 + "." + bodyB64));
  const calcSig = base64url(String.fromCharCode(...new Uint8Array(sigBuffer)));

  if (calcSig !== sigB64) return null;

  const payload = JSON.parse(base64urlDecode(bodyB64));
  if (payload.exp && Math.floor(Date.now()/1000) > payload.exp) return null;

  return payload;
}

export default {
  async fetch(request, env) {
    const CORS = {
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Headers":"*",
      "Access-Control-Allow-Methods":"POST, OPTIONS"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers:CORS });
    if (request.method !== "POST") return new Response(JSON.stringify({ ok:false, error:"POST only" }), { status:405, headers:{ ...CORS,"Content-Type":"application/json" }});

    const url = new URL(request.url);
    const path = url.pathname;

    let payload;
    try { payload = await request.json(); } catch { 
      return new Response(JSON.stringify({ ok:false, error:"Invalid JSON" }), { status:400, headers:{ ...CORS,"Content-Type":"application/json" }});
    }

    // -----------------------------
    // REGISTER
    // -----------------------------
    if (path === "/register") {
      if (!payload.email || !payload.password) {
        return new Response(JSON.stringify({ ok:false, error:"Missing email or password" }), { status:400, headers:{ ...CORS,"Content-Type":"application/json" }});
      }
      const userKey = `user:${payload.email}`;
      const existing = await env.KV_USERS.get(userKey);
      if (existing) return new Response(JSON.stringify({ ok:false, error:"User exists" }), { status:400, headers:{ ...CORS,"Content-Type":"application/json" }});

      const userData = {
        password: payload.password,
        quota: DEFAULT_QUOTA,
        package: "1day", // default package
        created_at: Date.now()
      };
      await env.KV_USERS.put(userKey, JSON.stringify(userData));
      return new Response(JSON.stringify({ ok:true, msg:"User registered" }), { headers:{ ...CORS,"Content-Type":"application/json" }});
    }

    // -----------------------------
    // LOGIN
    // -----------------------------
    if (path === "/login") {
      if (!payload.email || !payload.password) return new Response(JSON.stringify({ ok:false,error:"Missing email or password"}), { status:400, headers:{ ...CORS,"Content-Type":"application/json" }});
      const userKey = `user:${payload.email}`;
      const userRaw = await env.KV_USERS.get(userKey);
      if (!userRaw) return new Response(JSON.stringify({ ok:false,error:"User not found"}), { status:404, headers:{ ...CORS,"Content-Type":"application/json" }});
      const userData = JSON.parse(userRaw);
      if (userData.password !== payload.password) return new Response(JSON.stringify({ ok:false,error:"Wrong password"}), { status:401, headers:{ ...CORS,"Content-Type":"application/json" }});

      // Generate token sesuai paket
      let expSeconds = 86400; // default 1 hari
      if(userData.package === "1month") expSeconds = 30*86400;
      if(userData.package === "3month") expSeconds = 90*86400;
      if(userData.package === "1year") expSeconds = 365*86400;
      const token = await signJWT({ email:payload.email }, JWT_SECRET, expSeconds);

      return new Response(JSON.stringify({ ok:true, token, package:userData.package }), { headers:{ ...CORS,"Content-Type":"application/json" }});
    }

    // -----------------------------
    // REMOVE VIDEO
    // -----------------------------
    if (path === "/remove-video") {
      if (!payload.url) return new Response(JSON.stringify({ ok:false,error:"Missing url field"}), { status:400, headers:{ ...CORS,"Content-Type":"application/json" }});
      const authHeader = request.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ","");
      if(!token) return new Response(JSON.stringify({ ok:false,error:"Missing token"}), { status:401, headers:{ ...CORS,"Content-Type":"application/json" }});
      const decoded = await verifyJWT(token, JWT_SECRET);
      if(!decoded) return new Response(JSON.stringify({ ok:false,error:"Invalid or expired token"}), { status:401, headers:{ ...CORS,"Content-Type":"application/json" }});

      const userKey = `user:${decoded.email}`;
      const userRaw = await env.KV_USERS.get(userKey);
      if(!userRaw) return new Response(JSON.stringify({ ok:false,error:"User not found"}), { status:404, headers:{ ...CORS,"Content-Type":"application/json" }});
      const userData = JSON.parse(userRaw);
      if(userData.quota <= 0) return new Response(JSON.stringify({ ok:false,error:"Quota exceeded" }), { status:403, headers:{ ...CORS,"Content-Type":"application/json" }});

      try {
        const fl = await fetch("https://online.fliflik.com/get-video-link", {
          method:"POST",
          headers:{"Content-Type":"application/json","User-Agent":"Mozilla/5.0"},
          body: JSON.stringify({ url: payload.url })
        });
        const data = await fl.json();
        if (data.code!==200 || !data.data) return new Response(JSON.stringify({ ok:false,error:"Failed at fliflik",detail:data }), { status:502, headers:{ ...CORS,"Content-Type":"application/json" }});

        // Kurangi quota
        userData.quota -= 1;
        await env.KV_USERS.put(userKey, JSON.stringify(userData));

        // Simpan history
        const videoId = `video:${Date.now()}:${Math.random()}`;
        await env.KV_VIDEOS.put(videoId, JSON.stringify({ user:decoded.email, original_url:payload.url, clean_url:data.data, timestamp:Date.now() }));

        return new Response(JSON.stringify({ ok:true, url:data.data, remaining_quota:userData.quota }), { headers:{ ...CORS,"Content-Type":"application/json" }});
      } catch(e) {
        return new Response(JSON.stringify({ ok:false,error:e.toString() }), { status:500, headers:{ ...CORS,"Content-Type":"application/json" }});
      }
    }

    return new Response(JSON.stringify({ ok:false,error:"Unknown endpoint" }), { status:404, headers:{ ...CORS,"Content-Type":"application/json" }});
  }
};
