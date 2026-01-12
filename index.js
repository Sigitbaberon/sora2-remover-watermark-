import jwt from 'jsonwebtoken';

const JWT_SECRET = "supersecretkey123"; // ganti dengan secret kamu
const DEFAULT_QUOTA = 5; // default request per user

export default {
  async fetch(request, env) {
    const CORS = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    };

    const url = new URL(request.url);
    const path = url.pathname;

    // ---------- OPTIONS ----------
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // ---------- FRONTEND DASHBOARD ----------
    if (request.method === "GET" && path === "/") {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Video Remover Dashboard</title>
  <style>
    body{font-family:sans-serif;max-width:600px;margin:auto;padding:20px}
    input, button{margin:5px 0;padding:8px;width:100%;}
    .section{border:1px solid #ccc;padding:10px;margin:10px 0;border-radius:8px;}
  </style>
</head>
<body>
  <h2>Video Remover Dashboard</h2>

  <div class="section">
    <h3>Register</h3>
    <input id="reg-email" placeholder="Email"/>
    <input id="reg-pass" placeholder="Password" type="password"/>
    <button onclick="register()">Register</button>
    <div id="reg-msg"></div>
  </div>

  <div class="section">
    <h3>Login</h3>
    <input id="login-email" placeholder="Email"/>
    <input id="login-pass" placeholder="Password" type="password"/>
    <button onclick="login()">Login</button>
    <div id="login-msg"></div>
  </div>

  <div class="section">
    <h3>Remove Video</h3>
    <input id="video-url" placeholder="Video URL"/>
    <button onclick="removeVideo()">Remove Watermark</button>
    <div id="video-msg"></div>
  </div>

  <script>
    let token = '';

    async function register() {
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-pass').value;
      const res = await fetch('/register', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email,password})
      });
      const data = await res.json();
      document.getElementById('reg-msg').innerText = JSON.stringify(data);
    }

    async function login() {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-pass').value;
      const res = await fetch('/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email,password})
      });
      const data = await res.json();
      document.getElementById('login-msg').innerText = JSON.stringify(data);
      if(data.ok) token = data.token;
    }

    async function removeVideo() {
      const url = document.getElementById('video-url').value;
      if(!token){ alert('Login dulu'); return; }
      const res = await fetch('/remove-video', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':'Bearer ' + token
        },
        body: JSON.stringify({url})
      });
      const data = await res.json();
      document.getElementById('video-msg').innerText = JSON.stringify(data,null,2);
    }
  </script>
</body>
</html>
`;
      return new Response(html, { headers: { "Content-Type":"text/html", ...CORS } });
    }

    // ---------- BACKEND API ----------
    if (request.method === "POST") {
      let payload;
      try { payload = await request.json(); } 
      catch { return new Response(JSON.stringify({ ok:false, error:"Invalid JSON" }), { status:400, headers:{ ...CORS,"Content-Type":"application/json" }}); }

      // ----- REGISTER -----
      if(path==="/register"){
        if(!payload.email || !payload.password) return new Response(JSON.stringify({ok:false,error:"Missing email or password"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
        const userKey = `user:${payload.email}`;
        const existing = await env.KV_USERS.get(userKey);
        if(existing) return new Response(JSON.stringify({ok:false,error:"User already exists"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
        const userData = { password:payload.password, quota:DEFAULT_QUOTA, created_at:Date.now() };
        await env.KV_USERS.put(userKey,JSON.stringify(userData));
        return new Response(JSON.stringify({ok:true,msg:"User registered"}),{headers:{...CORS,"Content-Type":"application/json"}});
      }

      // ----- LOGIN -----
      if(path==="/login"){
        if(!payload.email || !payload.password) return new Response(JSON.stringify({ok:false,error:"Missing email or password"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
        const userKey = `user:${payload.email}`;
        const userRaw = await env.KV_USERS.get(userKey);
        if(!userRaw) return new Response(JSON.stringify({ok:false,error:"User not found"}),{status:404,headers:{...CORS,"Content-Type":"application/json"}});
        const userData = JSON.parse(userRaw);
        if(userData.password!==payload.password) return new Response(JSON.stringify({ok:false,error:"Wrong password"}),{status:401,headers:{...CORS,"Content-Type":"application/json"}});
        const token = jwt.sign({email:payload.email},JWT_SECRET,{expiresIn:'1d'});
        return new Response(JSON.stringify({ok:true,token}),{headers:{...CORS,"Content-Type":"application/json"}});
      }

      // ----- REMOVE VIDEO -----
      if(path==="/remove-video"){
        if(!payload.url) return new Response(JSON.stringify({ok:false,error:"Missing url field"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
        const authHeader = request.headers.get("Authorization")||"";
        const tokenHeader = authHeader.replace("Bearer ","");
        if(!tokenHeader) return new Response(JSON.stringify({ok:false,error:"Missing token"}),{status:401,headers:{...CORS,"Content-Type":"application/json"}});
        let decoded;
        try{ decoded = jwt.verify(tokenHeader,JWT_SECRET); } catch(e){ return new Response(JSON.stringify({ok:false,error:"Invalid or expired token"}),{status:401,headers:{...CORS,"Content-Type":"application/json"} }); }
        const userKey = `user:${decoded.email}`;
        const userRaw = await env.KV_USERS.get(userKey);
        if(!userRaw) return new Response(JSON.stringify({ok:false,error:"User not found"}),{status:404,headers:{...CORS,"Content-Type":"application/json"}});
        const userData = JSON.parse(userRaw);
        if(userData.quota<=0) return new Response(JSON.stringify({ok:false,error:"Quota exceeded"}),{status:403,headers:{...CORS,"Content-Type":"application/json"}});

        // Fetch video dari Fliflik
        try{
          const fl = await fetch("https://online.fliflik.com/get-video-link", {
            method:"POST",
            headers:{"Content-Type":"application/json","User-Agent":"Mozilla/5.0"},
            body: JSON.stringify({url:payload.url})
          });
          const data = await fl.json();
          if(data.code!==200 || !data.data) return new Response(JSON.stringify({ok:false,error:"Failed at fliflik",detail:data}),{status:502,headers:{...CORS,"Content-Type":"application/json"}});

          // Kurangi quota
          userData.quota -= 1;
          await env.KV_USERS.put(userKey,JSON.stringify(userData));

          // Simpan history
          const videoId = `video:${Date.now()}:${Math.random()}`;
          await env.KV_VIDEOS.put(videoId,JSON.stringify({user:decoded.email,original_url:payload.url,clean_url:data.data,timestamp:Date.now()}));

          return new Response(JSON.stringify({ok:true,url:data.data,remaining_quota:userData.quota}),{headers:{...CORS,"Content-Type":"application/json"}});
        } catch(e){ return new Response(JSON.stringify({ok:false,error:e.toString()}),{status:500,headers:{...CORS,"Content-Type":"application/json"}}); }
      }

      return new Response(JSON.stringify({ok:false,error:"Unknown endpoint"}),{status:404,headers:{...CORS,"Content-Type":"application/json"}});
    }

    // Fallback
    return new Response("Not Found", { status:404, headers: CORS });
  }
};
