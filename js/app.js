// ==========================================
// INVENTRACK - MAIN APPLICATION
// BPS Kabupaten Boyolali
// ==========================================

// ==========================================
// GLOBAL STATE
// ==========================================
const AppState = {
    laptops: [],
    pegawai: [],
    peminjaman: [],
    pengembalian: [],
    syncing: false,
    loaded: false,
    refreshTimer: null
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    setCurrentDate();
    initForms();
    // Hash navigation on load
    var hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'dashboard') showPage(hash);
    loadData();
});

function setCurrentDate() {
    const el = document.getElementById('currentDate');
    if (el) {
        const now = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        el.textContent = now.toLocaleDateString('id-ID', options);
    }
    // Set default date for forms
    const today = new Date().toISOString().split('T')[0];
    const pinjamTgl = document.getElementById('pinjamTglPinjam');
    const kembaliTgl = document.getElementById('kembaliTglRealisasi');
    if (pinjamTgl) pinjamTgl.value = today;
    if (kembaliTgl) kembaliTgl.value = today;
}

// ==========================================
// NAVIGATION
// ==========================================
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(function (p) {
        p.classList.remove('active');
    });
    // Show target page
    var targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    // Update hash
    window.location.hash = pageName;
    // Scroll to top
    window.scrollTo(0, 0);
    // Load page data
    if (pageName === 'dashboard') {
        renderDashboard();
    } else if (pageName === 'peminjaman') {
        populatePeminjamanForm();
    } else if (pageName === 'pengembalian') {
        populatePengembalianForm();
    }
}

// ==========================================
// FORMS INIT
// ==========================================
function initForms() {
    const formPinjam = document.getElementById('formPeminjaman');
    if (formPinjam) {
        formPinjam.addEventListener('submit', handlePeminjaman);
    }

    const formKembali = document.getElementById('formPengembalian');
    if (formKembali) {
        formKembali.addEventListener('submit', handlePengembalian);
    }

    // Auto-fill divisi on pegawai select
    const pinjamNama = document.getElementById('pinjamNama');
    if (pinjamNama) {
        pinjamNama.addEventListener('change', function () {
            const nip = String(this.value);
            const pegawai = AppState.pegawai.find(function (p) { return String(p.NIP) === nip; });
            const divisiInput = document.getElementById('pinjamDivisi');
            if (pegawai && divisiInput) {
                divisiInput.value = pegawai['TIM (DIVISI)'] || pegawai['TIM DIVISI'] || pegawai['TIM(DIVISI)'] || pegawai.DIVISI || '';
            } else if (divisiInput) {
                divisiInput.value = '';
            }
        });
    }
}

// ==========================================
// DATA LOADING (from Spreadsheet)
// ==========================================
function loadData(silent) {
    const url = CONFIG.APPS_SCRIPT_URL;
    if (!url) {
        console.log('Apps Script URL not configured — using localStorage fallback');
        loadFromLocalStorage();
        updateSyncUI('offline');
        renderDashboard();
        return;
    }

    if (AppState.syncing) return;
    AppState.syncing = true;

    if (!silent) showLoading('Mengambil data dari spreadsheet...');
    updateSyncUI('syncing');

    fetch(url + '?action=getAllData&t=' + Date.now())
        .then(function (res) {
            if (!res.ok) throw new Error('Network error');
            return res.json();
        })
        .then(function (result) {
            if (result.success && result.data) {
                AppState.laptops = result.data.data_laptop || [];
                AppState.pegawai = result.data.data_pegawai || [];
                AppState.peminjaman = result.data.data_peminjaman || [];
                AppState.pengembalian = result.data.data_pengembalian || [];

                // Save to localStorage as backup
                saveToLocalStorage();

                AppState.loaded = true;
                updateSyncUI('connected');
                console.log('Data loaded:', {
                    laptops: AppState.laptops.length,
                    pegawai: AppState.pegawai.length,
                    peminjaman: AppState.peminjaman.length,
                    pengembalian: AppState.pengembalian.length
                });
            } else {
                throw new Error('Invalid response');
            }
        })
        .catch(function (err) {
            console.error('Load failed:', err);
            loadFromLocalStorage();
            updateSyncUI('offline');
            if (!silent) showToast('Gagal memuat dari server, menggunakan data lokal', 'warning');
        })
        .finally(function () {
            AppState.syncing = false;
            hideLoading();
            renderDashboard();
            startAutoRefresh();
        });
}

function refreshData() {
    loadData(false);
}

function startAutoRefresh() {
    if (AppState.refreshTimer) clearInterval(AppState.refreshTimer);
    if (!CONFIG.APPS_SCRIPT_URL) return;

    AppState.refreshTimer = setInterval(function () {
        if (!AppState.syncing) {
            console.log('Auto-refresh...');
            loadData(true);
        }
    }, CONFIG.AUTO_REFRESH_MS);
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('iv_laptops', JSON.stringify(AppState.laptops));
        localStorage.setItem('iv_pegawai', JSON.stringify(AppState.pegawai));
        localStorage.setItem('iv_peminjaman', JSON.stringify(AppState.peminjaman));
        localStorage.setItem('iv_pengembalian', JSON.stringify(AppState.pengembalian));
    } catch (e) { console.error('localStorage save failed', e); }
}

function loadFromLocalStorage() {
    try {
        AppState.laptops = JSON.parse(localStorage.getItem('iv_laptops') || '[]');
        AppState.pegawai = JSON.parse(localStorage.getItem('iv_pegawai') || '[]');
        AppState.peminjaman = JSON.parse(localStorage.getItem('iv_peminjaman') || '[]');
        AppState.pengembalian = JSON.parse(localStorage.getItem('iv_pengembalian') || '[]');
        AppState.loaded = true;
    } catch (e) {
        console.error('localStorage load failed', e);
    }
}

// ==========================================
// SYNC UI
// ==========================================
function updateSyncUI(status) {
    const dot = document.getElementById('syncDot');
    const label = document.getElementById('syncLabel');
    if (!dot || !label) return;

    dot.className = 'sync-dot';

    if (status === 'connected') {
        dot.classList.add('connected');
        label.textContent = 'Terhubung';
    } else if (status === 'syncing') {
        dot.classList.add('syncing');
        label.textContent = 'Sinkronisasi...';
    } else {
        label.textContent = 'Offline';
    }
}

// ==========================================
// DASHBOARD RENDER
// ==========================================
function renderDashboard() {
    renderStats();
    renderRiwayat();
}

function renderStats() {
    const laptops = AppState.laptops;

    const dipinjam = laptops.filter(function (l) {
        return (l.STATUS || '').toLowerCase() === 'dipinjam';
    }).length;
    const rusak = laptops.filter(function (l) {
        var s = (l.STATUS || '').toLowerCase();
        return s.indexOf('rusak') !== -1;
    }).length;
    const tersedia = laptops.filter(function (l) {
        return (l.STATUS || '').toLowerCase() === 'tersedia';
    }).length;

    animateNumber('statTersedia', tersedia);
    animateNumber('statDipinjam', dipinjam);
    animateNumber('statRusak', rusak);
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    if (start === target) { el.textContent = target; return; }
    const duration = 400;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = (target - start) / steps;
    let current = start;
    let step = 0;
    const timer = setInterval(function () {
        step++;
        current += increment;
        el.textContent = Math.round(current);
        if (step >= steps) {
            el.textContent = target;
            clearInterval(timer);
        }
    }, stepTime);
}

// ==========================================
// RIWAYAT TABLE (Dashboard)
// ==========================================
const HISTORY_PAGE_SIZE = 5;
let historyCurrentPage = 1;

function renderRiwayat(filteredData) {
    const body = document.getElementById('riwayatBody');
    const empty = document.getElementById('riwayatEmpty');
    const table = document.getElementById('riwayatTable');

    // Remove old load more button if exists
    const oldBtn = document.getElementById('btnLoadMoreHistory');
    if (oldBtn && oldBtn.parentNode && oldBtn.parentNode.classList.contains('table-footer-actions')) {
        oldBtn.parentNode.remove();
    }

    // Remove old pagination container if exists to re-render fresh
    const oldPag = document.getElementById('historyPagination');
    if (oldPag) oldPag.remove();

    if (!body) return;

    // Combine peminjaman + pengembalian info
    const peminjaman = filteredData || AppState.peminjaman;

    // Reset page if new filter applied (ad-hoc checking if filteredData is passed and page is out of bounds)
    if (filteredData) {
        const maxPage = Math.ceil(filteredData.length / HISTORY_PAGE_SIZE) || 1;
        if (historyCurrentPage > maxPage) historyCurrentPage = 1;
    }

    body.innerHTML = '';

    if (peminjaman.length === 0) {
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (table) table.style.display = '';
    if (empty) empty.style.display = 'none';

    // Pagination logic
    const totalPages = Math.ceil(peminjaman.length / HISTORY_PAGE_SIZE);

    // Ensure current page is valid
    if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
    if (historyCurrentPage < 1) historyCurrentPage = 1;

    const startIndex = (historyCurrentPage - 1) * HISTORY_PAGE_SIZE;
    const endIndex = startIndex + HISTORY_PAGE_SIZE;
    const visibleData = peminjaman.slice(startIndex, endIndex);

    visibleData.forEach(function (p, idx) {
        // Find matching pengembalian
        var kembali = AppState.pengembalian.find(function (k) {
            return k.PEMINJAMAN_ID === p.ID;
        });

        var tglRealisasi = kembali ? (kembali.TGL_REALISASI_PENGEMBALIAN || '-') : '-';

        // Laptop info
        var laptop = AppState.laptops.find(function (l) { return l.ID === p.LAPTOP_ID; });
        var laptopName = laptop ? (laptop.MERK + ' ' + laptop.TYPE) : (p.LAPTOP_ID || '-');

        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + (startIndex + idx + 1) + '</td>' +
            '<td><strong>' + escapeHtml(laptopName) + '</strong></td>' +
            '<td>' + escapeHtml(p.NAMA_PEMINJAM || '-') + '</td>' +
            '<td>' + formatDate(p.TGL_PINJAM) + '</td>' +
            '<td>' + formatDate(p.TGL_KEMBALI_RENCANA) + '</td>' +
            '<td>' + formatDate(tglRealisasi) + '</td>';
        body.appendChild(tr);
    });

    // Render Pagination Controls
    if (totalPages > 1) {
        const pagContainer = document.createElement('div');
        pagContainer.id = 'historyPagination';
        pagContainer.className = 'pagination-controls';
        pagContainer.style.display = 'flex';
        pagContainer.style.justifyContent = 'center';
        pagContainer.style.alignItems = 'center';
        pagContainer.style.gap = '1rem';
        pagContainer.style.marginTop = '1rem';

        // Prev Button
        const btnPrev = document.createElement('button');
        btnPrev.className = 'btn btn-outline btn-sm';
        btnPrev.innerHTML = '<i class="fas fa-chevron-left"></i>';
        btnPrev.disabled = historyCurrentPage === 1;
        btnPrev.onclick = prevHistoryPage;

        // Page Info
        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-info';
        pageInfo.style.fontSize = '0.9rem';
        pageInfo.style.fontWeight = '500';
        pageInfo.textContent = 'Halaman ' + historyCurrentPage + ' dari ' + totalPages;

        // Next Button
        const btnNext = document.createElement('button');
        btnNext.className = 'btn btn-outline btn-sm';
        btnNext.innerHTML = '<i class="fas fa-chevron-right"></i>';
        btnNext.disabled = historyCurrentPage === totalPages;
        btnNext.onclick = nextHistoryPage;

        pagContainer.appendChild(btnPrev);
        pagContainer.appendChild(pageInfo);
        pagContainer.appendChild(btnNext);

        table.parentNode.insertAdjacentElement('afterend', pagContainer);
    }
}

function prevHistoryPage() {
    if (historyCurrentPage > 1) {
        historyCurrentPage--;
        renderRiwayat();
    }
}

function nextHistoryPage() {
    historyCurrentPage++;
    renderRiwayat();
}

// ==========================================
// FILTER SYSTEM (Dropdown-based)
// ==========================================
function onFilterTypeChange() {
    var type = document.getElementById('filterType').value;
    var area = document.getElementById('filterInputArea');
    if (!area) return;

    area.innerHTML = '';

    if (type === 'semua') {
        renderRiwayat();
        return;
    }

    if (type === 'laptop') {
        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'filterValue';
        input.placeholder = 'Ketik nama/merk laptop...';
        input.oninput = applyFilter;
        area.appendChild(input);
    }

    if (type === 'nama') {
        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'filterValue';
        input.placeholder = 'Ketik nama peminjam...';
        input.oninput = applyFilter;
        area.appendChild(input);
    }

    if (type === 'tanggal') {
        // Preset Dropdown
        var presetSelect = document.createElement('select');
        presetSelect.id = 'filterPreset';
        presetSelect.innerHTML =
            '<option value="custom">Pilih Rentang...</option>' +
            '<option value="1w">1 Minggu Terakhir</option>' +
            '<option value="2w">2 Minggu Terakhir</option>' +
            '<option value="1m">1 Bulan Terakhir</option>' +
            '<option value="4m">4 Bulan Terakhir</option>';
        presetSelect.onchange = function () {
            var val = this.value;
            if (val === 'custom') return;

            var end = new Date();
            var start = new Date();
            if (val === '1w') start.setDate(end.getDate() - 7);
            if (val === '2w') start.setDate(end.getDate() - 14);
            if (val === '1m') start.setMonth(end.getMonth() - 1);
            if (val === '4m') start.setMonth(end.getMonth() - 4);

            // Format YYYY-MM-DD (safe for local time if we use split on ISO string after adjusting timezone offset, 
            // but for simplicity here standard ISO split is ok or use simple formatter)
            // Using simple offset fix for timezone
            var toDateInputValue = function (date) {
                var local = new Date(date);
                local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                return local.toJSON().slice(0, 10);
            };

            document.getElementById('filterDari').value = toDateInputValue(start);
            document.getElementById('filterSampai').value = toDateInputValue(end);
            applyFilter();
        };
        area.appendChild(presetSelect);

        var labelDari = document.createElement('label');
        labelDari.textContent = 'Dari:';
        labelDari.style.marginLeft = '10px';
        area.appendChild(labelDari);

        var inputDari = document.createElement('input');
        inputDari.type = 'date';
        inputDari.id = 'filterDari';
        inputDari.onchange = function () {
            document.getElementById('filterPreset').value = 'custom';
            applyFilter();
        };
        area.appendChild(inputDari);

        var labelSampai = document.createElement('label');
        labelSampai.textContent = 'Sampai:';
        area.appendChild(labelSampai);

        var inputSampai = document.createElement('input');
        inputSampai.type = 'date';
        inputSampai.id = 'filterSampai';
        inputSampai.onchange = function () {
            document.getElementById('filterPreset').value = 'custom';
            applyFilter();
        };
        area.appendChild(inputSampai);

        var btnReset = document.createElement('button');
        btnReset.className = 'btn btn-outline btn-sm';
        btnReset.innerHTML = '<i class="fas fa-times"></i> Reset';
        btnReset.onclick = function () {
            document.getElementById('filterType').value = 'semua';
            onFilterTypeChange();
        };
        area.appendChild(btnReset);
    }

    // Show all data initially when switching filter type
    renderRiwayat();
}

function applyFilter() {
    var type = document.getElementById('filterType').value;
    var data = AppState.peminjaman;

    if (type === 'laptop') {
        var keyword = ((document.getElementById('filterValue') || {}).value || '').toLowerCase();
        if (keyword) {
            data = data.filter(function (p) {
                var laptop = AppState.laptops.find(function (l) { return l.ID === p.LAPTOP_ID; });
                var label = laptop ? (laptop.MERK + ' ' + laptop.TYPE).toLowerCase() : (p.LAPTOP_ID || '').toLowerCase();
                return label.indexOf(keyword) !== -1;
            });
        }
    }

    if (type === 'nama') {
        var keyword = ((document.getElementById('filterValue') || {}).value || '').toLowerCase();
        if (keyword) {
            data = data.filter(function (p) {
                return (p.NAMA_PEMINJAM || '').toLowerCase().indexOf(keyword) !== -1;
            });
        }
    }

    if (type === 'tanggal') {
        var dari = (document.getElementById('filterDari') || {}).value || '';
        var sampai = (document.getElementById('filterSampai') || {}).value || '';
        if (dari) {
            data = data.filter(function (p) { return (p.TGL_PINJAM || '') >= dari; });
        }
        if (sampai) {
            data = data.filter(function (p) { return (p.TGL_PINJAM || '') <= sampai; });
        }
    }

    renderRiwayat(data);
}

// ==========================================
// PEMINJAMAN FORM
// ==========================================
function populatePeminjamanForm() {
    // Populate laptop dropdown (only Tersedia)
    const laptopSelect = document.getElementById('pinjamLaptop');
    if (laptopSelect) {
        const currentVal = laptopSelect.value;
        laptopSelect.innerHTML = '<option value="">-- Pilih Laptop --</option>';
        AppState.laptops.forEach(function (l) {
            if ((l.STATUS || '').toLowerCase() === 'tersedia') {
                const opt = document.createElement('option');
                opt.value = l.ID;
                opt.textContent = l.ID + ' - ' + l.MERK + ' ' + l.TYPE + (l.NOP ? ' (NOP: ' + l.NOP + ')' : '');
                laptopSelect.appendChild(opt);
            }
        });
        if (currentVal) laptopSelect.value = currentVal;
    }

    // Populate pegawai dropdown
    const namaSelect = document.getElementById('pinjamNama');
    if (namaSelect) {
        const currentVal = namaSelect.value;
        namaSelect.innerHTML = '<option value="">-- Pilih Pegawai --</option>';
        AppState.pegawai.forEach(function (p) {
            const opt = document.createElement('option');
            opt.value = String(p.NIP);
            opt.textContent = p.NAMA + ' (NIP: ' + p.NIP + ')';
            namaSelect.appendChild(opt);
        });
        if (currentVal) namaSelect.value = currentVal;
    }

    // Set tanggal default
    const today = new Date().toISOString().split('T')[0];
    const tglPinjam = document.getElementById('pinjamTglPinjam');
    if (tglPinjam && !tglPinjam.value) tglPinjam.value = today;
}


let pendingPeminjamanData = null;

function handlePeminjaman(e) {
    e.preventDefault();

    const laptopId = document.getElementById('pinjamLaptop').value;
    const nip = document.getElementById('pinjamNama').value;
    const divisi = document.getElementById('pinjamDivisi').value;
    const keperluan = document.getElementById('pinjamKeperluan').value;
    const deskripsi = document.getElementById('pinjamDeskripsi').value;
    const tglPinjam = document.getElementById('pinjamTglPinjam').value;
    const tglKembali = document.getElementById('pinjamTglKembali').value;

    if (!laptopId || !nip || !keperluan || !tglPinjam || !tglKembali) {
        showToast('Mohon lengkapi semua field yang wajib!', 'error');
        return;
    }

    // Validate dates
    if (new Date(tglKembali) < new Date(tglPinjam)) {
        showToast('Tanggal kembali tidak boleh sebelum tanggal pinjam!', 'error');
        return;
    }

    // Find Names for Confirmation
    const pegawai = AppState.pegawai.find(function (p) { return String(p.NIP) === String(nip); });
    const namaPeminjam = pegawai ? pegawai.NAMA : nip;

    const laptop = AppState.laptops.find(l => l.ID == laptopId);
    const laptopName = laptop ? (laptop.MERK + ' ' + laptop.TYPE) : laptopId;

    // Store data for confirmation
    pendingPeminjamanData = {
        laptopId,
        nip,
        namaPeminjam,
        divisi,
        keperluan,
        deskripsi,
        tglPinjam,
        tglKembali
    };

    // Show Confirmation Modal
    const message = `
        <div style="text-align: left; background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); font-size: 0.9rem;">
            <div style="margin-bottom: 0.5rem;"><strong>Peminjam:</strong> ${escapeHtml(namaPeminjam)}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Laptop:</strong> ${escapeHtml(laptopName)}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Keperluan:</strong> ${escapeHtml(keperluan)}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Tanggal:</strong> ${formatDate(tglPinjam)} s.d ${formatDate(tglKembali)}</div>
        </div>
        <p style="margin-top: 1rem;">Apakah data di atas sudah benar?</p>
    `;

    showConfirmModal('Konfirmasi Peminjaman', message, processPeminjaman);
}

function processPeminjaman() {
    if (!pendingPeminjamanData) return;

    closeConfirmModal();
    showLoading('Menyimpan peminjaman...');

    // Generate ID
    const id = 'PEM-' + Date.now();

    const row = {
        ID: id,
        LAPTOP_ID: pendingPeminjamanData.laptopId,
        NAMA_PEMINJAM: pendingPeminjamanData.namaPeminjam,
        NIP: pendingPeminjamanData.nip,
        DIVISI: pendingPeminjamanData.divisi,
        KEPERLUAN: pendingPeminjamanData.keperluan,
        DESKRIPSI_KEPERLUAN: pendingPeminjamanData.deskripsi,
        TGL_PINJAM: pendingPeminjamanData.tglPinjam,
        TGL_KEMBALI_RENCANA: pendingPeminjamanData.tglKembali,
        STATUS: 'Aktif'
    };

    // 1. Append to Data Peminjaman
    appendToSheet(CONFIG.SHEETS.DATA_PEMINJAMAN, row)
        .then(function () {
            // 2. Update laptop status to Dipinjam
            return updateSheetRow(CONFIG.SHEETS.DATA_LAPTOP, 'ID', pendingPeminjamanData.laptopId, { STATUS: 'Dipinjam' });
        })
        .then(function () {
            // Update local state
            AppState.peminjaman.push(row);

            const laptop = AppState.laptops.find(function (l) { return l.ID === pendingPeminjamanData.laptopId; });
            if (laptop) laptop.STATUS = 'Dipinjam';

            saveToLocalStorage();
            hideLoading();
            showToast('Peminjaman berhasil disimpan!', 'success');

            // Cleanup
            document.getElementById('formPeminjaman').reset();
            const today = new Date().toISOString().split('T')[0];
            const tglEl = document.getElementById('pinjamTglPinjam');
            if (tglEl) tglEl.value = today;

            populatePeminjamanForm();
            showPage('dashboard');
            renderDashboard();
        })
        .catch(function (error) {
            console.error('Peminjaman failed:', error);
            hideLoading();
            showToast('Gagal menyimpan peminjaman: ' + error.message, 'error');
        });
}

// Confirmation Modal Helpers
function showConfirmModal(title, htmlContent, onConfirm) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return;

    const titleEl = modal.querySelector('.modal-title');
    const textEl = document.getElementById('confirmModalText');
    const btn = document.getElementById('confirmModalBtn');

    titleEl.textContent = title;
    textEl.innerHTML = htmlContent;

    // Clone button to remove old listeners
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.onclick = onConfirm;

    modal.classList.add('show');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('show');
}


// ==========================================
// PENGEMBALIAN FORM
// ==========================================
function populatePengembalianForm() {
    // Populate pegawai dropdown
    const select = document.getElementById('kembaliPegawai');
    if (select) {
        select.innerHTML = '<option value="">-- Pilih Pegawai --</option>';

        // Only show pegawai who have active loans
        const activeBorrowers = new Set();
        AppState.peminjaman.forEach(function (p) {
            if ((p.STATUS || '').toLowerCase() === 'aktif') {
                activeBorrowers.add(p.NAMA_PEMINJAM);
            }
        });

        AppState.pegawai.forEach(function (p) {
            if (activeBorrowers.has(p.NAMA)) {
                const opt = document.createElement('option');
                opt.value = p.NAMA;
                opt.textContent = p.NAMA + ' - ' + (p['TIM(DIVISI)'] || '');
                select.appendChild(opt);
            }
        });

        // Also add names from peminjaman that might not be in pegawai
        activeBorrowers.forEach(function (name) {
            const exists = AppState.pegawai.some(function (p) { return p.NAMA === name; });
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            }
        });
    }

    // Hide step 2 and 3
    hideElement('kembaliListCard');
    hideElement('kembaliFormCard');

    // Reset date
    const today = new Date().toISOString().split('T')[0];
    const tgl = document.getElementById('kembaliTglRealisasi');
    if (tgl) tgl.value = today;
}

function onSelectPegawaiKembali() {
    const nama = document.getElementById('kembaliPegawai').value;
    const listCard = document.getElementById('kembaliListCard');
    const tbody = document.getElementById('kembaliListBody');
    const empty = document.getElementById('kembaliEmpty');

    hideElement('kembaliFormCard');

    if (!nama) {
        hideElement('kembaliListCard');
        return;
    }

    showElement('kembaliListCard');

    // Filter active peminjaman for this person
    const activeLoans = AppState.peminjaman.filter(function (p) {
        return (p.STATUS || '').toLowerCase() === 'aktif' && p.NAMA_PEMINJAM === nama;
    });

    tbody.innerHTML = '';

    if (activeLoans.length === 0) {
        const table = listCard.querySelector('table');
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    const table = listCard.querySelector('table');
    if (table) table.style.display = '';
    if (empty) empty.style.display = 'none';

    activeLoans.forEach(function (loan) {
        const laptop = AppState.laptops.find(function (l) { return l.ID === loan.LAPTOP_ID; });
        const merkType = laptop ? (laptop.MERK + ' ' + laptop.TYPE) : '-';

        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td><strong>' + escapeHtml(loan.LAPTOP_ID || '-') + '</strong></td>' +
            '<td>' + escapeHtml(merkType) + '</td>' +
            '<td>' + formatDate(loan.TGL_PINJAM) + '</td>' +
            '<td>' + formatDate(loan.TGL_KEMBALI_RENCANA) + '</td>' +
            '<td>' + escapeHtml(loan.KEPERLUAN || '-') + '</td>' +
            '<td><button class="btn btn-sm btn-success" onclick="selectLoanForReturn(\'' + loan.ID + '\')"><i class="fas fa-check"></i> Pilih</button></td>';
        tbody.appendChild(tr);
    });
}

function selectLoanForReturn(peminjamanId) {
    const loan = AppState.peminjaman.find(function (p) { return p.ID === peminjamanId; });
    if (!loan) return;

    const laptop = AppState.laptops.find(function (l) { return l.ID === loan.LAPTOP_ID; });

    // Fill detail grid
    const grid = document.getElementById('returnDetailGrid');
    if (grid) {
        grid.innerHTML =
            detailItem('Kode Laptop', loan.LAPTOP_ID || '-') +
            detailItem('Merk/Type', laptop ? (laptop.MERK + ' ' + laptop.TYPE) : '-') +
            detailItem('Nama Peminjam', loan.NAMA_PEMINJAM || '-') +
            detailItem('Divisi', loan.DIVISI || '-') +
            detailItem('Keperluan', loan.KEPERLUAN || '-') +
            detailItem('Tgl Pinjam', formatDate(loan.TGL_PINJAM)) +
            detailItem('Perkiraan Kembali', formatDate(loan.TGL_KEMBALI_RENCANA));
    }

    // Set hidden ID
    const hiddenId = document.getElementById('kembaliPeminjamanId');
    if (hiddenId) hiddenId.value = peminjamanId;

    // Set today as realisasi date
    const today = new Date().toISOString().split('T')[0];
    const tgl = document.getElementById('kembaliTglRealisasi');
    if (tgl) tgl.value = today;

    showElement('kembaliFormCard');

    // Scroll to form
    document.getElementById('kembaliFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function detailItem(label, value) {
    return '<div class="return-detail-item">' +
        '<span class="rd-label">' + label + '</span>' +
        '<span class="rd-value">' + escapeHtml(value) + '</span>' +
        '</div>';
}

function cancelReturn() {
    hideElement('kembaliFormCard');
}

// ==========================================
// PENGEMBALIAN FORM HANDLERS
// ==========================================
// Photo handling functions removed as requested


let pendingPengembalianData = null;

function handlePengembalian(e) {
    e.preventDefault();

    // Validate inputs
    const tglRealisasi = document.getElementById('kembaliTglRealisasi').value;
    const kondisi = document.getElementById('kembaliKondisi').value;
    const catatan = document.getElementById('kembaliCatatan').value;
    const peminjamanId = document.getElementById('kembaliPeminjamanId').value;

    if (!peminjamanId || !tglRealisasi || !kondisi) {
        showToast('Mohon lengkapi semua field!', 'error');
        return;
    }

    const peminjaman = AppState.peminjaman.find(function (p) { return String(p.ID) === String(peminjamanId); });

    if (!peminjaman) {
        showToast('Data peminjaman tidak ditemukan!', 'error');
        return;
    }

    const laptop = AppState.laptops.find(l => l.ID === peminjaman.LAPTOP_ID);
    const laptopName = laptop ? (laptop.MERK + ' ' + laptop.TYPE) : peminjaman.LAPTOP_ID;

    // Store for processing
    pendingPengembalianData = {
        peminjamanId,
        tglRealisasi,
        kondisi,
        catatan,
        peminjaman, // Ref to object
        laptopName
    };

    // Show Modal
    const message = `
        <div style="text-align: left; background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); font-size: 0.9rem;">
            <div style="margin-bottom: 0.5rem;"><strong>Peminjam:</strong> ${escapeHtml(peminjaman.NAMA_PEMINJAM)}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Laptop:</strong> ${escapeHtml(laptopName)}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Tgl Realisasi:</strong> ${formatDate(tglRealisasi)}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Kondisi:</strong> ${escapeHtml(kondisi)}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Catatan:</strong> ${escapeHtml(catatan || '-')}</div>
        </div>
        <p style="margin-top: 1rem;">Pastikan laptop sudah dicek. Proses pengembalian?</p>
    `;

    showConfirmModal('Konfirmasi Pengembalian', message, processPengembalian);
}

function processPengembalian() {
    if (!pendingPengembalianData) return;
    closeConfirmModal();

    showLoading('Memproses pengembalian...');

    const { peminjamanId, tglRealisasi, kondisi, catatan, peminjaman } = pendingPengembalianData;

    // Create Data Pengembalian Row
    const returnRow = {
        ID: 'KEM-' + Date.now(),
        PEMINJAMAN_ID: peminjamanId,
        LAPTOP_ID: peminjaman.LAPTOP_ID,
        NAMA_PEMINJAM: peminjaman.NAMA_PEMINJAM,
        TGL_PINJAM: peminjaman.TGL_PINJAM,
        TGL_KEMBALI_RENCANA: peminjaman.TGL_KEMBALI_RENCANA,
        TGL_REALISASI_PENGEMBALIAN: tglRealisasi,

        // DUAL KEYS: Kirim kedua versi nama kolom agar cocok dengan spreadsheet lama & baru
        KONDISI: kondisi,
        KONDISI_PENGEMBALIAN: kondisi,

        CATATAN: catatan,
        CATATAN_PENGEMBALIAN: catatan,

        STATUS: 'Selesai'
    };

    // Determine new laptop status
    let newLaptopStatus = 'Tersedia';
    if (kondisi === 'Rusak Ringan') newLaptopStatus = 'Rusak Ringan';
    if (kondisi === 'Rusak Berat') newLaptopStatus = 'Rusak Berat';

    // 4. Send atomic request to Apps Script
    // NOTE: Using native fetch to call GAS Web App directly with JSON payload
    fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'processReturn',
            data: { // Wrap in data object to match common pattern if needed
                returnRow: returnRow,
                peminjamanId: peminjamanId,
                tglRealisasi: tglRealisasi,
                kondisi: kondisi,
                laptopId: peminjaman.LAPTOP_ID,
                newLaptopStatus: newLaptopStatus
            }
        })
    })
        .then(function () {
            // Success Local Update (Optimistic UI)
            AppState.pengembalian.push(returnRow);
            peminjaman.STATUS = 'Selesai';
            peminjaman.TGL_REALISASI_PENGEMBALIAN = tglRealisasi;

            const laptop = AppState.laptops.find(function (l) { return l.ID === peminjaman.LAPTOP_ID; });
            if (laptop) laptop.STATUS = newLaptopStatus;

            saveToLocalStorage();

            hideLoading();
            showToast('Pengembalian berhasil diproses!', 'success');

            // Reset form sequence
            document.getElementById('formPengembalian').reset();
            document.getElementById('kembaliListCard').style.display = 'none';
            document.getElementById('kembaliFormCard').style.display = 'none';

            populatePengembalianForm();
            renderDashboard();
            showPage('dashboard');
        })
        .catch(function (err) {
            hideLoading();
            console.error(err);
            showToast('Gagal memproses pengembalian: ' + err.message, 'error');

            // Fallback: save locally
            AppState.pengembalian.push(returnRow);
            peminjaman.STATUS = 'Selesai';
            const laptop = AppState.laptops.find(function (l) { return l.ID === peminjaman.LAPTOP_ID; });
            if (laptop) laptop.STATUS = newLaptopStatus;
            saveToLocalStorage();
        });
}

// ==========================================
// SPREADSHEET API HELPERS
// ==========================================
function appendToSheet(sheetName, rowObj) {
    var url = CONFIG.APPS_SCRIPT_URL;
    if (!url) return Promise.reject('No URL');

    // Use POST with text/plain to avoid CORS preflight, handled by e.postData.contents in GAS
    var payload = JSON.stringify({
        action: 'appendRow',
        sheet: sheetName,
        row: rowObj
    });

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: payload
    }).then(function (res) { return res.json(); })
        .then(function (data) {
            if (!data.success) throw new Error(data.error || 'Append failed');
            return data;
        });
}

function updateSheetRow(sheetName, matchCol, matchVal, updates) {
    var url = CONFIG.APPS_SCRIPT_URL;
    if (!url) return Promise.reject('No URL');

    var payload = JSON.stringify({
        action: 'updateRow',
        sheet: sheetName,
        matchCol: matchCol,
        matchVal: matchVal,
        row: updates
    });

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: payload
    }).then(function (res) { return res.json(); })
        .then(function (data) {
            if (!data.success) throw new Error(data.error || 'Update failed');
            return data;
        });
}

// ==========================================
// UI HELPERS
// ==========================================
function showToast(message, type) {
    type = type || 'success';
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMsg');
    if (!toast) return;

    // Remove old classes
    toast.className = 'toast';

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-circle'
    };

    if (icon) icon.className = icons[type] || icons.success;
    if (msg) msg.textContent = message;

    toast.classList.add('toast-' + type, 'show');

    setTimeout(function () {
        toast.classList.remove('show');
    }, 3500);
}

function showLoading(text) {
    const overlay = document.getElementById('loadingOverlay');
    const txt = document.getElementById('loadingText');
    if (txt) txt.textContent = text || 'Memuat...';
    if (overlay) overlay.classList.add('show');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('show');
}

function showElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
}

function hideElement(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    try {
        const str = String(dateStr);
        // Handle yyyy-MM-dd format
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            const parts = str.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
        }
        // Try Date parse
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
