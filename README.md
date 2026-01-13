
# Sora Remover Watermark Worker

Worker ini berfungsi sebagai **backend proxy** untuk mengubah URL video menjadi link video bersih (tanpa watermark) dan mendukung banyak klien.

---

## 1️⃣ URL Endpoint

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/get-video-link` | POST | Mengambil video dari URL yang dikirim oleh klien, mendukung single atau batch URL |

**CORS:** `*` → dapat digunakan oleh front-end mana pun.

---

## 2️⃣ Headers

| Header | Wajib? | Deskripsi |
|--------|--------|-----------|
| `Content-Type` | ✅ | Harus `application/json` |
| `x-api-key` | ✅ | API-key unik klien untuk autentikasi dan rate-limit |

---

## 3️⃣ Request Body

**Single URL:**

```json
{
  "url": "https://sora.chatgpt.com/p/s_691284466e908191a23cc542f66a5c90"
}

Batch URL (Multiple URL):

{
  "url": [
    "https://sora.chatgpt.com/p/s_691284466e908191a23cc542f66a5c90",
    "https://sora.chatgpt.com/p/s_abcdef1234567890"
  ]
}


---

4️⃣ Response Body

Sukses:

{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "url": "https://sora.chatgpt.com/p/s_691284466e908191a23cc542f66a5c90",
      "data": "https://videos.openai.com/az/files/.../raw?sp=r...",
      "source": "fetched"
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

5️⃣ Supabase Database (Opsional)

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
data	text	Link video hasil fetch
created_at	timestamptz	Waktu disimpan


Tabel clients_usage

Field	Tipe	Deskripsi

id	uuid	Primary key
client_id	uuid	Foreign key ke clients
api_key	text	API-key
used_today	int	Jumlah request
last_reset	timestamptz	Waktu reset
timestamp	timestamptz	Waktu request tercatat



---

6️⃣ Logic Flow

1. CORS & Method Check → hanya menerima POST


2. API-key Validation → pastikan klien valid


3. Rate-limit Check → pastikan klien tidak melebihi limit


4. Memory Cache Check → jika URL sudah di-cache, langsung return


5. Database Check → jika URL tersimpan di DB, gunakan hasil cached


6. Fetch Video Link → ambil video link untuk URL baru


7. Simpan ke Cache / DB → untuk request berikutnya lebih cepat


8. Logging / Analytics → catat setiap request ke DB


9. Return Response → single / batch URL




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

8️⃣ Tips Optimasi

Gunakan batch request → hemat request

Gunakan memory cache + Supabase DB → cepat & hemat biaya

Gunakan rate-limit per klien → aman untuk banyak pengguna

Gunakan logging analytics → pantau usage & traffic

Gunakan cron job → reset used_today tiap hari jam 00:00



---

9️⃣ Front-end Integration

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

Mendukung array URL → loop atau batch di front-end



---

README ini 100% tidak menyebut endpoint asli, semua request mengacu ke Worker endpoint.


---

Kalau mau, Sobat, saya bisa buatkan versi README.md + diagram flowchart visual supaya lebih jelas alur Worker → cache → DB → front-end.

Apakah mau saya buatkan versi flowchart itu juga?
