# ELKA Verify Gate

## Jalankan lokal
Butuh Node.js 18 atau lebih baru.
```bash
npm start
```
Buka `http://localhost:3000`.

## Deploy
Deploy sebagai **Node.js web service** (bukan static site saja). Build command bisa dikosongkan atau `npm install`; start command `npm start`. Pastikan platform menyediakan persistent disk/volume untuk folder `data/`, karena database versi ini disimpan di `data/links.json`.

Penting:
- Generator dan halaman verifikasi berada dalam satu aplikasi/domain.
- Link publik memerlukan backend yang tetap aktif.
- Data JSON cocok untuk pengujian atau trafik kecil; untuk hosting ephemeral/multi-instance gunakan database managed (misalnya PostgreSQL).
- Tombol tugas membuka URL lalu meminta konfirmasi manual dari pengunjung. Ini bukan bukti otomatis follow/subscribe. Verifikasi platform yang sebenarnya perlu API resmi/otorisasi yang sesuai.
- Jangan gunakan ini untuk menjanjikan bahwa tindakan sosial sudah diverifikasi otomatis.
