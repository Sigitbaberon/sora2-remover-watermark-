

Dokumentasi Worker “Sora Remover Watermark”

1️⃣ URL Endpoint Worker

Endpoint	Method	Deskripsi

/get-video-link	POST	Mengambil link video dari URL yang dikirim, support single atau multiple URL


CORS: * → aman untuk front-end.


---

2️⃣ Headers yang Dibutuhkan

Header	Wajib?	Deskripsi

Content-Type	✅	Harus application/json
x-api-key	✅	API-key klien untuk autentikasi & rate-limit



---

3️⃣ Request Body

Single URL:

{
  "url": "https://sora.chatgpt.com/p/s_691284466e908191a23cc542f66a5c90"
}

Multiple URL (Batch):

{
  "url": [
    "https://sora.chatgpt.com/p/s_691284466e908191a23cc542f66a5c90",
    "https://sora.chatgpt.com/p/s_abcdef1234567890"
  ]
}


---

4️⃣ Response Body

Sukses single / batch URL:

{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "url": "https://sora.chatgpt.com/p/s_691284466e908191a23cc542f66a5c90",
      "data": "https://videos.openai.com/az/files/00000000-94fc-7285-a34e-faf15694be48/raw?sp=r...",
      "source": "fetched" // "cache" / "supabase" / "fetched"
    },
    {
      "url": "https://sora.chatgpt.com/p/s_abcdef1234567890",
      "data": "https://videos.openai.com/az/files/00000000-xxxx/raw?sp=r...",
      "source": "supabase"
    }
  ]
}

Error / Rate-limit / API-key invalid:

{
  "code": 403,
  "msg": "Invalid API-key"
}

{
  "code": 429,
  "msg": "Daily limit exceeded"
}

{
  "code": 500,
  "msg": "Internal server error"
}


---

5️⃣ Struktur Supabase

Tabel clients

Field	Tipe	Deskripsi

id	uuid	Primary key
api_key	text	API-key unik klien
daily_limit	int	Batas request per hari
used_today	int	Jumlah request hari ini
last_reset	timestamptz	Waktu terakhir reset harian


Tabel videos

Field	Tipe	Deskripsi

id	uuid	Primary key
url	text	URL asli klien
data	text/json	URL video hasil fetch
created_at	timestamptz	Waktu disimpan


Tabel clients_usage

Field	Tipe	Deskripsi

id	uuid	Primary key
client_id	uuid	Foreign key ke clients
api_key	text	API-key
used_today	int	Jumlah request yang tercatat
last_reset	timestamptz	Waktu reset
timestamp	timestamptz	Waktu request tercatat



---

6️⃣ Worker Logic Flow

1. CORS & Method Check

Support POST + preflight OPTIONS



2. API-key Validation

Ambil data klien dari Supabase clients

Jika invalid → return 403



3. Rate-limit Check

Jika request melebihi daily_limit → return 429

Reset setiap hari



4. Memory Cache Check

TTL 5 menit

Jika ada → return cepat



5. Supabase DB Check

Kalau ada video di DB → return

Kalau tidak ada → lanjut fetch endpoint asli



6. Fetch Endpoint Asli

POST ke https://online.fliflik.com/get-video-link

Retry 2x jika gagal



7. Simpan Hasil

Memory cache + Supabase videos



8. Logging / Analytics

Tulis ke clients_usage



9. Return Response ke Klien

Single / batch URL





---

7️⃣ Contoh cURL

Single URL:

curl -X POST "https://sora2-remover-watermark.raxnetglobal.workers.dev/get-video-link" \
-H "Content-Type: application/json" \
-H "x-api-key: <API_KEY_KLIEN>" \
-d '{"url":"https://sora.chatgpt.com/p/s_691284466e908191a23cc542f66a5c90"}'

Batch URL:

curl -X POST "https://sora2-remover-watermark.raxnetglobal.workers.dev/get-video-link" \
-H "Content-Type: application/json" \
-H "x-api-key: <API_KEY_KLIEN>" \
-d '{"url":["https://sora.chatgpt.com/p/s_691284466e908191a23cc542f66a5c90","https://sora.chatgpt.com/p/s_abcdef1234567890"]}'


---

8️⃣ Front-end Integration

Fetch API contoh:


const response = await fetch("https://sora2-remover-watermark.raxnetglobal.workers.dev/get-video-link", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "<API_KEY_KLIEN>"
  },
  body: JSON.stringify({ url: "https://sora.chatgpt.com/p/s_691284466e908191a23cc542f66a5c90" })
});
const data = await response.json();
console.log(data);

Mendukung array URL → loop atau batch UI



---

9️⃣ Tips Optimasi & Skala

1. Batch request → kurangi banyak call endpoint asli


2. Memory cache + Supabase DB → cepat + hemat biaya


3. API-key & rate-limit → aman untuk banyak klien


4. Logging analytics → monitor usage & traffic tinggi


5. Cron job → reset used_today tiap jam 00:00




---

Kalau Sobat mau, saya bisa buatkan versi PDF dokumentasi + diagram flowchart visual siap pakai untuk tim developer atau front-end.

Apakah mau saya buatkan versi PDF + visual flowchart itu juga?
