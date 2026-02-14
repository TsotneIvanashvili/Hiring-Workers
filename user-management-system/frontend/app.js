// ============================================
// Configuration
// ============================================
const API_URL = 'http://localhost:5000/api';
let currentUser = null;
let token = localStorage.getItem('token');

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();

    if (token) {
        await loadUser();
    } else {
        showAuthPage();
    }

    setTimeout(() => {
        document.getElementById('loading-screen')?.classList.add('hidden');
    }, 1000);
});

function setupEventListeners() {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    document.getElementById('funds-form')?.addEventListener('submit', handleAddFunds);
}

// ============================================
// Authentication
// ============================================
function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'login') {
        tabs[0].classList.add('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        tabs[1].classList.add('active');
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }

    document.getElementById('auth-error')?.classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showAuthError(data.error);
            return;
        }

        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;

        showApp('workers');
        showToast('Welcome back!', 'success');

    } catch (error) {
        showAuthError('Connection error. Check that the backend is running and CORS allows this frontend origin.');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showAuthError(data.error);
            return;
        }

        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;

        showApp('profile');
        showToast('Account created successfully!', 'success');

    } catch (error) {
        showAuthError('Connection error. Check that the backend is running and CORS allows this frontend origin.');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function loadUser() {
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            logout();
            return;
        }

        const data = await res.json();
        currentUser = data.user;
        showApp('workers');

    } catch (error) {
        logout();
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    showAuthPage();
    showToast('Logged out', 'success');
}

// ============================================
// UI Navigation
// ============================================
function showAuthPage() {
    document.getElementById('auth-page')?.classList.remove('hidden');
    document.getElementById('app')?.classList.add('hidden');
}

function showApp(initialPage = 'workers') {
    document.getElementById('auth-page')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');

    updateBalance();
    updateUserDisplay();
    navigate(initialPage);
}

function navigate(page) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));

    const pageEl = document.getElementById(`${page}-page`);
    pageEl?.classList.remove('hidden');

    const appPages = ['profile', 'dashboard', 'workers', 'hires'];
    const activeNavPage = appPages.includes(page) ? 'workers' : page;
    document.querySelectorAll('[data-nav-page]').forEach((link) => {
        const isActive = link.getAttribute('data-nav-page') === activeNavPage;
        link.classList.toggle('active', isActive);
    });

    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay) {
        userNameDisplay.classList.toggle('hidden', page !== 'workers');
    }

    document.getElementById('user-dropdown')?.classList.add('hidden');

    if (page === 'profile') loadProfile();
    if (page === 'dashboard') loadDashboard();
    if (page === 'workers') loadWorkers();
    if (page === 'hires') loadHires();
}

function updateUserDisplay() {
    if (!currentUser) return;
    const firstName = currentUser.name.split(' ')[0];
    const initial = firstName.charAt(0).toUpperCase();

    document.getElementById('user-name-display').textContent = firstName;
    document.getElementById('user-avatar').textContent = initial;

    const profileAvatarEl = document.getElementById('profile-avatar');
    if (profileAvatarEl) profileAvatarEl.textContent = initial;

    const profileNameEl = document.getElementById('profile-name');
    if (profileNameEl) profileNameEl.textContent = currentUser.name;

    const profileEmailEl = document.getElementById('profile-email');
    if (profileEmailEl) profileEmailEl.textContent = currentUser.email;

    const profileIdEl = document.getElementById('profile-id');
    if (profileIdEl) profileIdEl.textContent = currentUser.id || '-';

    const homeProfileAvatarEl = document.getElementById('home-profile-avatar');
    if (homeProfileAvatarEl) homeProfileAvatarEl.textContent = initial;

    const homeProfileNameEl = document.getElementById('home-profile-name');
    if (homeProfileNameEl) homeProfileNameEl.textContent = currentUser.name;

    const homeProfileEmailEl = document.getElementById('home-profile-email');
    if (homeProfileEmailEl) homeProfileEmailEl.textContent = currentUser.email;

    const homeProfileIdEl = document.getElementById('home-profile-id');
    if (homeProfileIdEl) homeProfileIdEl.textContent = currentUser.id || '-';
}

function updateBalance() {
    if (!currentUser) return;
    const balance = `$${currentUser.balance.toFixed(2)}`;
    document.getElementById('nav-balance').textContent = balance;
    document.getElementById('dashboard-balance').textContent = balance;
    document.getElementById('modal-current-balance').textContent = balance;

    const profileBalanceEl = document.getElementById('profile-balance');
    if (profileBalanceEl) profileBalanceEl.textContent = balance;

    const homeProfileBalanceEl = document.getElementById('home-profile-balance');
    if (homeProfileBalanceEl) homeProfileBalanceEl.textContent = balance;
}

function loadProfile() {
    updateUserDisplay();
    updateBalance();
}

function toggleUserMenu() {
    document.getElementById('user-dropdown')?.classList.toggle('hidden');
}

// Click outside to close dropdown
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('user-dropdown')?.classList.add('hidden');
    }
});

// ============================================
// Dashboard
// ============================================
async function loadDashboard() {
    document.getElementById('dashboard-user-name').textContent = currentUser.name;
    updateBalance();

    try {
        const res = await fetch(`${API_URL}/hires`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        const hires = data.data || [];

        const active = hires.filter(h => h.status === 'active').length;
        const completed = hires.filter(h => h.status === 'completed').length;

        document.getElementById('dashboard-hires').textContent = hires.length;
        document.getElementById('dashboard-active').textContent = active;
        document.getElementById('dashboard-completed').textContent = completed;

        const recent = hires.slice(0, 5);
        document.getElementById('dashboard-recent').innerHTML = recent.length > 0
            ? recent.map(renderHireCard).join('')
            : '<p style="text-align:center;color:var(--gray-600)">No hires yet</p>';

    } catch (error) {
        console.error('Load dashboard error:', error);
    }
}

// ============================================
// Workers
// ============================================
async function loadWorkers() {
    try {
        const res = await fetch(`${API_URL}/workers`);
        const data = await res.json();
        const workers = data.data || [];

        document.getElementById('workers-grid').innerHTML = workers.map(renderWorkerCard).join('');

    } catch (error) {
        console.error('Load workers error:', error);
    }
}

function renderWorkerCard(worker) {
    const imageUrl = worker.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&size=400&background=1a1a26&color=fff`;
    const fallbackImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&size=400&background=1a1a26&color=fff`;
    const availability = String(worker.availability || 'available').toLowerCase();
    const availabilityLabel = availability === 'busy'
        ? 'Busy right now'
        : availability === 'unavailable'
            ? 'Unavailable'
            : 'Available now';
    const skills = Array.isArray(worker.skills) ? worker.skills : [];

    return `
        <div class="worker-card">
            <div class="worker-media">
                <img
                    class="worker-image"
                    src="${imageUrl}"
                    alt="${worker.name}"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='${fallbackImageUrl}';"
                >
                <div class="worker-badges">
                    <span class="worker-category-badge">${worker.category || 'Professional'}</span>
                    <span class="worker-rating-badge">&#9733; ${worker.rating}</span>
                </div>
            </div>
            <div class="worker-header">
                <div class="worker-info">
                    <h3>${worker.name}</h3>
                    <p class="worker-title">${worker.title}</p>
                </div>
            </div>
            <p class="worker-description">${worker.description}</p>
            <div class="worker-skills">
                ${skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
            <div class="worker-footer">
                <div class="worker-pricing">
                    <div class="worker-rate">$${worker.hourlyRate}/hr</div>
                    <div class="worker-availability ${availability}">${availabilityLabel}</div>
                </div>
                <button class="btn btn-primary worker-hire-btn" onclick='hireWorker("${worker._id}", "${worker.name}", ${worker.hourlyRate})'>
                    Hire Now
                </button>
            </div>
        </div>
    `;
}
async function hireWorker(workerId, workerName, rate) {
    if (currentUser.balance < rate) {
        showToast(`Insufficient funds. You need $${rate} but have $${currentUser.balance.toFixed(2)}`, 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/hires`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ workerId })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error, 'error');
            return;
        }

        currentUser.balance = data.balance;
        updateBalance();
        showToast(data.message, 'success');

    } catch (error) {
        showToast('Failed to hire worker', 'error');
    }
}

// ============================================
// Hires
// ============================================
async function loadHires() {
    try {
        const res = await fetch(`${API_URL}/hires`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        const hires = data.data || [];

        document.getElementById('hires-container').innerHTML = hires.length > 0
            ? hires.map(renderHireCard).join('')
            : '<p style="text-align:center;color:var(--gray-600);padding:40px">No hires yet. Browse workers to get started!</p>';

    } catch (error) {
        console.error('Load hires error:', error);
    }
}

function renderHireCard(hire) {
    const worker = hire.workerId;
    const date = new Date(hire.createdAt).toLocaleDateString();
    const completeBtn = hire.status === 'active'
        ? `<button class="btn btn-outline" onclick='completeHire("${hire._id}")'>Complete</button>`
        : '';

    return `
        <div class="hire-card">
            <div class="hire-info">
                <h3>${worker.name}</h3>
                <p class="hire-meta">${worker.title} • $${hire.amount}/hr • ${date}</p>
            </div>
            <div class="hire-actions">
                <span class="status-badge status-${hire.status}">${hire.status}</span>
                ${completeBtn}
            </div>
        </div>
    `;
}

async function completeHire(hireId) {
    try {
        const res = await fetch(`${API_URL}/hires/${hireId}/complete`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast('Hire completed!', 'success');
            loadHires();
            if (document.getElementById('dashboard-page').classList.contains('hidden') === false) {
                loadDashboard();
            }
        }

    } catch (error) {
        showToast('Failed to complete hire', 'error');
    }
}

// ============================================
// Add Funds
// ============================================
function showFundsModal() {
    document.getElementById('funds-modal')?.classList.remove('hidden');
    updateBalance();
}

function closeFundsModal() {
    document.getElementById('funds-modal')?.classList.add('hidden');
    document.getElementById('funds-amount').value = '';
}

function setFundsAmount(amount) {
    document.getElementById('funds-amount').value = amount;
}

async function handleAddFunds(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);

    const amount = parseFloat(document.getElementById('funds-amount').value);

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        setButtonLoading(btn, false);
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/add-funds`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ amount })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error, 'error');
            return;
        }

        currentUser.balance = data.balance;
        updateBalance();
        closeFundsModal();
        showToast(data.message, 'success');

    } catch (error) {
        showToast('Failed to add funds', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ============================================
// Utilities
// ============================================
function setButtonLoading(btn, loading) {
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');

    if (loading) {
        btn.disabled = true;
        text?.classList.add('hidden');
        spinner?.classList.remove('hidden');
    } else {
        btn.disabled = false;
        text?.classList.remove('hidden');
        spinner?.classList.add('hidden');
    }
}

function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}


