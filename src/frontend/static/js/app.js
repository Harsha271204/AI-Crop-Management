class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.applyTheme();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateToggleButton();
        this.updatePreferenceToggle();
    }

    toggle() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
    }

    updateToggleButton() {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = this.theme === 'light' ? 'dark_mode' : 'light_mode';
            }
        }
    }

    updatePreferenceToggle() {
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            toggle.checked = this.theme === 'dark';
        }
    }
}

class AuthManager {
    constructor() {
        this.apiBaseUrl = '/api/v1';
        this.sessionKey = 'cropyield_session';
    }

    getCurrentUser() {
        const session = localStorage.getItem(this.sessionKey);
        return session ? JSON.parse(session) : null;
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const result = await response.json();
            if (result.success && result.user) {
                localStorage.setItem(this.sessionKey, JSON.stringify(result.user));
                return { success: true, user: result.user };
            }
            return { success: false, error: result.error || 'Login failed' };
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    async register(name, email, password) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    logout() {
        localStorage.removeItem(this.sessionKey);
    }

    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }
}

class DataManager {
    constructor() {
        this.apiBaseUrl = '/api/v1';
    }

    async saveToHistory(userEmail, predictionData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/history/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: userEmail, prediction_data: predictionData })
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: 'Failed to save' };
        }
    }

    async getHistory(userEmail) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/history/${encodeURIComponent(userEmail)}`);
            return await response.json();
        } catch (error) {
            return { success: false, predictions: [] };
        }
    }

    async deleteFromHistory(predictionId, userEmail) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/history/${predictionId}?user_email=${encodeURIComponent(userEmail)}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            return { success: false };
        }
    }

    async getAnalytics(userEmail) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/analytics/${encodeURIComponent(userEmail)}`);
            return await response.json();
        } catch (error) {
            return { success: false, analytics: {} };
        }
    }

    async getSettings(userEmail) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/settings/${encodeURIComponent(userEmail)}`);
            return await response.json();
        } catch (error) {
            return { success: false, settings: {} };
        }
    }

    async updateSettings(userEmail, settings) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/settings/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: userEmail, settings })
            });
            return await response.json();
        } catch (error) {
            return { success: false };
        }
    }
}

class ToastManager {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;pointer-events:none;';
            document.body.appendChild(container);
        }
        return container;
    }

    show(message, type = 'success', duration = 3000) {
        // Remove any existing toasts
        const existingToasts = this.container.querySelectorAll('.toast');
        existingToasts.forEach(t => {
            t.classList.remove('show');
            setTimeout(() => t.remove(), 300);
        });

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const iconMap = {
            'success': 'check_circle',
            'error': 'cancel',
            'info': 'info'
        };
        const icon = iconMap[type] || 'check_circle';
        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;
        this.container.appendChild(toast);
        
        // Trigger smooth fade-in animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });
        
        // Auto-dismiss with smooth fade-out
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

class CropPredictionApp {
    constructor() {
        this.apiBaseUrl = '/api/v1';
        this.themeManager = new ThemeManager();
        this.authManager = new AuthManager();
        this.dataManager = new DataManager();
        this.toast = new ToastManager();
        this.currentPrediction = null;
        this.currentOptimizations = [];
        this.historyPredictions = [];
        this.currentSection = 'dashboard';
        this.initApp();
    }

    initApp() {
        // Always show login page first - clear any existing session
        this.authManager.logout();
        this.setupAuthPages();
        this.checkAuthState();
    }

    setupAuthPages() {
        const loginForm = document.getElementById('loginFormElement');
        const signupForm = document.getElementById('signupForm');
        const showSignupLink = document.getElementById('showSignup');
        const showLoginLink = document.getElementById('showLogin');

        if (loginForm) {
            loginForm.onsubmit = (e) => this.handleLogin(e);
        }

        if (signupForm) {
            signupForm.onsubmit = (e) => this.handleSignup(e);
        }

        if (showSignupLink) {
            showSignupLink.onclick = (e) => {
                e.preventDefault();
                this.showPage('signup');
            };
        }

        if (showLoginLink) {
            showLoginLink.onclick = (e) => {
                e.preventDefault();
                this.showPage('login');
            };
        }

        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.onclick = function() {
                const input = this.parentElement.querySelector('input');
                const icon = this.querySelector('.material-symbols-outlined');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.textContent = 'visibility_off';
                } else {
                    input.type = 'password';
                    icon.textContent = 'visibility';
                }
            };
        });
    }

    checkAuthState() {
        if (this.authManager.isAuthenticated()) {
            const user = this.authManager.getCurrentUser();
            this.showPage('main');
            this.updateUserDisplay(user);
            this.initMainApp();
            this.loadUserStats();
        } else {
            this.showPage('login');
            // Clear any pre-filled values
            const loginEmail = document.getElementById('loginEmail');
            const loginPassword = document.getElementById('loginPassword');
            if (loginEmail) loginEmail.value = '';
            if (loginPassword) loginPassword.value = '';
        }
    }

    showPage(page) {
        const loginPage = document.getElementById('loginPage');
        const signupPage = document.getElementById('signupPage');
        const mainApp = document.getElementById('mainApp');

        if (loginPage) loginPage.classList.add('hidden');
        if (signupPage) signupPage.classList.add('hidden');
        if (mainApp) mainApp.classList.add('hidden');

        if (page === 'login' && loginPage) {
            loginPage.classList.remove('hidden');
        } else if (page === 'signup' && signupPage) {
            signupPage.classList.remove('hidden');
        } else if (page === 'main' && mainApp) {
            mainApp.classList.remove('hidden');
        }
    }

    showPage(page) {
        const loginPage = document.getElementById('loginPage');
        const signupPage = document.getElementById('signupPage');
        const mainApp = document.getElementById('mainApp');

        if (loginPage) loginPage.classList.add('hidden');
        if (signupPage) signupPage.classList.add('hidden');
        if (mainApp) mainApp.classList.add('hidden');

        if (page === 'login' && loginPage) {
            loginPage.classList.remove('hidden');
        } else if (page === 'signup' && signupPage) {
            signupPage.classList.remove('hidden');
        } else if (page === 'main' && mainApp) {
            mainApp.classList.remove('hidden');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Signing in...';

        const result = await this.authManager.login(email, password);
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Sign In</span><span class="material-symbols-outlined">arrow_forward</span>';
        
        if (result.success) {
            this.toast.show('Login successful', 'success');
            this.showPage('main');
            this.updateUserDisplay(result.user);
            this.initMainApp();
            this.loadUserStats();
        } else {
            this.toast.show(result.error, 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (password !== confirmPassword) {
            this.toast.show('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.toast.show('Password must be at least 6 characters', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader"></span> Creating account...';

        const result = await this.authManager.register(name, email, password);
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Account</span><span class="material-symbols-outlined">arrow_forward</span>';
        
        if (result.success) {
            this.toast.show('Account created successfully. Please login.', 'success');
            this.showPage('login');
            document.getElementById('loginEmail').value = email;
        } else {
            this.toast.show(result.error, 'error');
        }
    }

    handleLogout() {
        this.authManager.logout();
        this.toast.show('Logged out successfully', 'success');
        this.showPage('login');
    }

    updateUserDisplay(user) {
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const welcomeName = document.getElementById('welcomeName');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');

        if (userName) userName.textContent = user.name;
        if (userAvatar) userAvatar.textContent = user.name.charAt(0).toUpperCase();
        if (welcomeName) welcomeName.textContent = user.name.split(' ')[0];
        if (profileName) profileName.value = user.name;
        if (profileEmail) profileEmail.value = user.email;
    }

    async loadUserStats() {
        const user = this.authManager.getCurrentUser();
        if (!user) return;

        const result = await this.dataManager.getAnalytics(user.email);
        if (result.success && result.analytics) {
            const stats = result.analytics;
            const totalPredictions = document.getElementById('totalPredictions');
            const totalCrops = document.getElementById('totalCrops');
            const avgImprovement = document.getElementById('avgImprovement');
            const notificationCount = document.getElementById('notificationCount');

            if (totalPredictions) totalPredictions.textContent = stats.total_predictions || 0;
            if (totalCrops) totalCrops.textContent = stats.unique_crops || 0;
            if (avgImprovement) avgImprovement.textContent = stats.avg_yield ? `${Math.round(stats.avg_yield).toLocaleString()} kg/ha` : '0 kg/ha';
            if (notificationCount) notificationCount.textContent = stats.total_predictions || 0;
        }
    }

    initMainApp() {
        this.initElements();
        this.bindEvents();
        this.setupTabs();
        this.setupNavigation();
        this.setupUserMenu();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.navigateToSection(section);
            };
        });

        const profileBtn = document.getElementById('profileBtn');
        const preferencesBtn = document.getElementById('preferencesBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (profileBtn) {
            profileBtn.onclick = (e) => {
                e.preventDefault();
                this.navigateToSection('profile');
                const userDropdown = document.getElementById('userDropdown');
                if (userDropdown) userDropdown.classList.add('hidden');
            };
        }

        if (preferencesBtn) {
            preferencesBtn.onclick = (e) => {
                e.preventDefault();
                this.navigateToSection('preferences');
                const userDropdown = document.getElementById('userDropdown');
                if (userDropdown) userDropdown.classList.add('hidden');
            };
        }

        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.preventDefault();
                this.handleLogout();
            };
        }
    }

    setupUserMenu() {
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        const themeToggle = document.getElementById('themeToggle');
        const notificationBell = document.getElementById('notificationBell');
        const notificationPanel = document.getElementById('notificationPanel');

        // User menu dropdown toggle
        if (userMenuBtn && userDropdown) {
            userMenuBtn.onclick = (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('hidden');
                if (notificationPanel) notificationPanel.classList.add('hidden');
            };
        }

        // Notification bell toggle
        if (notificationBell && notificationPanel) {
            notificationBell.onclick = (e) => {
                e.stopPropagation();
                notificationPanel.classList.toggle('hidden');
                if (userDropdown) userDropdown.classList.add('hidden');
            };
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (userDropdown && !userDropdown.contains(target) && !userMenuBtn?.contains(target)) {
                userDropdown.classList.add('hidden');
            }
            if (notificationPanel && !notificationPanel.contains(target) && !notificationBell?.contains(target)) {
                notificationPanel.classList.add('hidden');
            }
        });

        // Theme toggle
        if (themeToggle) {
            themeToggle.onclick = () => this.themeManager.toggle();
        }

        // Dark mode toggle in preferences
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.onchange = () => this.themeManager.toggle();
        }

        // Save preferences button
        const savePreferencesBtn = document.getElementById('savePreferencesBtn');
        if (savePreferencesBtn) {
            savePreferencesBtn.onclick = () => this.savePreferences();
        }

        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.onsubmit = (e) => this.handleProfileUpdate(e);
        }
        
        // Password form (separate form)
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.onsubmit = (e) => this.handlePasswordUpdate(e);
        }
        
        // Prevent email field editing with warning
        const profileEmail = document.getElementById('profileEmail');
        if (profileEmail) {
            profileEmail.onclick = () => {
                this.toast.show('Email address cannot be changed for security reasons', 'error');
            };
            profileEmail.onfocus = () => {
                this.toast.show('Email address cannot be changed for security reasons', 'error');
                profileEmail.blur();
            };
        }

        // Clear notifications button
        const clearNotifications = document.getElementById('clearNotifications');
        if (clearNotifications) {
            clearNotifications.onclick = () => this.clearNotifications();
        }

        // Filter buttons for optimizations
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.onclick = () => this.handleFilterClick(btn);
        });

        // Setup map picker
        this.setupMapPicker();
    }

    clearNotifications() {
        const notificationList = document.getElementById('notificationList');
        const notificationCount = document.getElementById('notificationCount');
        if (notificationList) {
            notificationList.innerHTML = `
                <div class="notification-empty">
                    <span class="material-symbols-outlined">notifications_none</span>
                    <p>No notifications yet</p>
                </div>
            `;
        }
        if (notificationCount) {
            notificationCount.textContent = '0';
        }
        this.toast.show('Notifications cleared', 'success');
    }

    setupMapPicker() {
        // This will be called to setup the map picker functionality
        window.openMapPicker = () => {
            const mapModal = document.getElementById('mapModal');
            if (!mapModal) return;
            
            mapModal.classList.remove('hidden');
            
            // Initialize map if not already initialized
            if (!window.cropMap) {
                setTimeout(() => {
                    const mapContainer = document.getElementById('mapContainer');
                    if (mapContainer && typeof L !== 'undefined') {
                        window.cropMap = L.map('mapContainer').setView([28.6139, 77.2090], 5);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap contributors'
                        }).addTo(window.cropMap);
                        
                        window.cropMapMarker = null;
                        window.selectedLat = null;
                        window.selectedLng = null;
                        
                        // Add current location button
                        const locateBtn = L.control({position: 'topleft'});
                        locateBtn.onAdd = function() {
                            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                            div.innerHTML = '<button style="background:white;border:none;padding:8px;cursor:pointer;font-size:20px;" title="Use My Location">📍</button>';
                            div.onclick = function() {
                                if (navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition(
                                        (position) => {
                                            const lat = position.coords.latitude;
                                            const lng = position.coords.longitude;
                                            window.cropMap.setView([lat, lng], 13);
                                            
                                            if (window.cropMapMarker) {
                                                window.cropMap.removeLayer(window.cropMapMarker);
                                            }
                                            
                                            window.cropMapMarker = L.marker([lat, lng]).addTo(window.cropMap);
                                            window.selectedLat = lat;
                                            window.selectedLng = lng;
                                            
                                            document.getElementById('mapLat').textContent = lat.toFixed(6);
                                            document.getElementById('mapLng').textContent = lng.toFixed(6);
                                        },
                                        (error) => {
                                            alert('Unable to get your location. Please click on the map instead.');
                                        }
                                    );
                                }
                            };
                            return div;
                        };
                        locateBtn.addTo(window.cropMap);
                        
                        window.cropMap.on('click', (e) => {
                            const lat = e.latlng.lat;
                            const lng = e.latlng.lng;
                            
                            if (window.cropMapMarker) {
                                window.cropMap.removeLayer(window.cropMapMarker);
                            }
                            
                            window.cropMapMarker = L.marker([lat, lng]).addTo(window.cropMap);
                            window.selectedLat = lat;
                            window.selectedLng = lng;
                            
                            document.getElementById('mapLat').textContent = lat.toFixed(6);
                            document.getElementById('mapLng').textContent = lng.toFixed(6);
                        });
                        
                        // Invalidate size to fix rendering issues
                        setTimeout(() => window.cropMap.invalidateSize(), 100);
                    }
                }, 100);
            } else {
                // Invalidate size when reopening
                setTimeout(() => window.cropMap.invalidateSize(), 100);
            }
        };
        
        window.closeMapModal = () => {
            const mapModal = document.getElementById('mapModal');
            if (mapModal) {
                mapModal.classList.add('hidden');
            }
        };
        
        const confirmMapLocation = document.getElementById('confirmMapLocation');
        if (confirmMapLocation) {
            confirmMapLocation.onclick = () => {
                if (window.selectedLat && window.selectedLng) {
                    document.getElementById('latitude').value = window.selectedLat.toFixed(6);
                    document.getElementById('longitude').value = window.selectedLng.toFixed(6);
                    this.showLocationStatus(
                        `Location set: ${window.selectedLat.toFixed(4)}, ${window.selectedLng.toFixed(4)}`,
                        'success'
                    );
                    window.closeMapModal();
                    this.toast.show('Location selected from map', 'success');
                } else {
                    this.toast.show('Please click on the map to select a location', 'error');
                }
            };
        }
    }

    navigateToSection(section) {
        this.currentSection = section;
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });

        document.querySelectorAll('.section-content').forEach(sec => {
            sec.classList.add('hidden');
        });

        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        if (section === 'history') {
            this.loadHistory();
        } else if (section === 'analytics') {
            this.loadAnalytics();
        } else if (section === 'preferences') {
            this.loadPreferences();
        }
    }

    async loadHistory() {
        const user = this.authManager.getCurrentUser();
        if (!user) return;

        const historyContent = document.getElementById('historyContent');
        historyContent.innerHTML = '<div class="loading-state"><span class="loader"></span><p>Loading history...</p></div>';

        const result = await this.dataManager.getHistory(user.email);
        
        // Store predictions for later access
        this.historyPredictions = result.predictions || [];
        
        if (!result.success || !result.predictions || result.predictions.length === 0) {
            historyContent.innerHTML = `
                <div class="empty-state" style="padding: 6rem 2rem;">
                    <div style="width: 120px; height: 120px; margin: 0 auto 2rem; background: linear-gradient(135deg, var(--primary-100), var(--primary-200)); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 4rem; color: var(--primary-600);">history</span>
                    </div>
                    <h3 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: var(--text-primary);">No Predictions Yet</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem; max-width: 400px; margin-left: auto; margin-right: auto;">Start making crop yield predictions to build your history and track your farming insights over time.</p>
                    <button class="btn btn-primary btn-large" onclick="app.navigateToSection('dashboard')" style="box-shadow: 0 4px 14px 0 rgba(34, 197, 94, 0.4);">
                        <span class="material-symbols-outlined">add_circle</span>
                        Make Your First Prediction
                    </button>
                </div>
            `;
            return;
        }

        historyContent.innerHTML = result.predictions.map(p => `
            <div class="history-item" data-id="${p.id}">
                <div class="history-info">
                    <div class="history-icon">
                        <span class="material-symbols-outlined">eco</span>
                    </div>
                    <div class="history-details">
                        <h4>${p.input?.crop_name || 'Unknown Crop'}</h4>
                        <p>${p.location?.city || 'Unknown Location'}, ${p.location?.country || ''} - ${p.input?.field_size_hectares || 0} hectares</p>
                    </div>
                </div>
                <div class="history-meta">
                    <span class="history-yield">${(p.yield_prediction?.predicted_yield_kg_per_hectare || 0).toLocaleString()} kg/ha</span>
                    <span class="history-date">${new Date(p.timestamp).toLocaleDateString()}</span>
                    <div class="history-actions">
                        <button class="btn btn-ghost" onclick="app.viewPrediction('${p.id}')" title="View Details">
                            <span class="material-symbols-outlined">visibility</span>
                        </button>
                        <button class="btn btn-ghost" onclick="app.deletePrediction('${p.id}')" title="Delete">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadAnalytics() {
        const user = this.authManager.getCurrentUser();
        if (!user) return;

        const analyticsContent = document.getElementById('analyticsContent');
        analyticsContent.innerHTML = '<div class="loading-state"><span class="loader"></span><p>Loading analytics...</p></div>';

        const result = await this.dataManager.getAnalytics(user.email);
        
        if (!result.success || !result.analytics || result.analytics.total_predictions === 0) {
            analyticsContent.innerHTML = `
                <div class="empty-state" style="padding: 6rem 2rem;">
                    <div style="width: 120px; height: 120px; margin: 0 auto 2rem; background: linear-gradient(135deg, var(--secondary-100), var(--secondary-200)); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 4rem; color: var(--secondary-600);">analytics</span>
                    </div>
                    <h3 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: var(--text-primary);">No Analytics Data</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem; max-width: 400px; margin-left: auto; margin-right: auto;">Make some predictions to unlock powerful insights and analytics about your crop yields and farming patterns.</p>
                    <button class="btn btn-primary btn-large" onclick="app.navigateToSection('dashboard')" style="box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.4);">
                        <span class="material-symbols-outlined">auto_awesome</span>
                        Generate Your First Analysis
                    </button>
                </div>
            `;
            return;
        }

        const stats = result.analytics;
        const maxCount = Math.max(...(stats.crops_breakdown || []).map(c => c.count), 1);

        analyticsContent.innerHTML = `
            <div class="analytics-grid">
                <div class="analytics-card">
                    <div class="value">${stats.total_predictions}</div>
                    <div class="label">Total Predictions</div>
                </div>
                <div class="analytics-card">
                    <div class="value">${stats.unique_crops}</div>
                    <div class="label">Unique Crops</div>
                </div>
                <div class="analytics-card">
                    <div class="value">${stats.total_hectares}</div>
                    <div class="label">Total Hectares</div>
                </div>
                <div class="analytics-card">
                    <div class="value">${Math.round(stats.avg_yield).toLocaleString()}</div>
                    <div class="label">Avg Yield (kg/ha)</div>
                </div>
            </div>
            
            ${stats.crops_breakdown && stats.crops_breakdown.length > 0 ? `
            <div class="analytics-chart card">
                <h3>Top Crops Analyzed</h3>
                <div class="crops-list">
                    ${stats.crops_breakdown.map(crop => `
                        <div class="crop-item">
                            <span class="name">${crop.crop}</span>
                            <span class="count">${crop.count} prediction${crop.count > 1 ? 's' : ''}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${stats.recent_predictions && stats.recent_predictions.length > 0 ? `
            <div class="analytics-chart card">
                <h3>Recent Activity</h3>
                <div class="crops-list">
                    ${stats.recent_predictions.slice(0, 5).map(p => `
                        <div class="crop-item">
                            <span class="name">${p.input?.crop_name || 'Unknown'} - ${p.location?.city || 'Unknown'}</span>
                            <span class="count">${new Date(p.timestamp).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;
    }

    async loadPreferences() {
        this.themeManager.updatePreferenceToggle();
    }

    async savePreferences() {
        const user = this.authManager.getCurrentUser();
        if (!user) return;

        const settings = {
            theme: this.themeManager.theme,
            email_notifications: document.getElementById('emailNotificationsToggle')?.checked || false,
            preferred_units: document.getElementById('preferredUnits')?.value || 'metric'
        };

        const result = await this.dataManager.updateSettings(user.email, settings);
        if (result.success) {
            this.toast.show('Preferences saved successfully', 'success');
        } else {
            this.toast.show('Failed to save preferences', 'error');
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        const user = this.authManager.getCurrentUser();
        if (!user) return;

        const newName = document.getElementById('profileName')?.value.trim();

        if (!newName || newName === user.name) {
            this.toast.show('No changes to save', 'info');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: user.email, 
                    name: newName 
                })
            });
            const result = await response.json();
            if (result.success) {
                // Update local session with new name
                user.name = newName;
                localStorage.setItem('cropyield_session', JSON.stringify(user));
                this.updateUserDisplay(user);
                this.toast.show('Profile name updated successfully', 'success');
            } else {
                this.toast.show('Failed to update profile name', 'error');
            }
        } catch (error) {
            this.toast.show('Network error while updating profile', 'error');
        }
    }

    async handlePasswordUpdate(e) {
        e.preventDefault();
        const user = this.authManager.getCurrentUser();
        if (!user) return;

        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;

        if (!currentPassword || !newPassword) {
            this.toast.show('Please enter both current and new password', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.toast.show('New password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/update-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: user.email, 
                    current_password: currentPassword,
                    new_password: newPassword 
                })
            });
            const result = await response.json();
            if (result.success) {
                this.toast.show('Password updated successfully', 'success');
                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
            } else {
                this.toast.show(result.error || 'Failed to update password', 'error');
            }
        } catch (error) {
            this.toast.show('Network error while updating password', 'error');
        }
    }

    async viewPrediction(id) {
        // Find the prediction from stored history
        const prediction = this.historyPredictions?.find(p => p.id === id);
        
        if (!prediction) {
            this.toast.show('Prediction not found', 'error');
            return;
        }

        // Show modal with prediction details - using EXACT field names from predictions.json
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        if (!modal || !modalBody) {
            this.toast.show('Unable to show details', 'error');
            return;
        }

        const yieldData = prediction.yield_prediction || {};
        const locationData = prediction.location || {};
        const weatherData = prediction.weather || {};
        const soilData = prediction.soil || {};
        const inputData = prediction.input || {};
        const optimizations = prediction.optimizations || [];
        const fieldSize = inputData.field_size_hectares || 1;
        const totalYield = (yieldData.predicted_yield_kg_per_hectare || 0) * fieldSize;

        // Risk factors HTML
        const riskFactorsHtml = yieldData.risk_factors?.length > 0
            ? `<div class="risk-factors">${yieldData.risk_factors.map(r => `<span class="risk-tag"><span class="material-symbols-outlined" style="font-size:0.875rem">warning</span>${r}</span>`).join('')}</div>`
            : '<p style="color:var(--success)">No significant risks identified</p>';

        modalBody.innerHTML = `
            <div class="prediction-detail-modal">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <div class="result-icon" style="background: linear-gradient(135deg, #22c55e, #16a34a); width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="font-size: 1.75rem; color: white;">eco</span>
                    </div>
                    <div>
                        <h2 style="margin: 0; color: var(--text-primary); font-size: 1.5rem;">${inputData.crop_name || 'Crop'} Prediction</h2>
                        <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.875rem;">${new Date(prediction.timestamp).toLocaleDateString()} • ${locationData.city || ''}, ${locationData.country || ''}</p>
                    </div>
                </div>

                <!-- Results Grid - EXACT same style as dashboard -->
                <div class="results-grid">
                    <!-- Location Card -->
                    <div class="card result-card glass-effect">
                        <div class="result-icon location-icon">
                            <span class="material-symbols-outlined">location_on</span>
                        </div>
                        <h3 class="card-subtitle">Location Analysis</h3>
                        <div class="result-content">
                            <div class="result-item"><span class="result-label">Coordinates</span><span class="result-value">${locationData.latitude?.toFixed(4) || 'N/A'}, ${locationData.longitude?.toFixed(4) || 'N/A'}</span></div>
                            <div class="result-item"><span class="result-label">City</span><span class="result-value">${locationData.city || 'N/A'}</span></div>
                            <div class="result-item"><span class="result-label">Region</span><span class="result-value">${locationData.region || 'N/A'}</span></div>
                            <div class="result-item"><span class="result-label">Country</span><span class="result-value">${locationData.country || 'N/A'}</span></div>
                        </div>
                    </div>

                    <!-- Weather Card -->
                    <div class="card result-card glass-effect">
                        <div class="result-icon weather-icon">
                            <span class="material-symbols-outlined">partly_cloudy_day</span>
                        </div>
                        <h3 class="card-subtitle">Weather Conditions</h3>
                        <div class="result-content">
                            <div class="result-item"><span class="result-label">Temperature</span><span class="result-value">${weatherData.temperature_avg || 'N/A'}°C</span></div>
                            <div class="result-item"><span class="result-label">Range</span><span class="result-value">${weatherData.temperature_min || 'N/A'}°C - ${weatherData.temperature_max || 'N/A'}°C</span></div>
                            <div class="result-item"><span class="result-label">Humidity</span><span class="result-value">${weatherData.humidity || 'N/A'}%</span></div>
                            <div class="result-item"><span class="result-label">Precipitation</span><span class="result-value">${weatherData.precipitation || 'N/A'}mm</span></div>
                            <div class="result-item"><span class="result-label">Wind Speed</span><span class="result-value">${weatherData.wind_speed || 'N/A'} km/h</span></div>
                        </div>
                    </div>

                    <!-- Soil Card -->
                    <div class="card result-card glass-effect">
                        <div class="result-icon soil-icon">
                            <span class="material-symbols-outlined">landscape</span>
                        </div>
                        <h3 class="card-subtitle">Soil Analysis</h3>
                        <div class="result-content">
                            <div class="result-item"><span class="result-label">Soil Type</span><span class="result-value">${soilData.soil_type || 'N/A'}</span></div>
                            <div class="result-item"><span class="result-label">pH Level</span><span class="result-value">${soilData.ph_level || 'N/A'}</span></div>
                            <div class="result-item"><span class="result-label">Nitrogen (N)</span><span class="result-value">${soilData.nitrogen?.toFixed(0) || 'N/A'} kg/ha</span></div>
                            <div class="result-item"><span class="result-label">Phosphorus (P)</span><span class="result-value">${soilData.phosphorus?.toFixed(0) || 'N/A'} kg/ha</span></div>
                            <div class="result-item"><span class="result-label">Potassium (K)</span><span class="result-value">${soilData.potassium?.toFixed(0) || 'N/A'} kg/ha</span></div>
                            <div class="result-item"><span class="result-label">Organic Matter</span><span class="result-value">${soilData.organic_matter || 'N/A'}%</span></div>
                        </div>
                    </div>

                    <!-- Farm Details Card -->
                    <div class="card result-card glass-effect">
                        <div class="result-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                            <span class="material-symbols-outlined">agriculture</span>
                        </div>
                        <h3 class="card-subtitle">Farm Details</h3>
                        <div class="result-content">
                            <div class="result-item"><span class="result-label">Crop</span><span class="result-value">${inputData.crop_name || 'N/A'}</span></div>
                            <div class="result-item"><span class="result-label">Field Size</span><span class="result-value">${inputData.field_size_hectares || 'N/A'} hectares</span></div>
                            <div class="result-item"><span class="result-label">Planting Date</span><span class="result-value">${inputData.planting_date || 'N/A'}</span></div>
                            <div class="result-item"><span class="result-label">Irrigation</span><span class="result-value">${inputData.irrigation_type || 'N/A'}</span></div>
                            <div class="result-item"><span class="result-label">Previous Crop</span><span class="result-value">${inputData.previous_crop || 'N/A'}</span></div>
                            <div class="result-item"><span class="result-label">Experience</span><span class="result-value">${inputData.farming_experience || 'N/A'}</span></div>
                        </div>
                    </div>
                </div>

                <!-- Yield Prediction Card - Full Width -->
                <div class="card yield-card" style="margin-top: 1.5rem;">
                    <div class="card-header">
                        <div class="card-title-group">
                            <span class="material-symbols-outlined">trending_up</span>
                            <h3 class="card-subtitle">Yield Prediction</h3>
                        </div>
                        <div class="confidence-badge">
                            <span class="material-symbols-outlined">verified</span>
                            <span>${yieldData.confidence_level || 'N/A'} Confidence</span>
                        </div>
                    </div>
                    <div class="yield-content">
                        <div class="yield-metric"><div class="yield-metric-value">${(yieldData.predicted_yield_kg_per_hectare || 0).toLocaleString()}</div><div class="yield-metric-label">kg/hectare</div></div>
                        <div class="yield-metric"><div class="yield-metric-value">${totalYield.toLocaleString()}</div><div class="yield-metric-label">Total kg (${fieldSize} ha)</div></div>
                        <div class="yield-metric"><div class="yield-metric-value">${yieldData.confidence_level || 'N/A'}</div><div class="yield-metric-label">Confidence</div></div>
                        <div class="yield-metric"><div class="yield-metric-value">${yieldData.growing_season_days || 'N/A'}</div><div class="yield-metric-label">Growing Days</div></div>
                    </div>
                    <div class="yield-details" style="margin-top: 1.5rem;">
                        <p><strong>Yield Range:</strong> ${(yieldData.yield_range_min || 0).toLocaleString()} - ${(yieldData.yield_range_max || 0).toLocaleString()} kg/ha</p>
                        ${yieldData.optimal_harvest_window ? `<p><strong>Optimal Harvest:</strong> ${yieldData.optimal_harvest_window}</p>` : ''}
                        <p style="margin-top:0.75rem"><strong>Risk Factors:</strong></p>
                        ${riskFactorsHtml}
                    </div>
                </div>

                <!-- Optimizations Card -->
                ${optimizations.length > 0 ? `
                    <div class="card optimizations-card" style="margin-top: 1.5rem;">
                        <div class="card-header">
                            <div class="card-title-group">
                                <span class="material-symbols-outlined">lightbulb</span>
                                <h3 class="card-subtitle">AI Recommendations</h3>
                            </div>
                            <span style="font-size: 0.875rem; color: var(--text-muted);">${optimizations.length} recommendations</span>
                        </div>
                        <div class="optimizations-content">
                            ${optimizations.map((opt, index) => `
                                <div class="optimization-item">
                                    <div class="optimization-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                                        <div class="optimization-title-section">
                                            <span class="material-symbols-outlined" style="color:var(--primary-500)">${this.getOptimizationIcon(opt.category)}</span>
                                            <span class="optimization-title">${opt.category}</span>
                                            <span class="priority-badge priority-${opt.priority?.toLowerCase() || 'medium'}">${opt.priority || 'Medium'}</span>
                                        </div>
                                        <span class="optimization-improvement"><span class="material-symbols-outlined" style="font-size:1rem">trending_up</span>${opt.expected_improvement}</span>
                                    </div>
                                    <div class="optimization-body" style="display: block;">
                                        <p class="optimization-recommendation">${opt.recommendation}</p>
                                        ${opt.products?.length ? `
                                            <div class="products-section-header"><span class="material-symbols-outlined">shopping_bag</span> Recommended Products</div>
                                            <div class="products-grid">${opt.products.map(p => this.renderProduct(p)).join('')}</div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        modal.classList.remove('hidden');
    }

    async deletePrediction(id) {
        const user = this.authManager.getCurrentUser();
        if (!user) return;

        if (!confirm('Are you sure you want to delete this prediction?')) return;

        const result = await this.dataManager.deleteFromHistory(id, user.email);
        if (result.success) {
            this.toast.show('Prediction deleted', 'success');
            this.loadHistory();
            this.loadUserStats();
        } else {
            this.toast.show('Failed to delete prediction', 'error');
        }
    }

    async saveCurrentPrediction() {
        if (!this.currentPrediction) {
            this.toast.show('No prediction to save', 'error');
            return;
        }

        const user = this.authManager.getCurrentUser();
        if (!user) {
            this.toast.show('Please login to save predictions', 'error');
            return;
        }

        const result = await this.dataManager.saveToHistory(user.email, this.currentPrediction);
        if (result.success) {
            this.toast.show('Prediction saved to history', 'success');
            this.loadUserStats();
        } else {
            this.toast.show('Failed to save prediction', 'error');
        }
    }

    initElements() {
        this.detectLocationBtn = document.getElementById('detectLocationBtn');
        this.latitudeInput = document.getElementById('latitude');
        this.longitudeInput = document.getElementById('longitude');
        this.locationStatus = document.getElementById('locationStatus');
        this.cropNameInput = document.getElementById('cropName');
        this.fieldSizeInput = document.getElementById('fieldSize');
        this.plantingDateInput = document.getElementById('plantingDate');
        this.irrigationTypeSelect = document.getElementById('irrigationType');
        this.previousCropInput = document.getElementById('previousCrop');
        this.farmingExperienceSelect = document.getElementById('farmingExperience');
        this.budgetLevelSelect = document.getElementById('budgetLevel');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.logMessages = document.getElementById('logMessages');
        this.locationResults = document.getElementById('locationResults');
        this.weatherResults = document.getElementById('weatherResults');
        this.soilResults = document.getElementById('soilResults');
        this.yieldResults = document.getElementById('yieldResults');
        this.optimizationsResults = document.getElementById('optimizationsResults');
    }

    bindEvents() {
        if (this.detectLocationBtn) {
            this.detectLocationBtn.onclick = () => this.detectLocation();
        }
        if (this.analyzeBtn) {
            this.analyzeBtn.onclick = () => this.analyze();
        }

        const resetBtn = document.getElementById('resetBtn');
        const saveHistoryBtn = document.getElementById('saveHistoryBtn');
        
        if (resetBtn) {
            resetBtn.onclick = () => this.resetForm();
        }
        if (saveHistoryBtn) {
            saveHistoryBtn.onclick = () => this.saveCurrentPrediction();
        }
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.onclick = () => {
                const tab = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const targetTab = document.getElementById(`${tab}Tab`);
                if (targetTab) targetTab.classList.add('active');
            };
        });
    }

    detectLocation() {
        if (!navigator.geolocation) {
            this.showLocationStatus('Geolocation is not supported by your browser', 'error');
            return;
        }

        this.showLocationStatus('Detecting your location...', 'loading');
        this.detectLocationBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.latitudeInput.value = latitude.toFixed(6);
                this.longitudeInput.value = longitude.toFixed(6);
                this.showLocationStatus(
                    `Location detected: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                    'success'
                );
                this.detectLocationBtn.disabled = false;
            },
            (error) => {
                let message = 'Failed to detect location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access denied. Please enable location permissions.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out.';
                        break;
                }
                this.showLocationStatus(message, 'error');
                this.detectLocationBtn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    showLocationStatus(message, type) {
        if (this.locationStatus) {
            this.locationStatus.textContent = message;
            this.locationStatus.className = `location-status ${type}`;
            this.locationStatus.style.display = 'flex';
        }
    }

    validateInputs() {
        const latitude = parseFloat(this.latitudeInput.value);
        const longitude = parseFloat(this.longitudeInput.value);
        const cropName = this.cropNameInput.value.trim();
        const fieldSize = parseFloat(this.fieldSizeInput.value);

        if (isNaN(latitude) || latitude < -90 || latitude > 90) {
            this.toast.show('Please enter a valid latitude (-90 to 90)', 'error');
            return false;
        }
        if (isNaN(longitude) || longitude < -180 || longitude > 180) {
            this.toast.show('Please enter a valid longitude (-180 to 180)', 'error');
            return false;
        }
        if (!cropName) {
            this.toast.show('Please enter a crop name', 'error');
            return false;
        }
        if (isNaN(fieldSize) || fieldSize <= 0) {
            this.toast.show('Please enter a valid field size', 'error');
            return false;
        }
        return true;
    }

    async analyze() {
        if (!this.validateInputs()) return;

        this.setLoading(true);
        this.clearResults();
        this.resultsSection.classList.remove('hidden');
        this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const requestData = {
            latitude: parseFloat(this.latitudeInput.value),
            longitude: parseFloat(this.longitudeInput.value),
            crop_name: this.cropNameInput.value.trim(),
            field_size_hectares: parseFloat(this.fieldSizeInput.value),
            planting_date: this.plantingDateInput.value || null,
            irrigation_type: this.irrigationTypeSelect.value || null,
            previous_crop: this.previousCropInput.value.trim() || null,
            farming_experience: this.farmingExperienceSelect.value || null,
            budget_level: this.budgetLevelSelect.value || null
        };

        try {
            this.addLogMessage('Initializing AI analysis pipeline...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Analysis failed');

            result.messages.forEach(msg => this.addLogMessage(msg, 'success'));

            this.currentPrediction = {
                input: requestData,
                location: result.location,
                weather: result.weather,
                soil: result.soil,
                yield_prediction: result.yield_prediction,
                optimizations: result.optimizations
            };

            this.renderResults(result);
            this.toast.show('Analysis completed successfully', 'success');
        } catch (error) {
            this.addLogMessage(`Error: ${error.message}`, 'warning');
            this.toast.show(error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        const btnText = this.analyzeBtn?.querySelector('.btn-text');
        const btnLoader = this.analyzeBtn?.querySelector('.btn-loader');
        
        if (loading) {
            if (btnText) btnText.classList.add('hidden');
            if (btnLoader) btnLoader.classList.remove('hidden');
            if (this.analyzeBtn) this.analyzeBtn.disabled = true;
        } else {
            if (btnText) btnText.classList.remove('hidden');
            if (btnLoader) btnLoader.classList.add('hidden');
            if (this.analyzeBtn) this.analyzeBtn.disabled = false;
        }
    }

    clearResults() {
        if (this.logMessages) this.logMessages.innerHTML = '';
        if (this.locationResults) this.locationResults.innerHTML = '';
        if (this.weatherResults) this.weatherResults.innerHTML = '';
        if (this.soilResults) this.soilResults.innerHTML = '';
        if (this.yieldResults) this.yieldResults.innerHTML = '';
        if (this.optimizationsResults) this.optimizationsResults.innerHTML = '';
    }

    addLogMessage(message, type = 'info') {
        if (!this.logMessages) return;
        const msgEl = document.createElement('div');
        msgEl.className = `log-message ${type}`;
        msgEl.textContent = `> ${message}`;
        this.logMessages.appendChild(msgEl);
        this.logMessages.scrollTop = this.logMessages.scrollHeight;
    }

    renderResults(result) {
        this.renderLocation(result.location);
        this.renderWeather(result.weather);
        this.renderSoil(result.soil);
        this.renderYield(result.yield_prediction, parseFloat(this.fieldSizeInput.value));
        this.renderOptimizations(result.optimizations);
    }

    renderLocation(location) {
        if (!location || !this.locationResults) return;
        this.locationResults.innerHTML = `
            <div class="result-item"><span class="result-label">Coordinates</span><span class="result-value">${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}</span></div>
            <div class="result-item"><span class="result-label">City</span><span class="result-value">${location.city || 'N/A'}</span></div>
            <div class="result-item"><span class="result-label">Region</span><span class="result-value">${location.region || 'N/A'}</span></div>
            <div class="result-item"><span class="result-label">Country</span><span class="result-value">${location.country || 'N/A'}</span></div>
        `;
    }

    renderWeather(weather) {
        if (!weather || !this.weatherResults) return;
        this.weatherResults.innerHTML = `
            <div class="result-item"><span class="result-label">Temperature</span><span class="result-value">${weather.temperature_avg}°C</span></div>
            <div class="result-item"><span class="result-label">Range</span><span class="result-value">${weather.temperature_min}°C - ${weather.temperature_max}°C</span></div>
            <div class="result-item"><span class="result-label">Humidity</span><span class="result-value">${weather.humidity}%</span></div>
            <div class="result-item"><span class="result-label">Precipitation</span><span class="result-value">${weather.precipitation}mm</span></div>
            <div class="result-item"><span class="result-label">Wind Speed</span><span class="result-value">${weather.wind_speed} km/h</span></div>
        `;
    }

    renderSoil(soil) {
        if (!soil || !this.soilResults) return;
        this.soilResults.innerHTML = `
            <div class="result-item"><span class="result-label">Soil Type</span><span class="result-value">${soil.soil_type}</span></div>
            <div class="result-item"><span class="result-label">pH Level</span><span class="result-value">${soil.ph_level}</span></div>
            <div class="result-item"><span class="result-label">Nitrogen (N)</span><span class="result-value">${soil.nitrogen.toFixed(0)} kg/ha</span></div>
            <div class="result-item"><span class="result-label">Phosphorus (P)</span><span class="result-value">${soil.phosphorus.toFixed(0)} kg/ha</span></div>
            <div class="result-item"><span class="result-label">Potassium (K)</span><span class="result-value">${soil.potassium.toFixed(0)} kg/ha</span></div>
            <div class="result-item"><span class="result-label">Organic Matter</span><span class="result-value">${soil.organic_matter}%</span></div>
        `;
    }

    renderYield(prediction, fieldSize) {
        if (!prediction || !this.yieldResults) return;
        const totalYield = prediction.predicted_yield_kg_per_hectare * fieldSize;
        const riskFactorsHtml = prediction.risk_factors?.length > 0
            ? `<div class="risk-factors">${prediction.risk_factors.map(r => `<span class="risk-tag"><span class="material-symbols-outlined" style="font-size:0.875rem">warning</span>${r}</span>`).join('')}</div>`
            : '<p style="color:var(--success)">No significant risks identified</p>';

        this.yieldResults.innerHTML = `
            <div class="yield-metric"><div class="yield-metric-value">${prediction.predicted_yield_kg_per_hectare.toLocaleString()}</div><div class="yield-metric-label">kg/hectare</div></div>
            <div class="yield-metric"><div class="yield-metric-value">${totalYield.toLocaleString()}</div><div class="yield-metric-label">Total kg (${fieldSize} ha)</div></div>
            <div class="yield-metric"><div class="yield-metric-value">${prediction.confidence_level}</div><div class="yield-metric-label">Confidence</div></div>
            <div class="yield-metric"><div class="yield-metric-value">${prediction.growing_season_days}</div><div class="yield-metric-label">Growing Days</div></div>
            <div class="yield-details">
                <p><strong>Yield Range:</strong> ${prediction.yield_range_min.toLocaleString()} - ${prediction.yield_range_max.toLocaleString()} kg/ha</p>
                ${prediction.optimal_harvest_window ? `<p><strong>Optimal Harvest:</strong> ${prediction.optimal_harvest_window}</p>` : ''}
                <p style="margin-top:0.75rem"><strong>Risk Factors:</strong></p>
                ${riskFactorsHtml}
            </div>
        `;
    }

    renderOptimizations(optimizations, filterType = 'all') {
        if (!this.optimizationsResults) return;
        
        // Store optimizations for filtering
        if (filterType === 'all' && optimizations) {
            this.currentOptimizations = optimizations;
        }
        
        const opts = this.currentOptimizations || optimizations || [];
        
        if (!opts?.length) {
            this.optimizationsResults.innerHTML = '<p style="color:var(--text-muted)">No optimization recommendations available.</p>';
            return;
        }

        // Filter optimizations based on filterType
        let filteredOpts = opts;
        if (filterType === 'high') {
            filteredOpts = opts.filter(opt => opt.priority?.toLowerCase() === 'high');
        } else if (filterType === 'products') {
            filteredOpts = opts.filter(opt => opt.products?.length > 0);
        }

        if (!filteredOpts.length) {
            this.optimizationsResults.innerHTML = `<p style="color:var(--text-muted)">No ${filterType === 'high' ? 'high priority' : 'product'} recommendations available.</p>`;
            return;
        }

        this.optimizationsResults.innerHTML = filteredOpts.map((opt, index) => `
            <div class="optimization-item" data-priority="${opt.priority?.toLowerCase()}" data-has-products="${opt.products?.length > 0}">
                <div class="optimization-header" onclick="app.toggleOptimization(${index})">
                    <div class="optimization-title-section">
                        <span class="material-symbols-outlined" style="color:var(--primary-500)">${this.getOptimizationIcon(opt.category)}</span>
                        <span class="optimization-title">${opt.category}</span>
                        <span class="priority-badge priority-${opt.priority.toLowerCase()}">${opt.priority}</span>
                    </div>
                    <span class="optimization-improvement"><span class="material-symbols-outlined" style="font-size:1rem">trending_up</span>${opt.expected_improvement}</span>
                </div>
                <div class="optimization-body" id="opt-body-${index}">
                    <p class="optimization-recommendation">${opt.recommendation}</p>
                    ${opt.products?.length ? `
                        <div class="products-section-header"><span class="material-symbols-outlined">shopping_bag</span> Recommended Products</div>
                        <div class="products-grid">${opt.products.map(p => this.renderProduct(p)).join('')}</div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    handleFilterClick(btn) {
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Get filter type and re-render
        const filterType = btn.dataset.filter;
        this.renderOptimizations(null, filterType);
    }

    getOptimizationIcon(category) {
        const icons = { 'Fertilization': 'science', 'Irrigation': 'water_drop', 'Pest Control': 'bug_report', 'Soil Management': 'landscape' };
        return icons[category] || 'eco';
    }

    renderProduct(product) {
        const imageHtml = product.image_url?.startsWith('http')
            ? `<img src="${product.image_url}" alt="${product.name}" class="product-image" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="product-image-placeholder" style="display:none"><span class="material-symbols-outlined">image</span></div>`
            : '<div class="product-image-placeholder"><span class="material-symbols-outlined">inventory_2</span></div>';

        // Generate a fallback search URL if purchase_link is empty or invalid
        let purchaseLink = product.purchase_link;
        if (!purchaseLink || !purchaseLink.startsWith('http')) {
            const searchQuery = encodeURIComponent(`${product.name} ${product.type} agriculture buy`);
            purchaseLink = `https://www.amazon.in/s?k=${searchQuery}`;
        }

        return `
            <div class="product-card">
                <div class="product-image-container">${imageHtml}<span class="product-type-badge">${product.type}</span></div>
                <div class="product-details">
                    <div class="product-name">${product.name}</div>
                    <p class="product-description">${product.description}</p>
                    <div class="product-meta"><div class="product-meta-item"><span class="material-symbols-outlined">science</span><span>${product.application_rate}</span></div></div>
                    ${product.price_range ? `<div class="product-price"><span class="material-symbols-outlined">sell</span>${product.price_range}</div>` : ''}
                    <a href="${purchaseLink}" target="_blank" rel="noopener noreferrer" class="product-link"><span class="material-symbols-outlined">shopping_cart</span>Shop Now</a>
                </div>
            </div>
        `;
    }

    toggleOptimization(index) {
        const body = document.getElementById(`opt-body-${index}`);
        if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
    }

    resetForm() {
        if (this.latitudeInput) this.latitudeInput.value = '';
        if (this.longitudeInput) this.longitudeInput.value = '';
        if (this.cropNameInput) this.cropNameInput.value = '';
        if (this.fieldSizeInput) this.fieldSizeInput.value = '';
        if (this.plantingDateInput) this.plantingDateInput.value = '';
        if (this.irrigationTypeSelect) this.irrigationTypeSelect.value = '';
        if (this.previousCropInput) this.previousCropInput.value = '';
        if (this.farmingExperienceSelect) this.farmingExperienceSelect.value = '';
        if (this.budgetLevelSelect) this.budgetLevelSelect.value = '';
        if (this.resultsSection) this.resultsSection.classList.add('hidden');
        if (this.locationStatus) this.locationStatus.style.display = 'none';
        this.currentPrediction = null;
        this.currentOptimizations = [];
        // Reset filter buttons to 'All'
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'all');
        });
        this.toast.show('Form reset successfully', 'info');
    }
}

// Global function for closing the modal
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new CropPredictionApp();
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeMapModal();
        }
    });
});
