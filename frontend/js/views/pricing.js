function pricingSetStatus(msg, type = 'info') {
    const el = document.getElementById('pricing-status');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.remove('text-muted');
    el.classList.add('text-muted');
    if (type === 'error') {
        el.classList.remove('text-muted');
        el.style.color = 'var(--danger)';
    } else {
        el.style.color = '';
    }
}

function pricingGetParams() {
    const dateEl = document.getElementById('pricing-date');
    const regionEl = document.getElementById('pricing-region');
    const date = String(dateEl?.value || '').trim();
    const region = String(regionEl?.value || '').trim();
    return { date, region };
}

async function pricingApi(path, method = 'GET', body = null) {
    const headers = {};
    if (SESSION && SESSION.token) headers['Authorization'] = 'Bearer ' + SESSION.token;
    if (SESSION && SESSION.tenant_id) headers['x-tenant-id'] = SESSION.tenant_id;
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
        const raw = await res.text();
        let msg = raw;
        try {
            const j = JSON.parse(raw);
            if (j && typeof j === 'object') msg = (j.message || j.error || raw);
            if (j && typeof j === 'object' && j.source_url) {
                const sample = String(j.sample || '').slice(0, 120);
                msg = `${String(msg || '').trim()} | ${j.source_url}${sample ? ' | ' + sample : ''}`.trim();
            }
        } catch (e) {}
        throw new Error(String(msg || `HTTP ${res.status}`));
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    return await res.text();
}

function formatRpPlain(n) {
    const num = Number(n || 0);
    if (!Number.isFinite(num) || num <= 0) return '-';
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function renderPricingRows(rows) {
    const tbody = document.getElementById('pricing-market-rows');
    if (!tbody) return;
    const filter = String(document.getElementById('pricing-filter')?.value || '').trim().toLowerCase();
    tbody.innerHTML = '';

    const list = Array.isArray(rows) ? rows : [];
    const filtered = filter ? list.filter(r => String(r?.commodity_name || '').toLowerCase().includes(filter)) : list;

    if (!filtered.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" class="text-sm text-muted">Tidak ada data.</td>`;
        tbody.appendChild(tr);
        return;
    }

    filtered.forEach(r => {
        const tr = document.createElement('tr');
        const priceDate = String(r.price_date || r.date || '').trim();
        tr.innerHTML = `
            <td>${String(r.commodity_name || '-')}</td>
            <td>${String(r.unit || '-')}</td>
            <td>${formatRpPlain(r.price)}</td>
            <td>${String(r.source || '-')}</td>
            <td>${priceDate || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function pricingShow() {
    try {
        const { date, region } = pricingGetParams();
        if (!date) {
            pricingSetStatus('Tanggal wajib diisi.', 'error');
            return;
        }
        if (!region) {
            pricingSetStatus('Wilayah wajib dipilih.', 'error');
            return;
        }
        pricingSetStatus('Memuat data harga...', 'info');
        const qs = `?date=${encodeURIComponent(date)}&region=${encodeURIComponent(region)}`;
        const rows = await pricingApi(`/api/pricing/market-prices${qs}`);
        window._pricingRows = Array.isArray(rows) ? rows : [];
        renderPricingRows(rows);
        const count = Array.isArray(rows) ? rows.length : 0;
        if (count === 0) {
            pricingSetStatus(`Belum ada data untuk ${region} (${date}). Klik Sync untuk mengambil harga.`, 'info');
        } else {
            const dates = (rows || []).map(r => String(r.price_date || '').trim()).filter(Boolean);
            let extra = '';
            if (dates.length) {
                dates.sort();
                const minD = dates[0];
                const maxD = dates[dates.length - 1];
                extra = minD === maxD ? ` Harga terakhir: ${maxD}.` : ` Harga terakhir bervariasi: ${minD} s/d ${maxD}.`;
            }
            pricingSetStatus(`Menampilkan ${count} komoditas untuk ${region} (${date}).${extra}`, 'info');
        }
    } catch (e) {
        pricingSetStatus(e?.message || 'Gagal memuat data.', 'error');
        notifyUi('error', 'Pricing', e?.message || 'Gagal memuat');
    }
}

async function pricingSync() {
    try {
        const { date, region } = pricingGetParams();
        if (!date) {
            pricingSetStatus('Tanggal wajib diisi.', 'error');
            return;
        }
        if (!region) {
            pricingSetStatus('Wilayah wajib dipilih.', 'error');
            return;
        }
        pricingSetStatus('Sync harga dari Siskaperbapo...', 'info');
        const res = await pricingApi('/api/pricing/sync-siskaperbapo', 'POST', { date, region });
        notifyUi('success', 'Pricing', `Sync selesai: ${res?.count || 0} item`);
        await pricingShow();
    } catch (e) {
        pricingSetStatus(e?.message || 'Gagal sync harga.', 'error');
        notifyUi('error', 'Pricing', e?.message || 'Gagal sync');
    }
}

async function importSiskaperbapoToDb() {
    try {
        const { date, region } = pricingGetParams();
        if (!date || !region) return notifyUi('warning', 'Import', 'Pilih tanggal & wilayah dulu');

        // Check data first
        if (!window._pricingRows || !window._pricingRows.length) {
             await pricingShow();
             if (!window._pricingRows || !window._pricingRows.length) {
                 return notifyUi('warning', 'Import', 'Tidak ada data Siskaperbapo untuk diimpor. Sync dulu.');
             }
        }

        const ok = await confirmUi({
            title: 'Import Harga ke Database',
            message: `Anda akan mengimpor ${window._pricingRows.length} item harga dari ${region} (${date}) ke dalam database Ingredients & Inventory.\n\nHarga item yang bernama SAMA akan DI-UPDATE. Item baru akan DITAMBAHKAN.\n\nLanjutkan?`,
            confirmLabel: 'Import & Overwrite',
            cancelLabel: 'Batal',
            danger: true
        });
        if (!ok) return;

        pricingSetStatus('Mengimpor ke database...', 'info');
        
        const res = await api('/api/pricing/import-to-db', 'POST', {
            items: window._pricingRows,
            region,
            date
        });

        notifyUi('success', 'Import', `Sukses! Updated: ${res.updated}, Inserted: ${res.inserted}`);
        pricingSetStatus(`Import selesai. Updated: ${res.updated}, Inserted: ${res.inserted}`, 'info');
        
        // Refresh other views if needed
        if (typeof loadIngredients === 'function') loadIngredients();
        if (typeof loadInventory === 'function') loadInventory();

    } catch (e) {
        pricingSetStatus(e.message || 'Gagal import', 'error');
        notifyUi('danger', 'Import', e.message || 'Gagal import');
    }
}

function loadPricing() {
    const dateEl = document.getElementById('pricing-date');
    const regionEl = document.getElementById('pricing-region');
    const filterEl = document.getElementById('pricing-filter');

    if (dateEl && !dateEl.value) {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dateEl.value = `${yyyy}-${mm}-${dd}`;
    }
    if (regionEl) {
        const areas = [
            'Kabupaten Bangkalan',
            'Kabupaten Banyuwangi',
            'Kabupaten Blitar',
            'Kabupaten Bojonegoro',
            'Kabupaten Bondowoso',
            'Kabupaten Gresik',
            'Kabupaten Jember',
            'Kabupaten Jombang',
            'Kabupaten Kediri',
            'Kabupaten Lamongan',
            'Kabupaten Lumajang',
            'Kabupaten Madiun',
            'Kabupaten Magetan',
            'Kabupaten Malang',
            'Kabupaten Mojokerto',
            'Kabupaten Nganjuk',
            'Kabupaten Ngawi',
            'Kabupaten Pacitan',
            'Kabupaten Pamekasan',
            'Kabupaten Pasuruan',
            'Kabupaten Ponorogo',
            'Kabupaten Probolinggo',
            'Kabupaten Sampang',
            'Kabupaten Sidoarjo',
            'Kabupaten Situbondo',
            'Kabupaten Sumenep',
            'Kabupaten Trenggalek',
            'Kabupaten Tuban',
            'Kabupaten Tulungagung',
            'Kota Batu',
            'Kota Blitar',
            'Kota Kediri',
            'Kota Madiun',
            'Kota Malang',
            'Kota Mojokerto',
            'Kota Pasuruan',
            'Kota Probolinggo',
            'Kota Surabaya'
        ];
        if (!regionEl.options || regionEl.options.length === 0) {
            regionEl.innerHTML = areas.map(a => `<option value="${a}">${a}</option>`).join('');
        }
        if (!regionEl.value) regionEl.value = 'Kota Surabaya';
    }
    if (filterEl) filterEl.oninput = () => renderPricingRows(window._pricingRows || []);

    const tbody = document.getElementById('pricing-market-rows');
    if (tbody && !tbody.children.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" class="text-sm text-muted">Klik Sync untuk mengambil harga.</td>`;
        tbody.appendChild(tr);
    }
}
