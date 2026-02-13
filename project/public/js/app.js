const API = '';
let currentUser = null;
let token = null;

// ─── Category config (icons + images) ───
const categoryData = {
    Design:       { icon: '\u{1F3A8}', img: 'https://picsum.photos/seed/cat-design/500/300' },
    Construction: { icon: '\u{1F3D7}', img: 'https://picsum.photos/seed/cat-construction/500/300' },
    Technology:   { icon: '\u{1F4BB}', img: 'https://picsum.photos/seed/cat-technology/500/300' },
    Cleaning:     { icon: '\u{2728}',  img: 'https://picsum.photos/seed/cat-cleaning/500/300' },
    Plumbing:     { icon: '\u{1F6BF}', img: 'https://picsum.photos/seed/cat-plumbing/500/300' },
    Electrical:   { icon: '\u{26A1}',  img: 'https://picsum.photos/seed/cat-electrical/500/300' },
    Moving:       { icon: '\u{1F69A}', img: 'https://picsum.photos/seed/cat-moving/500/300' },
    Landscaping:  { icon: '\u{1F333}', img: 'https://picsum.photos/seed/cat-landscaping/500/300' }
};

// Map worker IDs to avatar numbers (i.pravatar.cc supports img=1 through 70)
function getAvatarUrl(workerId) {
    // Handle both MongoDB ObjectId (string) and old integer IDs
    let numericId;
    if (typeof workerId === 'string') {
        // Convert MongoDB ObjectId string to a number using character codes
        numericId = workerId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    } else {
        numericId = workerId;
    }
    const avatarNum = ((numericId - 1) % 70) + 1;
    return `https://i.pravatar.cc/150?img=${avatarNum}`;
}

// ─── Loading ───
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', async () => {
    // Restore session from sessionStorage (tab-scoped, not localStorage)
    const savedToken = sessionStorage.getItem('token');
    const savedUser = sessionStorage.getItem('user');
    if (savedToken && savedUser) {
        token = savedToken;
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        fetchBalance();
    }
    await Promise.all([loadCategories(), loadTopWorkers()]);
    hideLoading();
});

// ─── Balance ───
function formatBalance(amount) {
    return '$' + (amount || 0).toFixed(2);
}

function updateBalanceDisplay(balance) {
    if (currentUser) {
        currentUser.balance = balance;
        sessionStorage.setItem('user', JSON.stringify(currentUser));
    }
    document.getElementById('balance-display').textContent = formatBalance(balance);
    const statBalance = document.getElementById('stat-balance');
    if (statBalance) statBalance.textContent = formatBalance(balance);
    const fundsBalance = document.getElementById('funds-current-balance');
    if (fundsBalance) fundsBalance.textContent = formatBalance(balance);
}

async function fetchBalance() {
    if (!token) return;
    try {
        const res = await fetch(API + '/api/auth/balance', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const data = await res.json();
            updateBalanceDisplay(data.balance);
        }
    } catch (err) {
        console.error('Failed to fetch balance:', err);
    }
}

// ─── Funds Modal ───
function openFundsModal() {
    if (!currentUser) {
        navigate('auth');
        showToast('Please log in to add funds', 'error');
        return;
    }
    document.getElementById('funds-current-balance').textContent = formatBalance(currentUser.balance);
    document.getElementById('funds-modal').classList.add('active');
}

function closeFundsModal() {
    document.getElementById('funds-modal').classList.remove('active');
    document.getElementById('funds-amount').value = '';
}

function setFundAmount(amount) {
    document.getElementById('funds-amount').value = amount;
}

async function addFunds(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('funds-amount').value);

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    showLoading();
    try {
        const res = await fetch(API + '/api/auth/add-funds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ amount })
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error, 'error');
            return;
        }

        updateBalanceDisplay(data.balance);
        closeFundsModal();
        showToast(data.message, 'success');
    } catch (err) {
        showToast('Failed to add funds', 'error');
    } finally {
        hideLoading();
    }
}

// ─── Navigation ───
function navigate(page, extra) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const target = document.getElementById('page-' + page);
    if (target) {
        target.classList.add('active');
    }

    const navBtn = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Page-specific actions
    if (page === 'workers') {
        loadWorkers();
        loadWorkerFilters();
    } else if (page === 'posts') {
        loadPosts();
    } else if (page === 'dashboard') {
        if (!currentUser) {
            navigate('auth');
            showToast('Please log in to view your dashboard', 'error');
            return;
        }
        loadDashboard();
    } else if (page === 'auth') {
        if (extra === 'register') {
            switchAuthTab('register');
        }
    }
}

// ─── Auth UI ───
function updateAuthUI() {
    if (currentUser) {
        document.getElementById('nav-auth').style.display = 'none';
        document.getElementById('nav-user').style.display = 'flex';
        document.getElementById('nav-dashboard').style.display = 'block';
        document.getElementById('user-display').textContent = currentUser.username;
        document.getElementById('create-post-btn').style.display = 'block';
        updateBalanceDisplay(currentUser.balance || 0);
    } else {
        document.getElementById('nav-auth').style.display = 'flex';
        document.getElementById('nav-user').style.display = 'none';
        document.getElementById('nav-dashboard').style.display = 'none';
        document.getElementById('user-display').textContent = '';
        document.getElementById('create-post-btn').style.display = 'none';
        document.getElementById('balance-display').textContent = '$0.00';
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-success').style.display = 'none';

    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) changePasswordForm.style.display = 'none';

    if (tab === 'login') {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('auth-title').textContent = 'Welcome Back';
        document.getElementById('auth-subtitle').textContent = 'Log in to your account';
    } else if (tab === 'register') {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('auth-title').textContent = 'Create Account';
        document.getElementById('auth-subtitle').textContent = 'Sign up to start hiring';
    } else if (tab === 'change-password') {
        document.querySelectorAll('.auth-tab')[2].classList.add('active');
        if (changePasswordForm) changePasswordForm.style.display = 'block';
        document.getElementById('auth-title').textContent = 'Change Password';
        document.getElementById('auth-subtitle').textContent = 'Reset your account password';
    }
}

// ─── Auth Actions ───
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    showLoading();
    try {
        const res = await fetch(API + '/api/auth/login', {
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
        currentUser = data.user;
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(currentUser));
        updateAuthUI();
        showToast('Logged in successfully!', 'success');
        navigate('dashboard');
    } catch (err) {
        showAuthError('Connection error. Please try again.');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const age = document.getElementById('reg-age').value;

    showLoading();
    try {
        const body = { name, username, email, password };
        if (age) body.age = parseInt(age);

        const res = await fetch(API + '/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) {
            showAuthError(data.error);
            return;
        }

        token = data.token;
        currentUser = data.user;
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(currentUser));
        updateAuthUI();
        showToast('Account created! Welcome to HireWork!', 'success');
        navigate('dashboard');
    } catch (err) {
        showAuthError('Connection error. Please try again.');
    } finally {
        hideLoading();
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    const email = document.getElementById('change-email').value;
    const newPassword = document.getElementById('change-new-password').value;
    const confirmPassword = document.getElementById('change-confirm-password').value;

    if (newPassword !== confirmPassword) {
        showAuthError('Passwords do not match');
        return;
    }

    showLoading();
    try {
        const res = await fetch(API + '/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword })
        });
        const data = await res.json();

        if (!res.ok) {
            showAuthError(data.error);
            return;
        }

        showAuthSuccess(data.message);
        setTimeout(() => {
            switchAuthTab('login');
        }, 2000);
    } catch (err) {
        showAuthError('Connection error. Please try again.');
    } finally {
        hideLoading();
    }
}

function logout() {
    token = null;
    currentUser = null;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    updateAuthUI();
    showToast('Logged out', 'success');
    navigate('home');
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
}

function showAuthSuccess(msg) {
    const el = document.getElementById('auth-success');
    el.textContent = msg;
    el.style.display = 'block';
}

// ─── Categories ───
async function loadCategories() {
    try {
        const res = await fetch(API + '/api/workers/categories');
        const categories = await res.json();

        const grid = document.getElementById('categories-grid');
        grid.innerHTML = categories.map(cat => {
            const data = categoryData[cat] || { icon: '\u{1F4BC}', img: `https://picsum.photos/seed/cat-${cat.toLowerCase()}/500/300` };
            return `
            <div class="category-card" onclick="navigate('workers'); filterWorkers('${cat}')">
                <div class="category-img">
                    <img src="${data.img}" alt="${cat}" loading="lazy">
                    <div class="category-icon-overlay">${data.icon}</div>
                </div>
                <div class="category-card-body">
                    <h3>${cat}</h3>
                    <p>Browse ${cat.toLowerCase()} professionals</p>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

// ─── Top Workers ───
async function loadTopWorkers() {
    try {
        const res = await fetch(API + '/api/workers');
        const workers = await res.json();
        const top = workers.sort((a, b) => b.rating - a.rating).slice(0, 6);
        document.getElementById('top-workers').innerHTML = top.map(renderWorkerCard).join('');
    } catch (err) {
        console.error('Failed to load top workers:', err);
    }
}

// ─── Workers Page ───
let currentCategory = 'All';

async function loadWorkerFilters() {
    try {
        const res = await fetch(API + '/api/workers/categories');
        const categories = await res.json();

        const container = document.getElementById('worker-filters');
        container.innerHTML = `<button class="filter-btn ${currentCategory === 'All' ? 'active' : ''}" onclick="filterWorkers('All')">All</button>` +
            categories.map(cat =>
                `<button class="filter-btn ${currentCategory === cat ? 'active' : ''}" onclick="filterWorkers('${cat}')">${cat}</button>`
            ).join('');
    } catch (err) {
        console.error('Failed to load filters:', err);
    }
}

async function loadWorkers(category, search) {
    try {
        let url = API + '/api/workers?';
        if (category && category !== 'All') url += 'category=' + encodeURIComponent(category) + '&';
        if (search) url += 'search=' + encodeURIComponent(search);

        const res = await fetch(url);
        const workers = await res.json();

        const container = document.getElementById('workers-list');
        if (workers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="icon">\u{1F50D}</div>
                    <h3>No workers found</h3>
                    <p>Try a different category or search term</p>
                </div>`;
            return;
        }
        container.innerHTML = workers.map(renderWorkerCard).join('');
    } catch (err) {
        console.error('Failed to load workers:', err);
    }
}

function filterWorkers(category) {
    currentCategory = category;
    document.querySelectorAll('#worker-filters .filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#worker-filters .filter-btn').forEach(b => {
        if (b.textContent === category) b.classList.add('active');
    });
    const search = document.getElementById('worker-search')?.value || '';
    loadWorkers(category, search);
}

function searchWorkers() {
    const search = document.getElementById('worker-search').value;
    loadWorkers(currentCategory, search);
}

function heroSearch() {
    const search = document.getElementById('hero-search').value;
    if (search.trim()) {
        navigate('workers');
        document.getElementById('worker-search').value = search;
        loadWorkers('All', search);
    }
}

function renderWorkerCard(worker) {
    const workerId = worker._id || worker.id; // MongoDB uses _id
    const initials = worker.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const avatarUrl = getAvatarUrl(workerId);
    const hireBtn = currentUser
        ? `<button class="btn btn-primary btn-sm" onclick="hireWorker('${workerId}', '${worker.name.replace(/'/g, "\\'")}', ${worker.hourly_rate})">Hire ($${worker.hourly_rate})</button>`
        : `<button class="btn btn-outline btn-sm" onclick="navigate('auth')">Login to Hire</button>`;

    return `
        <div class="worker-card">
            <div class="worker-header">
                <div class="worker-avatar">
                    <img src="${avatarUrl}" alt="${worker.name}" loading="lazy"
                         onerror="this.style.display='none';this.parentElement.textContent='${initials}'">
                </div>
                <div class="worker-info">
                    <h3>${worker.name}</h3>
                    <span class="worker-category">${worker.category}</span>
                </div>
            </div>
            <p class="worker-desc">${worker.description}</p>
            <div class="worker-location">\u{1F4CD} ${worker.location}</div>
            <div class="worker-meta">
                <span class="worker-rate">$${worker.hourly_rate}/hr</span>
                <span class="worker-rating">\u2B50 ${worker.rating}</span>
                ${hireBtn}
            </div>
        </div>
    `;
}

// ─── Hire Worker ───
async function hireWorker(workerId, workerName, hourlyRate) {
    if (!currentUser) {
        navigate('auth');
        showToast('Please log in to hire workers', 'error');
        return;
    }

    // Client-side balance check
    if ((currentUser.balance || 0) < hourlyRate) {
        showToast(`Insufficient funds. You need $${hourlyRate.toFixed(2)}. Click your balance to add funds.`, 'error');
        return;
    }

    showLoading();
    try {
        const res = await fetch(API + '/api/hires', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ worker_id: workerId })
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error, 'error');
            return;
        }

        // Update balance from server response
        if (data.balance !== undefined) {
            updateBalanceDisplay(data.balance);
        }
        showToast(data.message, 'success');
    } catch (err) {
        showToast('Failed to hire worker', 'error');
    } finally {
        hideLoading();
    }
}

// ─── Dashboard ───
async function loadDashboard() {
    document.getElementById('dashboard-welcome').textContent = `Welcome back, ${currentUser.username}!`;

    try {
        const [hiresRes, postsRes] = await Promise.all([
            fetch(API + '/api/hires', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(API + '/api/posts'),
            fetchBalance()
        ]);

        const hires = await hiresRes.json();
        const allPosts = await postsRes.json();
        const userPosts = allPosts.filter(p => p.user_id === currentUser.id);

        const activeHires = hires.filter(h => h.status === 'active');
        const completedHires = hires.filter(h => h.status === 'completed');

        document.getElementById('stat-active').textContent = activeHires.length;
        document.getElementById('stat-completed').textContent = completedHires.length;
        document.getElementById('stat-posts').textContent = userPosts.length;

        const container = document.getElementById('hires-list');
        if (hires.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">\u{1F4CB}</div>
                    <h3>No hires yet</h3>
                    <p>Browse workers and hire your first professional!</p>
                    <button class="btn btn-primary" onclick="navigate('workers')" style="margin-top:16px;">Browse Workers</button>
                </div>`;
            return;
        }

        container.innerHTML = hires.map(hire => {
            const initials = hire.worker_name.split(' ').map(n => n[0]).join('').slice(0, 2);
            const avatarUrl = getAvatarUrl(hire.worker_id);
            const date = new Date(hire.hired_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const endBtn = hire.status === 'active'
                ? `<button class="btn btn-danger btn-sm" onclick="endHire(${hire.id})">End Hire</button>`
                : '';

            return `
                <div class="hire-item">
                    <div class="hire-info">
                        <div class="worker-avatar">
                            <img src="${avatarUrl}" alt="${hire.worker_name}" loading="lazy"
                                 onerror="this.style.display='none';this.parentElement.textContent='${initials}'">
                        </div>
                        <div class="hire-details">
                            <h4>${hire.worker_name}</h4>
                            <p>${hire.category} &middot; $${hire.hourly_rate}/hr &middot; ${date}</p>
                        </div>
                    </div>
                    <div class="hire-actions">
                        <span class="hire-status ${hire.status}">${hire.status}</span>
                        ${endBtn}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

async function endHire(hireId) {
    try {
        const res = await fetch(API + `/api/hires/${hireId}/end`, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            showToast('Hire ended', 'success');
            loadDashboard();
        }
    } catch (err) {
        showToast('Failed to end hire', 'error');
    }
}

// ─── Posts ───
let currentPostFilter = 'All';

async function loadPosts(category) {
    try {
        let url = API + '/api/posts';
        if (category && category !== 'All') url += '?category=' + encodeURIComponent(category);

        const res = await fetch(url);
        const posts = await res.json();

        const container = document.getElementById('posts-list');
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="icon">\u{1F4DD}</div>
                    <h3>No posts yet</h3>
                    <p>${currentUser ? 'Be the first to create a post!' : 'Log in to create the first post!'}</p>
                </div>`;
            return;
        }

        container.innerHTML = posts.map(post => {
            const date = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const deleteBtn = currentUser && post.user_id === currentUser.id
                ? `<button class="btn btn-danger btn-sm" onclick="deletePost(${post.id})">Delete</button>`
                : '';
            const authorInitial = post.username.charAt(0).toUpperCase();

            return `
                <div class="post-card">
                    <div class="post-card-header">
                        <h3>${escapeHtml(post.title)}</h3>
                        <span class="post-card-category">${post.category}</span>
                    </div>
                    <p>${escapeHtml(post.content)}</p>
                    <div class="post-card-footer">
                        <div class="post-author-info">
                            <div class="post-author-avatar">${authorInitial}</div>
                            <span>By <span class="post-author">${escapeHtml(post.username)}</span> &middot; ${date}</span>
                        </div>
                        ${deleteBtn}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load posts:', err);
    }
}

function filterPosts(category) {
    currentPostFilter = category;
    document.querySelectorAll('#post-filters .filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#post-filters .filter-btn').forEach(b => {
        if (b.textContent === category) b.classList.add('active');
    });
    loadPosts(category);
}

function openPostModal() {
    if (!currentUser) {
        navigate('auth');
        showToast('Please log in to create a post', 'error');
        return;
    }
    document.getElementById('post-modal').classList.add('active');
}

function closePostModal() {
    document.getElementById('post-modal').classList.remove('active');
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-category').value = 'General';
}

async function createPost(e) {
    e.preventDefault();

    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const category = document.getElementById('post-category').value;

    try {
        const res = await fetch(API + '/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ title, content, category })
        });
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error, 'error');
            return;
        }

        closePostModal();
        showToast('Post published!', 'success');
        loadPosts(currentPostFilter);
    } catch (err) {
        showToast('Failed to create post', 'error');
    }
}

async function deletePost(postId) {
    try {
        const res = await fetch(API + `/api/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            showToast('Post deleted', 'success');
            loadPosts(currentPostFilter);
        }
    } catch (err) {
        showToast('Failed to delete post', 'error');
    }
}

// ─── Helpers ───
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── Mobile Menu ───
function toggleMobileMenu() {
    document.getElementById('hamburger').classList.toggle('active');
    document.getElementById('nav-menu').classList.toggle('active');
    document.getElementById('nav-overlay').classList.toggle('active');
    document.body.style.overflow = document.getElementById('nav-menu').classList.contains('active') ? 'hidden' : '';
}

function closeMobileMenu() {
    document.getElementById('hamburger').classList.remove('active');
    document.getElementById('nav-menu').classList.remove('active');
    document.getElementById('nav-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.id === 'post-modal') {
        closePostModal();
    }
    if (e.target.id === 'funds-modal') {
        closeFundsModal();
    }
});

// Enter key on hero search
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'hero-search') {
        heroSearch();
    }
});

// Close mobile menu on window resize (if opened and resized to desktop)
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});
