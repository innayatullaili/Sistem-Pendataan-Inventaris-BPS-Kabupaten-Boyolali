# Pembagian Tugas Tim Pengembang Sistem Pendataan Inventaris

Berikut adalah usulan pembagian kerja efektif untuk 2 orang agar pengembangan berjalan paralel tanpa saling menimpa kode.

## 👤 Peran 1: Frontend & UI Designer (Fokus Tampilan)
**Tanggung Jawab:** Memastikan aplikasi terlihat profesional, rapi, dan responsif di semua perangkat (Laptop & HP).

**File Utama:**
- `index.html`
- `css/style.css`

**Daftar Tugas (To-Do List):**
1.  **Testing Responsif Mobile:**
    - Cek semua halaman di browser HP. Pastikan tabel tidak melebar aneh dan tombol mudah ditekan.
    - *Area Fokus:* `css/style.css` (bagian `@media`).
2.  **Visual Polish (Mempercantik):**
    - Berikan warna berbeda untuk status (misal: Badge "Tersedia" warna hijau, "Dipinjam" warna kuning).
    - Perbaiki ikon-ikon agar lebih pas secara visual.
3.  **Animasi & Feedback Pengguna:**
    - Buat animasi loading yang lebih menarik.
    - Pastikan pesan "Toast" (notifikasi hijau di pojok) tampil dengan cantik.

---

## 👤 Peran 2: Backend & Logic Engineer (Fokus Fungsi)
**Tanggung Jawab:** Memastikan data tersimpan dengan benar, aplikasi tidak error, dan loading cepat.

**File Utama:**
- `js/app.js`
- `google-apps-script.js` (di Google Script Editor)
- `js/config.js`

**Daftar Tugas (To-Do List):**
1.  **Optimasi Logika Data:**
    - Pastikan fitur *Pagination* (Lihat Lainnya) berjalan lancar tanpa bug.
    - Cek validasi form (misal: Tgl Kembali tidak boleh sebelum Tgl Pinjam).
2.  **Keamanan & Error Handling:**
    - Apa yang terjadi jika internet mati saat klik simpan? Tambahkan penanganan error di `app.js`.
3.  **Google Apps Script (GAS):**
    - Jika butuh kolom baru di Spreadsheet, Anda yang mengurus backendnya.
    - Pastikan script "ProcessReturn" berjalan atomik (tidak ada data setengah jalan).

## 💡 Cara Kolaborasi (Workflow)
1.  **Hindari Edit File yang Sama:**
    - Jika Peran 1 sedang merombak `style.css`, Peran 2 fokus ke `app.js`.
    - Jika harus menyentuh `index.html` (misal Peran 2 nambah tombol baru), komunikasikan dulu ("Saya mau tambah ID baru di HTML").
2.  **Review Bersama:**
    - Setiap selesai satu fitur besar, lakukan tes bersama. Satu orang mencoba input data, satu orang melihat hasilnya di Spreadsheet.

## 🎯 Target Minggu Ini
- **Designer:** Tampilan Dashboard & Form di HP sudah 100% rapi.
- **Engineer:** Proses Peminjaman & Pengembalian berjalan tanpa error sedikitpun.
