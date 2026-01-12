

<h1 align="center">Video Resolver Worker Backend</h1>

<p align="center">
  <strong>Worker Backend</strong> untuk melakukan resolusi URL dan mengekstrak direct video link.
</p>

<hr />

<h2>🧩 Apa Ini?</h2>

<p>
Ini adalah <strong>Worker Backend</strong> yang berfungsi sebagai middleware untuk aplikasi video.
Tujuan utamanya adalah menerima URL sumber dari client, melakukan proses resolusi, dan
menghasilkan <strong>direct video link</strong> yang dapat diputar langsung di browser, video player,
atau digunakan kembali oleh aplikasi lain.
</p>

<p>
Produk ini dapat diintegrasikan dengan frontend, mobile app, desktop app,
atau sistem internal sebagai <strong>backend video fetcher</strong>.
</p>

<hr />

<h2>🏗 Cara Kerja (Arsitektur Singkat)</h2>

<ol>
  <li>Frontend / Client mengirim URL dalam format JSON ke Worker Backend.</li>
  <li>Worker melakukan resolusi media secara internal.</li>
  <li>Worker mengembalikan direct link sebagai output JSON.</li>
  <li>Client bebas menampilkan, memutar, atau mendownload video tersebut.</li>
</ol>

<hr />

<h2>🔌 Endpoint</h2>

<pre>
POST /
</pre>

Example:
<pre>
https://your-worker-url.workers.dev/
</pre>

<hr />

<h2>📥 Request</h2>

<pre>
Content-Type: application/json
</pre>

```json
{
  "url": "https://example.com/video-source"
}

<table>
<tr><th>Field</th><th>Tipe</th><th>Wajib</th><th>Deskripsi</th></tr>
<tr><td>url</td><td>string</td><td>Yes</td><td>URL sumber video yang ingin di-resolve</td></tr>
</table><hr /><h2>📤 Response (Success)</h2>{
  "ok": true,
  "url": "https://direct-video-link.mp4"
}

<h2>❌ Response (Error)</h2>{
  "ok": false,
  "error": "Reason message"
}

Kemungkinan error:

<ul>
  <li>Input tidak valid</li>
  <li>URL tidak didukung</li>
  <li>Resolusi gagal</li>
  <li>Internal processing error</li>
</ul><hr /><h2>🧪 Tes via cURL</h2>curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/video"}' \
  https://your-worker-url.workers.dev/

Output:

{
  "ok": true,
  "url": "https://direct-video-link.mp4"
}

<hr /><h2>🎮 Integrasi Frontend</h2>const res = await fetch("https://your-worker-url.workers.dev/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url })
});

const data = await res.json();
console.log(data.url);

<hr /><h2>📺 Direct Play Example (HTML)</h2><video controls src="https://direct-video-link.mp4"></video>

<hr /><h2>🎯 Fungsi Utama</h2><ul>
  <li>Video URL resolver</li>
  <li>Direct link extractor</li>
  <li>Media backend aggregator</li>
  <li>Frontend-safe response</li>
  <li>Bisa difungsikan sebagai API</li>
</ul><hr /><h2>🧱 Posisi dalam Sistem</h2><p>
Backend ini berperan sebagai <strong>jembatan</strong> antara aplikasi client dan media source.
</p>Diagram pendek:

<pre>
Client → Worker Backend → Media Source → Worker Backend → Client
</pre>Worker menghindari:

<ul>
  <li>CORS error</li>
  <li>Exposure logic di client</li>
  <li>Request blockage oleh browser</li>
</ul><hr /><h2>📦 Penggunaan Komersial</h2>Backend dapat dikemas untuk:

<ul>
  <li>API komersial</li>
  <li>Platform SaaS</li>
  <li>Private backend project</li>
  <li>Video processing pipeline</li>
  <li>Internal tools</li>
</ul><hr /><h2>🔐 Security & Privacy</h2><ul>
  <li>Tidak menyimpan data pengguna</li>
  <li>Tidak melakukan logging sensitif</li>
  <li>Logic internal disembunyikan</li>
  <li>Dapat ditambah auth/token (optional)</li>
</ul>
```
---

