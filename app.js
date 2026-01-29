// ===== TripTrack - Smart Trip Expense Manager =====

// ===== Configuration =====
const CONFIG = {
    CURRENCY: '₹',
    CURRENCY_CODE: 'INR',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    WEATHER_API_URL: 'https://api.openweathermap.org/data/2.5/weather',
    SHEETS_API_URL: 'https://sheets.googleapis.com/v4/spreadsheets'
};

// ===== State Management =====
let state = {
    currentPage: 'dashboard',
    theme: 'light',
    accentColor: 'purple',
    trips: [],
    activeTrip: null,
    expenses: [],
    itinerary: [],
    persons: [],
    settings: {
        sheetId: '1qbrsq_SLMqPq4ALp2_6NqpxYJgbahCT_JCJqMMW8p6Q',
        apiKey: 'AIzaSyB8T6LYI1RdykRL2TIqDDFJqM_lEOfZOJ8',
        scriptUrl: 'https://script.google.com/macros/s/AKfycbw_5i7Bj2yOL1pueWNqCgFnDalkEBeUCpFN4CfwwZ1LDxUEHBiJRx3Vo7NO_d6aOPRK/exec',
        geminiApiKey: '',
        weatherApiKey: 'bd5e378503939ddaee76f12ad7a97608'
    }
};

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Utility Functions =====
const Utils = {
    generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),

    formatCurrency: (amount) => {
        return CONFIG.CURRENCY + parseFloat(amount || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    },

    formatDate: (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    formatDateTime: (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    },

    formatTime: (timeStr) => {
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    },

    daysUntil: (dateStr) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    },

    getTimeDiff: (targetDate) => {
        const now = new Date();
        const target = new Date(targetDate);
        const diff = target - now;

        if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };

        return {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
            passed: false
        };
    },

    getAvatarColor: (name) => {
        const colors = [
            'linear-gradient(135deg, #667eea, #764ba2)',
            'linear-gradient(135deg, #f093fb, #f5576c)',
            'linear-gradient(135deg, #4facfe, #00f2fe)',
            'linear-gradient(135deg, #43e97b, #38f9d7)',
            'linear-gradient(135deg, #fa709a, #fee140)',
            'linear-gradient(135deg, #a8edea, #fed6e3)',
            'linear-gradient(135deg, #ff9a9e, #fecfef)',
            'linear-gradient(135deg, #ffecd2, #fcb69f)'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    },

    getInitials: (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },

    getCategoryIcon: (category) => {
        const icons = {
            food: '🍽️',
            transport: '🚗',
            accommodation: '🏨',
            activities: '🎢',
            shopping: '🛍️',
            tickets: '🎫',
            fuel: '⛽',
            medical: '💊',
            tips: '💰',
            other: '📦'
        };
        return icons[category] || '📦';
    },

    getCategoryColor: (category) => {
        const colors = {
            food: '#f5576c',
            transport: '#4facfe',
            accommodation: '#667eea',
            activities: '#43e97b',
            shopping: '#f093fb',
            tickets: '#fee140',
            fuel: '#fa709a',
            medical: '#38f9d7',
            tips: '#ffecd2',
            other: '#a0aec0'
        };
        return colors[category] || '#a0aec0';
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ===== Storage =====
const Storage = {
    save: () => {
        localStorage.setItem('triptrack_state', JSON.stringify(state));
    },

    load: () => {
        const saved = localStorage.getItem('triptrack_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            // Ensure predefined keys are restored if storage was empty
            if (!state.settings.sheetId) state.settings.sheetId = '1qbrsq_SLMqPq4ALp2_6NqpxYJgbahCT_JCJqMMW8p6Q';
            if (!state.settings.apiKey) state.settings.apiKey = 'AIzaSyB8T6LYI1RdykRL2TIqDDFJqM_lEOfZOJ8';
            if (!state.settings.scriptUrl || state.settings.scriptUrl.includes('AKfycbxACN2_JUMNquUze_9LoYODigDwxB_22ItQnwDS3J1WbzYCh2ABj_4WZOx2C1vgeRh3')) {
                state.settings.scriptUrl = 'https://script.google.com/macros/s/AKfycbw_5i7Bj2yOL1pueWNqCgFnDalkEBeUCpFN4CfwwZ1LDxUEHBiJRx3Vo7NO_d6aOPRK/exec';
            }
            if (!state.settings.weatherApiKey) state.settings.weatherApiKey = 'bd5e378503939ddaee76f12ad7a97608';
        }
    },

    exportData: () => {
        const data = JSON.stringify(state, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `triptrack_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.show('Data exported successfully!', 'success');
    },

    importData: (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                state = { ...state, ...data };
                Storage.save();
                App.init();
                Toast.show('Data imported successfully!', 'success');
            } catch (err) {
                Toast.show('Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    },

    clearAll: () => {
        if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
            localStorage.removeItem('triptrack_state');
            state = {
                currentPage: 'dashboard',
                theme: 'light',
                accentColor: 'purple',
                trips: [],
                activeTrip: null,
                expenses: [],
                itinerary: [],
                persons: [],
                settings: { sheetId: '', apiKey: '', geminiApiKey: '', weatherApiKey: '' }
            };
            App.init();
            Toast.show('All data cleared', 'info');
        }
    }
};

// ===== Toast Notifications =====
const Toast = {
    show: (message, type = 'info') => {
        const container = $('#toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ===== Navigation =====
const Navigation = {
    init: () => {
        // Side nav items
        $$('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                Navigation.goTo(page);
                Navigation.closeSideNav();
            });
        });

        // Bottom nav items
        $$('.bottom-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                Navigation.goTo(page);
            });
        });

        // Menu toggle
        $('#menu-toggle').addEventListener('click', Navigation.toggleSideNav);
        $('#nav-close').addEventListener('click', Navigation.closeSideNav);
        $('#nav-overlay').addEventListener('click', Navigation.closeSideNav);

        // View all links
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-all-link')) {
                e.preventDefault();
                const page = e.target.dataset.page;
                if (page) Navigation.goTo(page);
            }
        });
    },

    goTo: (page) => {
        state.currentPage = page;

        // Update nav items
        $$('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        $$('.bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Render page
        Pages.render(page);

        // Scroll to top
        window.scrollTo(0, 0);
    },

    toggleSideNav: () => {
        $('#side-nav').classList.toggle('open');
        $('#nav-overlay').classList.toggle('open');
    },

    closeSideNav: () => {
        $('#side-nav').classList.remove('open');
        $('#nav-overlay').classList.remove('open');
    }
};

// ===== Theme =====
const Theme = {
    init: () => {
        const saved = state.theme || 'light';
        Theme.set(saved);

        $('#theme-toggle').addEventListener('click', Theme.toggle);

        // Settings toggle
        document.addEventListener('change', (e) => {
            if (e.target.id === 'dark-mode-toggle') {
                Theme.set(e.target.checked ? 'dark' : 'light');
            }
        });
    },

    toggle: () => {
        Theme.set(state.theme === 'dark' ? 'light' : 'dark');
    },

    set: (theme) => {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);

        const icon = $('#theme-toggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

        const toggle = $('#dark-mode-toggle');
        if (toggle) toggle.checked = theme === 'dark';

        Storage.save();
    }
};

// ===== Pages =====
const Pages = {
    render: (page) => {
        const main = $('#main-content');

        switch (page) {
            case 'dashboard':
                main.innerHTML = Pages.dashboard();
                Dashboard.init();
                break;
            case 'trips':
                main.innerHTML = Pages.trips();
                Trips.init();
                break;
            case 'expenses':
                main.innerHTML = Pages.expenses();
                Expenses.init();
                break;
            case 'itinerary':
                main.innerHTML = Pages.itinerary();
                Itinerary.init();
                break;
            case 'analytics':
                main.innerHTML = Pages.analytics();
                Analytics.init();
                break;
            case 'ai-assistant':
                main.innerHTML = Pages.aiAssistant();
                AI.init();
                break;
            case 'settings':
                main.innerHTML = Pages.settings();
                Settings.init();
                break;
        }
    },

    dashboard: () => {
        const trip = state.activeTrip ? state.trips.find(t => t.id === state.activeTrip) : null;

        if (!trip) {
            return `
                <div class="page">
                    <div class="page-header">
                        <h1>Dashboard</h1>
                        <button id="new-trip-btn" class="btn btn-primary">
                            <i class="fas fa-plus"></i>
                            <span>New Trip</span>
                        </button>
                    </div>
                    <div class="empty-state glass-card">
                        <div class="empty-icon">
                            <i class="fas fa-umbrella-beach"></i>
                        </div>
                        <h2>No Active Trip</h2>
                        <p>Start planning your next adventure!</p>
                        <button class="btn btn-primary new-trip-trigger">
                            <i class="fas fa-plus"></i>
                            Create New Trip
                        </button>
                    </div>
                </div>
            `;
        }

        const tripExpenses = state.expenses.filter(e => e.tripId === trip.id);
        const totalSpent = tripExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const remaining = parseFloat(trip.budget) - totalSpent;
        const progressPercent = Math.min((totalSpent / parseFloat(trip.budget)) * 100, 100);

        return `
            <div class="page">
                <div class="page-header">
                    <h1>Dashboard</h1>
                    <button id="new-trip-btn" class="btn btn-primary">
                        <i class="fas fa-plus"></i>
                        <span>New Trip</span>
                    </button>
                </div>
                
                <div class="trip-header-card glass-card">
                    <div class="trip-destination">
                        <div class="destination-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="destination-info">
                            <h2>${trip.destination}</h2>
                            <p>${Utils.formatDate(trip.startDate)} - ${Utils.formatDate(trip.endDate)}</p>
                        </div>
                    </div>
                    <div class="trip-weather" id="trip-weather">
                        <div class="weather-loading">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                    </div>
                </div>

                <div class="countdown-section glass-card">
                    <div class="countdown-header">
                        <i class="fas fa-clock"></i>
                        <span id="countdown-label">Trip Starts In</span>
                    </div>
                    <div class="countdown-timer" id="countdown-timer">
                        <div class="countdown-unit">
                            <span class="countdown-value" id="countdown-days">00</span>
                            <span class="countdown-text">Days</span>
                        </div>
                        <div class="countdown-separator">:</div>
                        <div class="countdown-unit">
                            <span class="countdown-value" id="countdown-hours">00</span>
                            <span class="countdown-text">Hours</span>
                        </div>
                        <div class="countdown-separator">:</div>
                        <div class="countdown-unit">
                            <span class="countdown-value" id="countdown-minutes">00</span>
                            <span class="countdown-text">Mins</span>
                        </div>
                        <div class="countdown-separator">:</div>
                        <div class="countdown-unit">
                            <span class="countdown-value" id="countdown-seconds">00</span>
                            <span class="countdown-text">Secs</span>
                        </div>
                    </div>
                    <div class="trip-status-badge" id="trip-status-badge">
                        <span>Loading...</span>
                    </div>
                </div>

                <div class="budget-overview glass-card">
                    <h3><i class="fas fa-wallet"></i> Budget Overview</h3>
                    <div class="budget-stats">
                        <div class="budget-stat">
                            <span class="stat-label">Planned Budget</span>
                            <span class="stat-value">${Utils.formatCurrency(trip.budget)}</span>
                        </div>
                        <div class="budget-stat">
                            <span class="stat-label">Spent So Far</span>
                            <span class="stat-value spent">${Utils.formatCurrency(totalSpent)}</span>
                        </div>
                        <div class="budget-stat">
                            <span class="stat-label">Remaining</span>
                            <span class="stat-value ${remaining >= 0 ? 'remaining' : 'spent'}">${Utils.formatCurrency(remaining)}</span>
                        </div>
                    </div>
                    <div class="budget-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="progress-text">${progressPercent.toFixed(1)}% used</span>
                    </div>
                </div>

                <div class="person-list-section glass-card">
                    <div class="section-header">
                        <h3><i class="fas fa-users"></i> Trip Members</h3>
                        <button class="btn btn-sm btn-outline" id="add-person-btn">
                            <i class="fas fa-user-plus"></i>
                        </button>
                    </div>
                    <div class="person-list" id="person-list">
                        ${Dashboard.renderPersonList(trip, tripExpenses)}
                    </div>
                </div>

                <div class="quick-expense-section glass-card">
                    <h3><i class="fas fa-receipt"></i> Add Expense</h3>
                    <form id="quick-expense-form" class="expense-form">
                        ${Dashboard.renderExpenseForm(trip)}
                    </form>
                </div>

                <div class="recent-expenses-section glass-card">
                    <div class="section-header">
                        <h3><i class="fas fa-history"></i> Recent Expenses</h3>
                        <a href="#" class="view-all-link" data-page="expenses">View All</a>
                    </div>
                    <div class="expense-list" id="recent-expense-list">
                        ${Dashboard.renderRecentExpenses(tripExpenses)}
                    </div>
                </div>
            </div>
        `;
    },

    trips: () => `
        <div class="page">
            <div class="page-header">
                <h1>My Trips</h1>
                <button class="btn btn-primary new-trip-trigger">
                    <i class="fas fa-plus"></i>
                    <span>New Trip</span>
                </button>
            </div>
            <div class="trips-filter glass-card">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="upcoming">Upcoming</button>
                <button class="filter-btn" data-filter="ongoing">Ongoing</button>
                <button class="filter-btn" data-filter="completed">Completed</button>
            </div>
            <div class="trips-grid" id="trips-grid">
                ${Trips.renderGrid()}
            </div>
        </div>
    `,

    expenses: () => {
        const trip = state.activeTrip ? state.trips.find(t => t.id === state.activeTrip) : null;
        const tripExpenses = trip ? state.expenses.filter(e => e.tripId === trip.id) : [];
        const totalAmount = tripExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        return `
            <div class="page">
                <div class="page-header">
                    <h1>Expenses</h1>
                    <button class="btn btn-primary" id="add-expense-btn">
                        <i class="fas fa-plus"></i>
                        <span>Add</span>
                    </button>
                </div>
                ${trip ? `
                    <div class="expense-filters glass-card">
                        <div class="filter-group">
                            <label>Category</label>
                            <select id="filter-category">
                                <option value="">All Categories</option>
                                <option value="food">🍽️ Food</option>
                                <option value="transport">🚗 Transport</option>
                                <option value="accommodation">🏨 Stay</option>
                                <option value="activities">🎢 Activities</option>
                                <option value="shopping">🛍️ Shopping</option>
                                <option value="tickets">🎫 Tickets</option>
                                <option value="fuel">⛽ Fuel</option>
                                <option value="medical">💊 Medical</option>
                                <option value="tips">💰 Tips</option>
                                <option value="other">📦 Other</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Paid By</label>
                            <select id="filter-paid-by">
                                <option value="">All Members</option>
                                ${(trip.members || []).map(m => `<option value="${m.name}">${m.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="expense-summary glass-card">
                        <div class="summary-item">
                            <span class="summary-label">Total Expenses</span>
                            <span class="summary-value" id="total-expenses-count">${tripExpenses.length}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Total Amount</span>
                            <span class="summary-value" id="total-expenses-amount">${Utils.formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                    <div class="expense-list-full" id="expense-list-full">
                        ${Expenses.renderList(tripExpenses)}
                    </div>
                ` : `
                    <div class="empty-state glass-card">
                        <div class="empty-icon">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <h2>No Active Trip</h2>
                        <p>Create a trip first to track expenses</p>
                        <button class="btn btn-primary new-trip-trigger">
                            <i class="fas fa-plus"></i>
                            Create Trip
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    itinerary: () => {
        const trip = state.activeTrip ? state.trips.find(t => t.id === state.activeTrip) : null;

        return `
            <div class="page">
                <div class="page-header">
                    <h1>Itinerary</h1>
                    ${trip ? `
                        <button class="btn btn-primary" id="add-itinerary-btn">
                            <i class="fas fa-plus"></i>
                            <span>Add</span>
                        </button>
                    ` : ''}
                </div>
                ${trip ? `
                    <div class="itinerary-container">
                        <div class="itinerary-timeline" id="itinerary-timeline">
                            ${Itinerary.renderTimeline(trip)}
                        </div>
                    </div>
                ` : `
                    <div class="empty-state glass-card">
                        <div class="empty-icon">
                            <i class="fas fa-route"></i>
                        </div>
                        <h2>No Active Trip</h2>
                        <p>Create a trip first to plan your itinerary</p>
                        <button class="btn btn-primary new-trip-trigger">
                            <i class="fas fa-plus"></i>
                            Create Trip
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    analytics: () => `
        <div class="page">
            <div class="page-header">
                <h1>Analytics</h1>
            </div>
            ${Analytics.renderContent()}
        </div>
    `,

    aiAssistant: () => `
        <div class="page">
            <div class="page-header">
                <h1>AI Assistant</h1>
            </div>
            <div class="ai-chat-container glass-card">
                <div class="ai-header">
                    <div class="ai-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="ai-info">
                        <h3>TripTrack AI</h3>
                        <span class="ai-status">Online - Ready to help</span>
                    </div>
                </div>
                
                <div class="ai-quick-actions">
                    <button class="quick-action-btn" data-action="weather">
                        <i class="fas fa-cloud-sun"></i>
                        <span>Weather</span>
                    </button>
                    <button class="quick-action-btn" data-action="spending">
                        <i class="fas fa-chart-pie"></i>
                        <span>Spending</span>
                    </button>
                    <button class="quick-action-btn" data-action="places">
                        <i class="fas fa-map-marked-alt"></i>
                        <span>Places</span>
                    </button>
                    <button class="quick-action-btn" data-action="tips">
                        <i class="fas fa-lightbulb"></i>
                        <span>Tips</span>
                    </button>
                </div>

                <div class="ai-messages" id="ai-messages">
                    <div class="ai-message bot">
                        <div class="message-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="message-content">
                            <p>Hello! I'm your TripTrack AI assistant. I can help you with:</p>
                            <ul>
                                <li>📊 Analyzing your spending patterns</li>
                                <li>🌤️ Weather information for your destination</li>
                                <li>📍 Recommendations for places to visit</li>
                                <li>💡 Budget tips and suggestions</li>
                            </ul>
                            <p>How can I assist you today?</p>
                        </div>
                    </div>
                </div>

                <form class="ai-input-form" id="ai-input-form">
                    <input type="text" id="ai-input" placeholder="Ask me anything about your trip..." autocomplete="off">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
    `,

    settings: () => `
        <div class="page">
            <div class="page-header">
                <h1>Settings</h1>
            </div>
            <div class="settings-container">
                <div class="settings-section glass-card">
                    <h3><i class="fas fa-table"></i> Google Sheets</h3>
                    <p class="settings-description">Connect to Google Sheets for cloud sync.</p>
                    <div class="form-group">
                        <label for="sheet-id">Sheet ID</label>
                        <input type="text" id="sheet-id" placeholder="Enter Sheet ID" value="${state.settings.sheetId || ''}">
                    </div>
                    <div class="form-group">
                        <label for="api-key">API Key</label>
                        <input type="password" id="api-key" placeholder="Enter API Key" value="${state.settings.apiKey || ''}">
                    </div>
                    <div class="form-group">
                        <label for="script-url">Apps Script URL (Required for writing)</label>
                        <input type="text" id="script-url" placeholder="Paste Apps Script Web App URL" value="${state.settings.scriptUrl || ''}">
                        <small>Need to write data? Use the <a href="#" id="view-script-btn">Instructions & Script</a></small>
                    </div>
                    <div class="settings-actions">
                        <button class="btn btn-primary" id="connect-sheets-btn">
                            <i class="fas fa-link"></i> Connect
                        </button>
                        <button class="btn btn-outline" id="sync-sheets-btn">
                            <i class="fas fa-sync"></i> Sync
                        </button>
                        <button class="btn btn-outline" id="push-sheets-btn" title="Push all local data to sheets">
                            <i class="fas fa-upload"></i> Push Local Data
                        </button>
                    </div>
                    <div id="sheets-status"></div>
                </div>

                <div class="settings-section glass-card">
                    <h3><i class="fas fa-robot"></i> AI Settings</h3>
                    <div class="form-group">
                        <label for="gemini-api-key">Gemini API Key</label>
                        <input type="password" id="gemini-api-key" placeholder="Enter Gemini API Key" value="${state.settings.geminiApiKey || ''}">
                        <small>Get from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></small>
                    </div>
                    <div class="form-group">
                        <label for="weather-api-key">OpenWeather API Key</label>
                        <input type="password" id="weather-api-key" placeholder="Enter Weather API Key" value="${state.settings.weatherApiKey || ''}">
                        <small>Get from <a href="https://openweathermap.org/api" target="_blank">OpenWeather</a></small>
                    </div>
                    <button class="btn btn-primary" id="save-ai-settings-btn">
                        <i class="fas fa-save"></i> Save
                    </button>
                </div>

                <div class="settings-section glass-card">
                    <h3><i class="fas fa-palette"></i> Appearance</h3>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Dark Mode</span>
                            <span class="setting-description">Toggle dark theme</span>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="dark-mode-toggle" ${state.theme === 'dark' ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <div class="settings-section glass-card">
                    <h3><i class="fas fa-database"></i> Data</h3>
                    <div class="settings-actions">
                        <button class="btn btn-outline" id="export-data-btn">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn btn-outline" id="import-data-btn">
                            <i class="fas fa-upload"></i> Import
                        </button>
                        <button class="btn btn-danger" id="clear-data-btn">
                            <i class="fas fa-trash"></i> Clear All
                        </button>
                    </div>
                    <input type="file" id="import-file-input" accept=".json" style="display: none;">
                </div>

                <div class="settings-section glass-card">
                    <h3><i class="fas fa-info-circle"></i> About</h3>
                    <div class="about-info">
                        <p><strong>TripTrack</strong> v1.0.0</p>
                        <p>Smart Trip Expense Manager</p>
                        <p class="about-credit">Built with ❤️</p>
                    </div>
                </div>
            </div>
        </div>
    `
};

// ===== Dashboard Module =====
const Dashboard = {
    countdownInterval: null,

    init: () => {
        Dashboard.startCountdown();
        Dashboard.fetchWeather();
        Dashboard.bindEvents();
        // Also bind expense events for the recent list shown on dashboard
        Expenses.bindItemEvents();
    },

    bindEvents: () => {
        const newTripBtn = $('#new-trip-btn');
        if (newTripBtn) newTripBtn.addEventListener('click', () => Modals.openTripModal());

        $$('.new-trip-trigger').forEach(btn => {
            btn.addEventListener('click', () => Modals.openTripModal());
        });

        const expenseForm = $('#quick-expense-form');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                Dashboard.addExpense();
            });
        }

        const addPersonBtn = $('#add-person-btn');
        if (addPersonBtn) {
            addPersonBtn.addEventListener('click', () => {
                const trip = state.trips.find(t => t.id === state.activeTrip);
                if (trip) Modals.openTripModal(trip);
            });
        }
    },

    startCountdown: () => {
        if (Dashboard.countdownInterval) clearInterval(Dashboard.countdownInterval);

        const trip = state.trips.find(t => t.id === state.activeTrip);
        if (!trip) return;

        const updateCountdown = () => {
            const now = new Date();
            const start = new Date(trip.startDate);
            const end = new Date(trip.endDate);
            end.setHours(23, 59, 59);

            let targetDate, label, status;

            if (now < start) {
                targetDate = start;
                label = 'Trip Starts In';
                status = 'upcoming';
            } else if (now <= end) {
                targetDate = end;
                label = 'Trip Ends In';
                status = 'ongoing';
            } else {
                label = 'Trip Completed';
                status = 'completed';
                $('#countdown-label').textContent = label;
                $('#trip-status-badge').innerHTML = '<span>Completed</span>';
                $('#trip-status-badge').className = 'trip-status-badge completed';
                $('#countdown-days').textContent = '00';
                $('#countdown-hours').textContent = '00';
                $('#countdown-minutes').textContent = '00';
                $('#countdown-seconds').textContent = '00';
                return;
            }

            const diff = Utils.getTimeDiff(targetDate);

            $('#countdown-label').textContent = label;
            $('#countdown-days').textContent = String(diff.days).padStart(2, '0');
            $('#countdown-hours').textContent = String(diff.hours).padStart(2, '0');
            $('#countdown-minutes').textContent = String(diff.minutes).padStart(2, '0');
            $('#countdown-seconds').textContent = String(diff.seconds).padStart(2, '0');

            const badge = $('#trip-status-badge');
            badge.innerHTML = `<span>${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
            badge.className = `trip-status-badge ${status}`;
        };

        updateCountdown();
        Dashboard.countdownInterval = setInterval(updateCountdown, 1000);
    },

    fetchWeather: async () => {
        const trip = state.trips.find(t => t.id === state.activeTrip);
        if (!trip || !state.settings.weatherApiKey) {
            $('#trip-weather').innerHTML = '<small>Add Weather API key in settings</small>';
            return;
        }

        try {
            const res = await fetch(
                `${CONFIG.WEATHER_API_URL}?q=${encodeURIComponent(trip.destination)}&appid=${state.settings.weatherApiKey}&units=metric`
            );
            const data = await res.json();

            if (data.main) {
                $('#trip-weather').innerHTML = `
                    <div class="weather-info">
                        <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}.png" alt="Weather">
                        <div>
                            <span class="weather-temp">${Math.round(data.main.temp)}°C</span>
                            <span class="weather-desc">${data.weather[0].description}</span>
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            $('#trip-weather').innerHTML = '';
        }
    },

    renderPersonList: (trip, expenses) => {
        if (!trip.members || trip.members.length === 0) {
            return '<p style="color: var(--text-muted); text-align: center;">No members added</p>';
        }

        const perPersonShare = parseFloat(trip.budget) / trip.members.length;

        return trip.members.map(member => {
            const paid = expenses.filter(e => e.paidBy === member.name)
                .reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const balance = paid - perPersonShare;

            return `
                <div class="person-item" data-name="${member.name}">
                    <div class="person-avatar" style="background: ${Utils.getAvatarColor(member.name)}">
                        ${Utils.getInitials(member.name)}
                    </div>
                    <div class="person-info">
                        <div class="person-name">${member.name}</div>
                        <div class="person-share">Share: ${Utils.formatCurrency(perPersonShare)}</div>
                    </div>
                    <div class="person-balance">
                        <div class="balance-paid">Paid: ${Utils.formatCurrency(paid)}</div>
                        <div class="balance-remaining ${balance >= 0 ? 'positive' : 'negative'}">
                            ${balance >= 0 ? '+' : ''}${Utils.formatCurrency(balance)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderExpenseForm: (trip) => {
        const now = new Date();
        const dateTimeLocal = now.toISOString().slice(0, 16);

        return `
            <div class="form-row">
                <div class="form-group">
                    <label for="expense-amount">Amount (₹)</label>
                    <input type="number" id="expense-amount" placeholder="0" required>
                </div>
                <div class="form-group">
                    <label for="expense-category">Category</label>
                    <select id="expense-category" required>
                        <option value="">Select</option>
                        <option value="food">🍽️ Food</option>
                        <option value="transport">🚗 Transport</option>
                        <option value="accommodation">🏨 Stay</option>
                        <option value="activities">🎢 Activities</option>
                        <option value="shopping">🛍️ Shopping</option>
                        <option value="tickets">🎫 Tickets</option>
                        <option value="fuel">⛽ Fuel</option>
                        <option value="medical">💊 Medical</option>
                        <option value="tips">💰 Tips</option>
                        <option value="other">📦 Other</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label for="expense-description">Description</label>
                <input type="text" id="expense-description" placeholder="What was this for?" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="expense-date">Date & Time</label>
                    <input type="datetime-local" id="expense-date" value="${dateTimeLocal}" required>
                </div>
                <div class="form-group">
                    <label for="expense-paid-by">Paid By</label>
                    <select id="expense-paid-by" required>
                        <option value="">Select</option>
                        ${(trip.members || []).map(m => `<option value="${m.name}">${m.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-plus"></i> Add Expense
            </button>
        `;
    },

    renderRecentExpenses: (expenses) => {
        if (expenses.length === 0) {
            return '<p style="color: var(--text-muted); text-align: center;">No expenses yet</p>';
        }

        return expenses.slice(-5).reverse().map(exp => `
            <div class="expense-item" data-id="${exp.id}">
                <div class="expense-icon" style="background: ${Utils.getCategoryColor(exp.category)}20; color: ${Utils.getCategoryColor(exp.category)}">
                    ${Utils.getCategoryIcon(exp.category)}
                </div>
                <div class="expense-info">
                    <div class="expense-title">${exp.description}</div>
                    <div class="expense-meta">${Utils.formatDateTime(exp.date)}</div>
                </div>
                <div class="expense-amount">
                    <div class="amount">${Utils.formatCurrency(exp.amount)}</div>
                    <div class="paid-by">by ${exp.paidBy}</div>
                </div>
            </div>
        `).join('');
    },

    addExpense: () => {
        const trip = state.trips.find(t => t.id === state.activeTrip);
        if (!trip) return;

        const expense = {
            id: Utils.generateId(),
            tripId: trip.id,
            amount: $('#expense-amount').value,
            category: $('#expense-category').value,
            description: $('#expense-description').value,
            date: $('#expense-date').value,
            paidBy: $('#expense-paid-by').value,
            createdAt: new Date().toISOString()
        };

        state.expenses.push(expense);
        Storage.save();
        GoogleSheets.syncExpense(expense);

        Toast.show('Expense added!', 'success');
        Pages.render('dashboard');
    }
};

// ===== Trips Module =====
const Trips = {
    currentFilter: 'all',

    init: () => {
        Trips.bindEvents();
    },

    bindEvents: () => {
        $$('.new-trip-trigger').forEach(btn => {
            btn.addEventListener('click', () => Modals.openTripModal());
        });

        $$('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Trips.currentFilter = btn.dataset.filter;
                $('#trips-grid').innerHTML = Trips.renderGrid();
                Trips.bindCardEvents();
            });
        });

        Trips.bindCardEvents();
    },

    bindCardEvents: () => {
        const grid = $('#trips-grid');
        if (!grid) return;

        // Remove old listeners by cloning
        const newGrid = grid.cloneNode(true);
        grid.parentNode.replaceChild(newGrid, grid);

        newGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.trip-card');
            if (!card) return;

            const tripId = card.dataset.id;
            const deleteBtn = e.target.closest('.btn-delete');
            const editBtn = e.target.closest('.btn-edit');

            if (deleteBtn) {
                e.stopPropagation();
                // Priority to button's own data-id if we added it, fallback to card id
                const targetId = deleteBtn.dataset.id || tripId;
                if (confirm('Delete this trip and all its data?')) {
                    state.trips = state.trips.filter(t => t.id !== targetId);
                    state.expenses = state.expenses.filter(exp => exp.tripId !== targetId);
                    state.itinerary = state.itinerary.filter(i => i.tripId !== targetId);
                    if (state.activeTrip === targetId) state.activeTrip = null;
                    Storage.save();
                    Pages.render('trips');
                    Toast.show('Trip deleted', 'success');
                }
                return;
            }

            if (editBtn) {
                e.stopPropagation();
                const targetId = editBtn.dataset.id || tripId;
                const trip = state.trips.find(t => t.id === targetId);
                if (trip) Modals.openTripModal(trip);
                return;
            }

            // Default activity: activate
            state.activeTrip = tripId;
            Storage.save();
            Navigation.goTo('dashboard');
            Toast.show('Trip activated!', 'success');
        });
    },

    getStatus: (trip) => {
        const now = new Date();
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        end.setHours(23, 59, 59);

        if (now < start) return 'upcoming';
        if (now <= end) return 'ongoing';
        return 'completed';
    },

    renderGrid: () => {
        let trips = [...state.trips];

        if (Trips.currentFilter !== 'all') {
            trips = trips.filter(t => Trips.getStatus(t) === Trips.currentFilter);
        }

        if (trips.length === 0) {
            return `
                <div class="empty-state glass-card" style="grid-column: 1/-1;">
                    <div class="empty-icon"><i class="fas fa-suitcase-rolling"></i></div>
                    <h2>No Trips Found</h2>
                    <p>Create your first trip to get started!</p>
                </div>
            `;
        }

        return trips.map(trip => {
            const status = Trips.getStatus(trip);
            const expenses = state.expenses.filter(e => e.tripId === trip.id);
            const spent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
            const isActive = state.activeTrip === trip.id;

            return `
                <div class="trip-card glass-card ${isActive ? 'active-trip' : ''}" data-id="${trip.id}">
                    <div class="trip-card-header">
                        <div>
                            <div class="trip-card-title">${trip.name}</div>
                            <div class="trip-card-destination"><i class="fas fa-map-marker-alt"></i> ${trip.destination}</div>
                        </div>
                        <span class="trip-card-badge ${status}">${status}</span>
                    </div>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;">
                        ${Utils.formatDate(trip.startDate)} - ${Utils.formatDate(trip.endDate)}
                    </p>
                    <div class="trip-card-stats">
                        <div class="trip-stat">
                            <div class="trip-stat-value">${Utils.formatCurrency(trip.budget)}</div>
                            <div class="trip-stat-label">Budget</div>
                        </div>
                        <div class="trip-stat">
                            <div class="trip-stat-value">${Utils.formatCurrency(spent)}</div>
                            <div class="trip-stat-label">Spent</div>
                        </div>
                        <div class="trip-stat">
                            <div class="trip-stat-value">${trip.members?.length || 0}</div>
                            <div class="trip-stat-label">Members</div>
                        </div>
                    <div style="display:flex;gap:8px;margin-top:12px;">
                        <button class="btn btn-sm btn-outline btn-edit" data-id="${trip.id}" style="flex:1;"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${trip.id}" style="flex:1;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// ===== Expenses Module =====
const Expenses = {
    init: () => {
        Expenses.bindEvents();
    },

    bindEvents: () => {
        const addBtn = $('#add-expense-btn');
        if (addBtn) addBtn.addEventListener('click', () => Modals.openExpenseModal());

        $$('.new-trip-trigger').forEach(btn => {
            btn.addEventListener('click', () => Modals.openTripModal());
        });

        const filterCategory = $('#filter-category');
        const filterPaidBy = $('#filter-paid-by');

        if (filterCategory) filterCategory.addEventListener('change', Expenses.applyFilters);
        if (filterPaidBy) filterPaidBy.addEventListener('change', Expenses.applyFilters);

        Expenses.bindItemEvents();
    },

    bindItemEvents: () => {
        // Use event delegation on expense list containers
        const containers = [
            $('#expense-list-full'),
            $('#recent-expense-list')
        ].filter(Boolean);

        containers.forEach(container => {
            // Clone to remove old listeners
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);

            newContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.expense-item');
                if (!item) return;

                const id = item.dataset.id;
                const expense = state.expenses.find(exp => exp.id === id);
                if (expense) Modals.showExpenseDetail(expense);
            });
        });
    },

    applyFilters: () => {
        const trip = state.trips.find(t => t.id === state.activeTrip);
        if (!trip) return;

        let expenses = state.expenses.filter(e => e.tripId === trip.id);

        const category = $('#filter-category').value;
        const paidBy = $('#filter-paid-by').value;

        if (category) expenses = expenses.filter(e => e.category === category);
        if (paidBy) expenses = expenses.filter(e => e.paidBy === paidBy);

        $('#expense-list-full').innerHTML = Expenses.renderList(expenses);
        $('#total-expenses-count').textContent = expenses.length;
        $('#total-expenses-amount').textContent = Utils.formatCurrency(
            expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
        );

        Expenses.bindItemEvents();
    },

    renderList: (expenses) => {
        if (expenses.length === 0) {
            return '<p style="color:var(--text-muted);text-align:center;padding:40px;">No expenses found</p>';
        }

        return `<div class="expense-list">${expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(exp => `
            <div class="expense-item" data-id="${exp.id}">
                <div class="expense-icon" style="background:${Utils.getCategoryColor(exp.category)}20;color:${Utils.getCategoryColor(exp.category)}">
                    ${Utils.getCategoryIcon(exp.category)}
                </div>
                <div class="expense-info">
                    <div class="expense-title">${exp.description}</div>
                    <div class="expense-meta">${Utils.formatDateTime(exp.date)}</div>
                </div>
                <div class="expense-amount">
                    <div class="amount">${Utils.formatCurrency(exp.amount)}</div>
                    <div class="paid-by">by ${exp.paidBy}</div>
                </div>
            </div>
        `).join('')}</div>`;
    }
};
