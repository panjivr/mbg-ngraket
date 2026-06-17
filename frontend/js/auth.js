let currentCaptcha = '';

function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 to avoid confusion
    let result = '';
    const length = 5;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    currentCaptcha = result;
    
    const display = document.getElementById('captcha-display');
    if (display) {
        // Create visual noise
        display.innerHTML = '';
        
        // Background noise lines
        for(let i=0; i<5; i++) {
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.left = Math.random() * 100 + '%';
            line.style.top = Math.random() * 100 + '%';
            line.style.width = (Math.random() * 50 + 20) + 'px';
            line.style.height = '1px';
            line.style.background = 'rgba(0,0,0,0.2)';
            line.style.transform = `rotate(${Math.random() * 360}deg)`;
            display.appendChild(line);
        }

        // Render characters with random rotation/spacing
        for (let i = 0; i < result.length; i++) {
            const span = document.createElement('span');
            span.textContent = result[i];
            span.style.display = 'inline-block';
            span.style.transform = `rotate(${Math.random() * 20 - 10}deg) translateY(${Math.random() * 4 - 2}px)`;
            span.style.margin = '0 2px';
            span.style.fontSize = (Math.random() * 0.4 + 1.3) + 'rem'; // Random size 1.3-1.7rem
            display.appendChild(span);
        }
    }
}

function togglePasswordField(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = (input.type === 'password') ? 'text' : 'password';
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    }
}

function showLoginScreen(e) {
    if (e) e.preventDefault();
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('signup-screen').classList.add('hidden');
    document.getElementById('forgot-password-screen').classList.add('hidden');
    document.getElementById('reset-password-screen').classList.add('hidden');
}

function showSignupScreen(e) {
    if (e) e.preventDefault();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('signup-screen').classList.remove('hidden');
    document.getElementById('forgot-password-screen').classList.add('hidden');
    document.getElementById('reset-password-screen').classList.add('hidden');
}

function showForgotPasswordScreen(e) {
    if (e) e.preventDefault();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('signup-screen').classList.add('hidden');
    document.getElementById('forgot-password-screen').classList.remove('hidden');
    document.getElementById('reset-password-screen').classList.add('hidden');
}

function showResetPasswordScreen(e) {
    if (e) e.preventDefault();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('signup-screen').classList.add('hidden');
    document.getElementById('forgot-password-screen').classList.add('hidden');
    document.getElementById('reset-password-screen').classList.remove('hidden');
}

async function handleSignup(e) {
    e.preventDefault();
    const errBox = document.getElementById('signup_error');
    if (errBox) { errBox.style.display = 'none'; errBox.textContent = ''; }

    const tenant_name = document.getElementById('signup-tenant-name')?.value?.trim() || '';
    const email = document.getElementById('signup-email')?.value?.trim() || '';
    const password = document.getElementById('signup-pass')?.value || '';
    const password2 = document.getElementById('signup-pass2')?.value || '';

    if (!tenant_name || !email || !password) {
        if (errBox) { errBox.textContent = 'Semua field wajib diisi'; errBox.style.display = 'block'; }
        return;
    }
    if (password !== password2) {
        if (errBox) { errBox.textContent = 'Konfirmasi password tidak cocok'; errBox.style.display = 'block'; }
        return;
    }

    try {
        const r = await fetch('/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_name, email, password })
        });
        if (!r.ok) {
            const msg = await r.json().then(j => j && j.error ? j.error : null).catch(async () => await r.text());
            throw new Error(msg || 'Sign up gagal');
        }
        const json = await r.json();
        SESSION.token = json.token || '';
        SESSION.tenant_id = json.tenant_id || '';
        const serverRoleKey = json?.user?.role_key || json?.staff?.role_key || 'kepala_sppg';
        SESSION.role = (typeof normalizeRoleKey === 'function') ? normalizeRoleKey(serverRoleKey) : serverRoleKey;
        SESSION.email = email;
        SESSION.name = (email.includes('@') ? email.split('@')[0] : email);

        localStorage.setItem('app_token', SESSION.token);
        localStorage.setItem('app_tenant_id', SESSION.tenant_id);
        localStorage.setItem('app_role', SESSION.role);
        localStorage.setItem('app_email', SESSION.email);
        localStorage.setItem('app_name', SESSION.name);

        currentUser = { name: SESSION.name, role: SESSION.role };
        currentRole = SESSION.role;

        // Fetch subscription so menu shows correct modules
        let subscriptionState = 'UNKNOWN';
        let subscriptionModules = ['basic'];
        try {
            const me = typeof api === 'function' ? await api('/api/subscription/me') : null;
            subscriptionState = String(me?.state || 'UNKNOWN');
            const ok = subscriptionState === 'ACTIVE' || subscriptionState === 'GRACE';
            const planModules = me?.plan?.features?.modules;
            if (ok && Array.isArray(planModules) && planModules.length) {
                subscriptionModules = planModules;
            }
        } catch (e) {}
        window._subscription_state = subscriptionState;
        window._subscription_modules = subscriptionModules;

        document.getElementById('signup-screen').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        setupUI(currentUser);
    } catch (err) {
        if (errBox) { errBox.textContent = err.message || 'Sign up gagal'; errBox.style.display = 'block'; }
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const infoBox = document.getElementById('forgot_info');
    if (infoBox) { infoBox.style.display = 'none'; infoBox.textContent = ''; }
    const email = document.getElementById('forgot-email')?.value?.trim() || '';
    if (!email) {
        if (infoBox) { infoBox.textContent = 'Email wajib diisi'; infoBox.style.display = 'block'; }
        return;
    }
    try {
        const r = await fetch('/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!r.ok) {
            const msg = await r.json().then(j => j && j.error ? j.error : null).catch(async () => await r.text());
            throw new Error(msg || 'Permintaan reset gagal');
        }
        const json = await r.json();
        if (json.reset_token) {
            const inp = document.getElementById('reset-token');
            if (inp) inp.value = json.reset_token;
            showResetPasswordScreen();
            const resetBox = document.getElementById('reset_error');
            if (resetBox) { resetBox.textContent = 'Token reset berhasil dibuat. Silakan set password baru.'; resetBox.style.display = 'block'; }
        } else {
            if (infoBox) { infoBox.textContent = 'Jika email terdaftar, token reset akan dikirim. (Mode produksi tidak menampilkan token).'; infoBox.style.display = 'block'; }
        }
    } catch (err) {
        if (infoBox) { infoBox.textContent = err.message || 'Permintaan reset gagal'; infoBox.style.display = 'block'; }
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const errBox = document.getElementById('reset_error');
    if (errBox) { errBox.style.display = 'none'; errBox.textContent = ''; }

    const token = document.getElementById('reset-token')?.value?.trim() || '';
    const password = document.getElementById('reset-pass')?.value || '';
    const password2 = document.getElementById('reset-pass2')?.value || '';

    if (!token || !password) {
        if (errBox) { errBox.textContent = 'Token dan password wajib diisi'; errBox.style.display = 'block'; }
        return;
    }
    if (password !== password2) {
        if (errBox) { errBox.textContent = 'Konfirmasi password tidak cocok'; errBox.style.display = 'block'; }
        return;
    }

    try {
        const r = await fetch('/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
        });
        if (!r.ok) {
            const msg = await r.json().then(j => j && j.error ? j.error : null).catch(async () => await r.text());
            throw new Error(msg || 'Reset password gagal');
        }
        showLoginScreen();
        const loginErr = document.getElementById('login_error');
        if (loginErr) { loginErr.textContent = 'Password berhasil diubah. Silakan login kembali.'; loginErr.style.display = 'block'; }
    } catch (err) {
        if (errBox) { errBox.textContent = err.message || 'Reset password gagal'; errBox.style.display = 'block'; }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const errBox = document.getElementById('login_error');
    errBox.style.display = 'none';
    errBox.textContent = '';
    const role = document.getElementById('login-role').value;
    const tenant = document.getElementById('login-tenant').value.trim();
    const email = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const captcha = document.getElementById('login-captcha-input').value.trim().toUpperCase();

    if (!role) { errBox.textContent = 'Silakan pilih jabatan'; errBox.style.display = 'block'; return; }
    if (!email || !password) { errBox.textContent = 'Email dan password wajib diisi'; errBox.style.display = 'block'; return; }
    if (captcha !== currentCaptcha) { 
        errBox.textContent = 'Kode keamanan (Captcha) salah'; 
        errBox.style.display = 'block'; 
        generateCaptcha(); // Refresh captcha on error
        document.getElementById('login-captcha-input').value = '';
        return; 
    }
    if (role !== 'kepala_sppg' && !tenant) { errBox.textContent = 'Kode dapur atau nama kitchen wajib diisi untuk peran staf'; errBox.style.display = 'block'; return; }

    try {
        let loginRes;
        if (role === 'kepala_sppg') {
            loginRes = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        } else {
            loginRes = await fetch('/auth/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenant, email, password }) });
        }
        if (!loginRes.ok) {
            const msg = await loginRes.json().then(j => j && j.error ? j.error : null).catch(async () => await loginRes.text());
            throw new Error(msg || 'Login gagal');
        }
        const json = await loginRes.json();

        SESSION.token = json.token || '';
        SESSION.tenant_id = json.tenant_id || '';
        const serverRoleKey = json?.user?.role_key || json?.staff?.role_key || role;
        SESSION.role = (typeof normalizeRoleKey === 'function') ? normalizeRoleKey(serverRoleKey) : serverRoleKey;
        SESSION.email = email;
        SESSION.name = (json.user && json.user.name) ? json.user.name : (email.includes('@') ? email.split('@')[0] : email);
        if (tenant) localStorage.setItem('app_customer_tenant', tenant);

        localStorage.setItem('app_token', SESSION.token);
        localStorage.setItem('app_tenant_id', SESSION.tenant_id);
        localStorage.setItem('app_role', SESSION.role);
        localStorage.setItem('app_email', SESSION.email);
        localStorage.setItem('app_name', SESSION.name);

        currentUser = { name: SESSION.name, role };
        currentRole = role;

        // Fetch subscription state before setupUI so menu shows correct modules
        let subscriptionState = 'UNKNOWN';
        let subscriptionModules = ['basic'];
        try {
            const me = typeof api === 'function' ? await api('/api/subscription/me') : null;
            subscriptionState = String(me?.state || 'UNKNOWN');
            const ok = subscriptionState === 'ACTIVE' || subscriptionState === 'GRACE';
            const planModules = me?.plan?.features?.modules;
            if (ok && Array.isArray(planModules) && planModules.length) {
                subscriptionModules = planModules;
            }
        } catch (e) {
            subscriptionState = 'UNKNOWN';
            subscriptionModules = ['basic'];
        }
        window._subscription_state = subscriptionState;
        window._subscription_modules = subscriptionModules;

        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        setupUI(currentUser);
    } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('app_token');
    localStorage.removeItem('app_tenant_id');
    localStorage.removeItem('app_role');
    localStorage.removeItem('app_email');
    localStorage.removeItem('app_name');
    SESSION = { token: '', tenant_id: '', role: '', email: '', name: '' };
    currentUser = null;
    currentRole = null;
    location.reload();
}

function initAuthOnReady() {
    const roleSel = document.getElementById('login-role');
    if(roleSel) {
        roleSel.addEventListener('change', () => {
            const role = roleSel.value;
            const g = document.getElementById('login-tenant-group');
            g.classList.remove('hidden');
            const label = g.querySelector('.input-label');
            if (label) label.textContent = (role === 'kepala_sppg') ? 'Kode dapur / kitchen (opsional)' : 'Kode dapur / kitchen (wajib untuk staf)';
        });
    }

    (function initLoginTenantPrefill() {
        const saved = localStorage.getItem('app_customer_tenant') || '';
        const inp = document.getElementById('login-tenant');
        if (inp && saved && !inp.value) inp.value = saved;
        
        if(roleSel) {
            const role = roleSel.value;
            const g = document.getElementById('login-tenant-group');
            if (g) {
                g.classList.remove('hidden');
                const label = g.querySelector('.input-label');
                if (label) label.textContent = (role === 'kepala_sppg') ? 'Kode dapur / kitchen (opsional)' : 'Kode dapur / kitchen (wajib untuk staf)';
            }
        }
    })();
    
    // Init Captcha
    if (document.getElementById('captcha-display')) {
        generateCaptcha();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthOnReady);
} else {
    initAuthOnReady();
}

window.togglePasswordField = togglePasswordField;
window.showLoginScreen = showLoginScreen;
window.showSignupScreen = showSignupScreen;
window.showForgotPasswordScreen = showForgotPasswordScreen;
window.showResetPasswordScreen = showResetPasswordScreen;
window.handleSignup = handleSignup;
window.handleForgotPassword = handleForgotPassword;
window.handleResetPassword = handleResetPassword;
