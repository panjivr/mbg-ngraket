// ─── Supplier Portal JS ─────────────────────────────────────────────────────

/** Normalisasi URL server: hindari .../api/api/supplier-portal (404). */
function spNormalizeOrigin(b) {
    b = String(b || '').trim().replace(/\/+$/, '');
    if (!b) return '';
    // User sering isi "http://host:8080/api" di Settings — jangan tambah /api lagi
    if (/\/api$/i.test(b)) b = b.replace(/\/api$/i, '');
    return b.replace(/\/+$/, '');
}

/** Base URL untuk API supplier-portal. */
function spResolveApiBase() {
    return '/api/supplier-portal';
}

const SP_API_BASE = spResolveApiBase();
let SP_TOKEN = localStorage.getItem('sp_token') || '';
let SP_SUPPLIER = null;

function spApi(path, method, body) {
    const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (SP_TOKEN) opts.headers['Authorization'] = 'Bearer ' + SP_TOKEN;
    if (body) opts.body = JSON.stringify(body);
    return fetch(SP_API_BASE + path, opts).then(async res => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const d = data || {};
            throw new Error(d.hint || d.message || d.error || `HTTP ${res.status}`);
        }
        return data;
    });
}

function spFmtRp(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

// ─── Auth ───────────────────────────────────────────────────────────────────

function spShowLogin() {
    document.getElementById('sp-login-form').classList.remove('hidden');
    document.getElementById('sp-signup-form').classList.add('hidden');
}

function spShowSignup() {
    document.getElementById('sp-login-form').classList.add('hidden');
    document.getElementById('sp-signup-form').classList.remove('hidden');
}

async function spLogin() {
    const errEl = document.getElementById('sp-login-error');
    errEl.textContent = '';
    const email = document.getElementById('sp_email').value.trim();
    const password = document.getElementById('sp_password').value;
    if (!email || !password) { errEl.textContent = 'Email dan password wajib diisi.'; return; }

    try {
        const res = await spApi('/auth/login', 'POST', { email, password });
        SP_TOKEN = res.token;
        SP_SUPPLIER = res.supplier;
        localStorage.setItem('sp_token', SP_TOKEN);
        spEnterPortal();
    } catch (e) {
        errEl.textContent = e.message;
    }
}

async function spSignup() {
    const errEl = document.getElementById('sp-signup-error');
    errEl.textContent = '';
    const email = document.getElementById('sp_s_email').value.trim();
    const password = document.getElementById('sp_s_password').value;
    const name = document.getElementById('sp_s_name').value.trim();
    const company_name = document.getElementById('sp_s_company').value.trim() || null;
    const contact_phone = document.getElementById('sp_s_phone').value.trim() || null;
    const address = document.getElementById('sp_s_address').value.trim() || null;

    if (!email || !password || !name) { errEl.textContent = 'Email, password, dan nama wajib diisi.'; return; }
    if (password.length < 6) { errEl.textContent = 'Password minimal 6 karakter.'; return; }

    try {
        const res = await spApi('/auth/signup', 'POST', { email, password, name, company_name, contact_phone, address });
        errEl.style.color = 'var(--success)';
        errEl.textContent = res.message || 'Pendaftaran berhasil! Menunggu approval admin.';
    } catch (e) {
        errEl.style.color = 'var(--danger)';
        errEl.textContent = e.message;
    }
}

function spLogout() {
    SP_TOKEN = '';
    SP_SUPPLIER = null;
    localStorage.removeItem('sp_token');
    document.getElementById('sp-auth').classList.remove('hidden');
    document.getElementById('sp-main').classList.add('hidden');
}

async function spEnterPortal() {
    document.getElementById('sp-auth').classList.add('hidden');
    document.getElementById('sp-main').classList.remove('hidden');

    try {
        if (!SP_SUPPLIER) {
            SP_SUPPLIER = await spApi('/me');
        }
        document.getElementById('sp-user-label').textContent = `${SP_SUPPLIER.name} — ${SP_SUPPLIER.email}`;
        document.getElementById('sp-tier-badge').textContent = (SP_SUPPLIER.subscription_tier || 'free').toUpperCase();
    } catch (e) {
        spLogout();
        return;
    }

    await spLoadSubscription();
    spSwitchTab('orders');
}

// ─── Subscription ───────────────────────────────────────────────────────────

async function spLoadSubscription() {
    const card = document.getElementById('sp-sub-card');
    try {
        const sub = await spApi('/me/subscription');
        const tierMap = { free: 'Maks 2 order/bulan', pro: 'Maks 4 order/minggu', ultra: 'Unlimited order/bulan' };
        const canBid = sub.can_bid;

        card.innerHTML = `
            <div class="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <div class="text-sm text-muted">Paket Langganan</div>
                    <div class="font-bold text-lg">${(sub.tier || 'free').toUpperCase()}</div>
                    <div class="text-xs text-muted mt-1">${tierMap[sub.tier] || sub.tier}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-muted">Order Diambil Periode Ini</div>
                    <div class="font-bold text-lg">${sub.orders_taken_this_period}${sub.limit_per_period != null ? ' / ' + sub.limit_per_period : ''}</div>
                    <div class="text-xs mt-1 ${canBid ? 'text-success' : 'text-danger'}">
                        <i class="fas ${canBid ? 'fa-check-circle' : 'fa-times-circle'} mr-1"></i>
                        ${canBid ? 'Bisa mengajukan bid' : 'Kuota habis — upgrade paket'}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        card.innerHTML = `<div class="text-danger text-sm">Gagal memuat info langganan: ${e.message}</div>`;
    }
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function spSwitchTab(tab) {
    document.querySelectorAll('.sp-tab-btn').forEach(btn => {
        btn.classList.toggle('btn-primary', btn.dataset.tab === tab);
        btn.classList.toggle('btn-secondary', btn.dataset.tab !== tab);
    });

    document.getElementById('sp-tab-orders').classList.toggle('hidden', tab !== 'orders');
    document.getElementById('sp-tab-mybids').classList.toggle('hidden', tab !== 'mybids');

    if (tab === 'orders') spLoadOrders();
    if (tab === 'mybids') spLoadMyBids();
}

// ─── Available Orders ───────────────────────────────────────────────────────

async function spLoadOrders() {
    const container = document.getElementById('sp-tab-orders');
    container.innerHTML = `<div class="card p-6 text-center text-muted"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat order tersedia...</div>`;

    try {
        const orders = await spApi('/orders');
        if (!orders || !orders.length) {
            container.innerHTML = `<div class="card p-8 text-center text-muted">
                <i class="fas fa-inbox fa-3x mb-4 opacity-30"></i>
                <p>Belum ada order tersedia saat ini.</p>
            </div>`;
            return;
        }

        const cards = orders.map(o => {
            const visMap = { public: 'Public', private: 'Private', fixed_price: 'Fixed Price' };
            const deadline = o.delivery_deadline ? new Date(o.delivery_deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

            return `
                <div class="card mb-3 hover:bg-white/5 cursor-pointer" onclick="spViewOrder('${o.po_id}')">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="font-bold">${o.po_number || 'PO'}</div>
                            <div class="text-sm text-muted">${o.tenant_name || 'Tenant'}</div>
                        </div>
                        <div class="text-right">
                            <span class="badge badge-muted">${visMap[o.visibility] || o.visibility}</span>
                            <div class="text-xs text-muted mt-1">${o.material_count} item</div>
                        </div>
                    </div>
                    <div class="flex gap-4 mt-2 text-xs text-muted">
                        <span><i class="fas fa-calendar mr-1"></i> Deadline: ${deadline}</span>
                        <span><i class="fas fa-clock mr-1"></i> ${new Date(o.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    ${o.notes ? `<div class="text-xs text-muted mt-2 p-2 rounded" style="background:var(--border);">${o.notes}</div>` : ''}
                </div>`;
        }).join('');

        container.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <div class="font-bold">Order Tersedia (${orders.length})</div>
                <button class="btn btn-secondary btn-sm" onclick="spLoadOrders()"><i class="fas fa-sync"></i></button>
            </div>
            ${cards}
        `;
    } catch (e) {
        container.innerHTML = `<div class="card p-4 text-danger">Gagal memuat order: ${e.message}</div>`;
    }
}

// ─── Order Detail + Bid ─────────────────────────────────────────────────────

async function spViewOrder(poId) {
    const container = document.getElementById('sp-tab-orders');
    container.innerHTML = `<div class="card p-6 text-center text-muted"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat detail order...</div>`;

    try {
        const order = await spApi(`/orders/${poId}`);

        const matRows = order.materials.map((m, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${m.material_name}</td>
                <td><span class="badge ${m.material_type === 'ingredient' ? 'badge-primary' : 'badge-muted'}" style="font-size:0.6rem;">${m.material_type}</span></td>
                <td class="font-mono">${m.quantity_needed.toFixed(2)}</td>
                <td>${m.unit}</td>
                ${!order.my_bid && order.visibility !== 'fixed_price' ? `
                    <td><input type="number" class="input-field bid-qty-input" style="width:80px;height:26px;padding:2px 6px;font-size:0.75rem;" data-mid="${m.id}" value="${m.quantity_needed.toFixed(2)}" step="0.01" min="0"></td>
                    <td><input type="number" class="input-field bid-price-input" style="width:90px;height:26px;padding:2px 6px;font-size:0.75rem;" data-mid="${m.id}" value="0" step="1" min="0"></td>
                ` : ''}
            </tr>
        `).join('');

        const isFixedPrice = order.visibility === 'fixed_price';
        const hasBid = !!order.my_bid;

        let bidStatusHtml = '';
        if (hasBid) {
            const b = order.my_bid;
            const statusMap = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
            bidStatusHtml = `
                <div class="card mt-4" style="border-left: 4px solid var(--accent);">
                    <div class="flex justify-between items-center mb-2">
                        <div class="font-bold">Bid Anda</div>
                        <span class="badge ${statusMap[b.status] || 'badge-muted'}">${b.status.toUpperCase()}</span>
                    </div>
                    <div class="text-sm"><strong>Total:</strong> ${spFmtRp(b.total_amount)}</div>
                    ${b.notes ? `<div class="text-xs text-muted mt-1">${b.notes}</div>` : ''}
                    ${b.items.length ? `
                        <div class="table-responsive mt-2">
                            <table class="nutri-table w-full">
                                <thead><tr><th>Item</th><th>Qty</th><th>Harga/Unit</th></tr></thead>
                                <tbody>${b.items.map(it => `
                                    <tr>
                                        <td>${it.material_name}</td>
                                        <td class="font-mono">${it.offered_qty.toFixed(2)}</td>
                                        <td class="font-mono">${spFmtRp(it.offered_price_per_unit)}</td>
                                    </tr>
                                `).join('')}</tbody>
                            </table>
                        </div>
                    ` : ''}
                </div>`;
        }

        let actionHtml = '';
        if (!hasBid && order.status === 'open') {
            if (isFixedPrice) {
                actionHtml = `<button class="btn btn-success w-full py-3 mt-4" onclick="spClaimOrder('${poId}')"><i class="fas fa-hand-paper mr-2"></i> Claim Order Ini</button>`;
            } else {
                actionHtml = `
                    <div class="form-grid mt-4">
                        <div class="form-full"><label class="input-label">Catatan Bid (opsional)</label><input id="sp-bid-notes" class="input-field" placeholder="Keterangan tambahan..."></div>
                        <div class="form-full"><button class="btn btn-primary w-full py-3" onclick="spSubmitBid('${poId}')"><i class="fas fa-gavel mr-2"></i> Kirim Bid</button></div>
                    </div>`;
            }
        }

        const extraHeaders = !hasBid && !isFixedPrice ? '<th>Qty Offer</th><th>Harga/Unit</th>' : '';

        container.innerHTML = `
            <button class="btn btn-secondary btn-xs mb-3" onclick="spLoadOrders()"><i class="fas fa-arrow-left mr-1"></i> Kembali</button>

            <div class="card">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <div class="font-bold text-lg">${order.po_number || 'Purchase Order'}</div>
                        <div class="text-sm text-muted">${order.tenant_name || '-'}</div>
                    </div>
                    <span class="badge badge-muted">${order.visibility}</span>
                </div>
                ${order.delivery_deadline ? `<div class="text-sm mb-2"><i class="fas fa-calendar mr-1 text-muted"></i> Deadline: ${new Date(order.delivery_deadline).toLocaleDateString('id-ID')}</div>` : ''}
                ${order.notes ? `<div class="text-xs text-muted mb-3 p-2 rounded" style="background:var(--border);">${order.notes}</div>` : ''}

                <div class="font-bold text-sm mb-2">Daftar Material (${order.materials.length} item)</div>
                <div class="table-responsive">
                    <table class="nutri-table w-full">
                        <thead><tr><th>#</th><th>Item</th><th>Tipe</th><th>Qty</th><th>Unit</th>${extraHeaders}</tr></thead>
                        <tbody>${matRows}</tbody>
                    </table>
                </div>

                ${actionHtml}
            </div>

            ${bidStatusHtml}
        `;
    } catch (e) {
        container.innerHTML = `<div class="card p-4 text-danger">Gagal memuat detail: ${e.message}<br><button class="btn btn-secondary btn-sm mt-2" onclick="spLoadOrders()">Kembali</button></div>`;
    }
}

async function spSubmitBid(poId) {
    const qtyInputs = document.querySelectorAll('.bid-qty-input');
    const priceInputs = document.querySelectorAll('.bid-price-input');
    const notes = document.getElementById('sp-bid-notes')?.value || '';

    const items = [];
    qtyInputs.forEach(inp => {
        const mid = inp.dataset.mid;
        const qty = parseFloat(inp.value);
        const priceInp = document.querySelector(`.bid-price-input[data-mid="${mid}"]`);
        const price = priceInp ? parseFloat(priceInp.value) : 0;

        if (mid && qty > 0 && Number.isFinite(qty) && Number.isFinite(price)) {
            items.push({ material_id: mid, offered_qty: qty, offered_price_per_unit: price });
        }
    });

    if (!items.length) { alert('Isi qty dan harga untuk minimal 1 item.'); return; }
    if (!confirm(`Kirim bid dengan ${items.length} item?`)) return;

    try {
        const res = await spApi(`/orders/${poId}/bid`, 'POST', { items, notes: notes || null });
        alert(`Bid berhasil dikirim! Total: ${spFmtRp(res.total_amount)}. Menunggu review.`);
        spViewOrder(poId);
        spLoadSubscription();
    } catch (e) {
        alert('Gagal mengirim bid: ' + e.message);
    }
}

async function spClaimOrder(poId) {
    if (!confirm('Claim order ini? Anda akan langsung menjadi supplier terpilih.')) return;

    try {
        await spApi(`/orders/${poId}/claim`, 'POST');
        alert('Order berhasil di-claim!');
        spViewOrder(poId);
        spLoadSubscription();
    } catch (e) {
        alert('Gagal claim order: ' + e.message);
    }
}

// ─── My Bids ────────────────────────────────────────────────────────────────

async function spLoadMyBids() {
    const container = document.getElementById('sp-tab-mybids');
    container.innerHTML = `<div class="card p-6 text-center text-muted"><i class="fas fa-spinner fa-spin mr-2"></i>Memuat bid saya...</div>`;

    try {
        const bids = await spApi('/my-bids');
        if (!bids || !bids.length) {
            container.innerHTML = `<div class="card p-8 text-center text-muted">
                <i class="fas fa-gavel fa-3x mb-4 opacity-30"></i>
                <p>Belum ada bid yang diajukan.</p>
            </div>`;
            return;
        }

        const statusMap = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

        const rows = bids.map(b => `
            <tr class="hover:bg-white/5 cursor-pointer" onclick="spViewOrder('${b.po_id}')">
                <td class="font-mono text-sm">${b.po_number || '-'}</td>
                <td>${b.tenant_name || '-'}</td>
                <td class="font-mono">${spFmtRp(b.total_amount)}</td>
                <td><span class="badge ${statusMap[b.status] || 'badge-muted'}">${b.status.toUpperCase()}</span></td>
                <td class="text-xs text-muted">${b.submitted_at ? new Date(b.submitted_at).toLocaleDateString('id-ID') : '-'}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="card">
                <div class="flex justify-between items-center mb-3">
                    <div class="font-bold">Bid Saya (${bids.length})</div>
                    <button class="btn btn-secondary btn-sm" onclick="spLoadMyBids()"><i class="fas fa-sync"></i></button>
                </div>
                <div class="table-responsive">
                    <table class="nutri-table w-full">
                        <thead><tr><th>PO</th><th>Tenant</th><th>Total</th><th>Status</th><th>Tanggal</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
    } catch (e) {
        container.innerHTML = `<div class="card p-4 text-danger">Gagal memuat bid: ${e.message}</div>`;
    }
}

// ─── Init ───────────────────────────────────────────────────────────────────

(function spInit() {
    if (SP_TOKEN) {
        spEnterPortal();
    }
})();
