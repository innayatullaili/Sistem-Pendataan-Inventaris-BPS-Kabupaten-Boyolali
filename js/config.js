// ==========================================
// KONFIGURASI INVENTRACK
// BPS Kabupaten Boyolali
// ==========================================

const CONFIG = {
    // URL Google Apps Script Web App
    // Ganti dengan URL hasil deploy Apps Script Anda:
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby90hG85K13mpEV1aoBMP_D7KGvqE7HtXtLtSUPFLnV6JtvttUR5TfS9UOdzPnoIOc3Jg/exec',

    // Nama sheet di Spreadsheet
    SHEETS: {
        DATA_LAPTOP: 'Data Laptop',
        DATA_PEGAWAI: 'DATA PEGAWAI',
        DATA_PEMINJAMAN: 'Data Peminjaman',
        DATA_PENGEMBALIAN: 'Data Pengembalian'
    },

    // Auto-refresh interval (ms) — 30 detik
    AUTO_REFRESH_MS: 30000
};
