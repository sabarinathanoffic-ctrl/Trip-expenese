// ===== Itinerary Module =====
const Itinerary = {
    init: () => {
        Itinerary.bindEvents();
    },

    bindEvents: () => {
        const container = $('#itinerary-timeline');
        if (container) {
            // Clone to remove old listeners
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);

            newContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.itinerary-item');
                if (!item) return;

                const id = item.dataset.id;
                const activity = state.itinerary.find(i => i.id === id);
                if (activity) Modals.openItineraryModal(activity);
            });
        }

        const addBtn = $('#add-itinerary-btn');
        if (addBtn) addBtn.addEventListener('click', () => Modals.openItineraryModal());

        $$('.new-trip-trigger').forEach(btn => {
            btn.addEventListener('click', () => Modals.openTripModal());
        });
    },

    renderTimeline: (trip) => {
        const items = state.itinerary.filter(i => i.tripId === trip.id);

        if (items.length === 0) {
            return `
                <div class="empty-state glass-card">
                    <div class="empty-icon"><i class="fas fa-calendar-alt"></i></div>
                    <h2>No Activities Planned</h2>
                    <p>Start adding activities to your itinerary</p>
                </div>
            `;
        }

        // Group by date
        const grouped = {};
        items.forEach(item => {
            const date = item.date;
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(item);
        });

        // Sort dates
        const sortedDates = Object.keys(grouped).sort();

        return sortedDates.map((date, index) => {
            const dayItems = grouped[date].sort((a, b) => a.time.localeCompare(b.time));
            const dayNum = index + 1;

            return `
                <div class="itinerary-day">
                    <div class="itinerary-day-header">
                        <div class="itinerary-day-title">Day ${dayNum}</div>
                        <div class="itinerary-day-date">${Utils.formatDate(date)}</div>
                    </div>
                    <div class="itinerary-items">
                        ${dayItems.map(item => `
                            <div class="itinerary-item glass-card" data-id="${item.id}">
                                <div class="itinerary-time">${Utils.formatTime(item.time)}</div>
                                <div class="itinerary-title">${item.title}</div>
                                ${item.location ? `<div class="itinerary-location"><i class="fas fa-map-marker-alt"></i> ${item.location}</div>` : ''}
                                <span class="itinerary-type-badge">${Itinerary.getTypeLabel(item.type)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    getTypeLabel: (type) => {
        const labels = {
            sightseeing: '🏛️ Sightseeing',
            food: '🍽️ Dining',
            adventure: '🎢 Adventure',
            shopping: '🛍️ Shopping',
            travel: '✈️ Travel',
            accommodation: '🏨 Check-in',
            relaxation: '🏖️ Relaxation',
            other: '📍 Activity'
        };
        return labels[type] || '📍 Activity';
    }
};

// ===== Analytics Module =====
const Analytics = {
    charts: {},

    init: () => {
        setTimeout(() => Analytics.renderCharts(), 100);
    },

    renderContent: () => {
        const trip = state.activeTrip ? state.trips.find(t => t.id === state.activeTrip) : null;

        if (!trip) {
            return `
                <div class="empty-state glass-card">
                    <div class="empty-icon"><i class="fas fa-chart-pie"></i></div>
                    <h2>No Active Trip</h2>
                    <p>Create a trip to see analytics</p>
                    <button class="btn btn-primary new-trip-trigger">
                        <i class="fas fa-plus"></i> Create Trip
                    </button>
                </div>
            `;
        }

        const expenses = state.expenses.filter(e => e.tripId === trip.id);
        const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
        const days = Math.max(1, Utils.daysUntil(trip.endDate) * -1 + Utils.daysUntil(trip.startDate) * -1) || 1;
        const dailyAvg = totalSpent / Math.max(1, expenses.length > 0 ? days : 1);
        const savings = parseFloat(trip.budget) - totalSpent;

        return `
            <div class="analytics-cards">
                <div class="analytics-card glass-card">
                    <div class="analytics-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <div class="analytics-info">
                        <span class="analytics-label">Total Spent</span>
                        <span class="analytics-value">${Utils.formatCurrency(totalSpent)}</span>
                    </div>
                </div>
                <div class="analytics-card glass-card">
                    <div class="analytics-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c);">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="analytics-info">
                        <span class="analytics-label">Daily Average</span>
                        <span class="analytics-value">${Utils.formatCurrency(dailyAvg)}</span>
                    </div>
                </div>
                <div class="analytics-card glass-card">
                    <div class="analytics-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe);">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="analytics-info">
                        <span class="analytics-label">Transactions</span>
                        <span class="analytics-value">${expenses.length}</span>
                    </div>
                </div>
                <div class="analytics-card glass-card">
                    <div class="analytics-icon" style="background: linear-gradient(135deg, #43e97b, #38f9d7);">
                        <i class="fas fa-piggy-bank"></i>
                    </div>
                    <div class="analytics-info">
                        <span class="analytics-label">${savings >= 0 ? 'Under Budget' : 'Over Budget'}</span>
                        <span class="analytics-value">${Utils.formatCurrency(Math.abs(savings))}</span>
                    </div>
                </div>
            </div>
            
            <div class="charts-section">
                <div class="chart-container glass-card">
                    <h3>Spending by Category</h3>
                    <div class="chart-wrapper">
                        <canvas id="category-pie-chart"></canvas>
                    </div>
                </div>
                <div class="chart-container glass-card">
                    <h3>Spending by Person</h3>
                    <div class="chart-wrapper">
                        <canvas id="person-bar-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="top-categories glass-card">
                <h3>Top Categories</h3>
                <div class="category-bars" id="category-bars">
                    ${Analytics.renderCategoryBars(expenses)}
                </div>
            </div>
            
            <div class="member-balances glass-card">
                <h3>Settlement Summary</h3>
                <p class="balance-subtitle">Who owes whom</p>
                <div class="settlement-list" id="settlement-list">
                    ${Analytics.renderSettlements(trip, expenses)}
                </div>
            </div>
        `;
    },

    renderCharts: () => {
        const trip = state.activeTrip ? state.trips.find(t => t.id === state.activeTrip) : null;
        if (!trip) return;

        const expenses = state.expenses.filter(e => e.tripId === trip.id);

        // Category Pie Chart
        const categoryData = {};
        expenses.forEach(e => {
            categoryData[e.category] = (categoryData[e.category] || 0) + parseFloat(e.amount);
        });

        const pieCtx = document.getElementById('category-pie-chart');
        if (pieCtx && Object.keys(categoryData).length > 0) {
            if (Analytics.charts.pie) Analytics.charts.pie.destroy();
            Analytics.charts.pie = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categoryData).map(c => Utils.getCategoryIcon(c) + ' ' + c.charAt(0).toUpperCase() + c.slice(1)),
                    datasets: [{
                        data: Object.values(categoryData),
                        backgroundColor: Object.keys(categoryData).map(c => Utils.getCategoryColor(c)),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).getPropertyValue('--text-primary') } }
                    }
                }
            });
        }

        // Person Bar Chart
        const personData = {};
        if (trip.members) {
            trip.members.forEach(m => personData[m.name] = 0);
        }
        expenses.forEach(e => {
            personData[e.paidBy] = (personData[e.paidBy] || 0) + parseFloat(e.amount);
        });

        const barCtx = document.getElementById('person-bar-chart');
        if (barCtx && Object.keys(personData).length > 0) {
            if (Analytics.charts.bar) Analytics.charts.bar.destroy();
            Analytics.charts.bar = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(personData),
                    datasets: [{
                        label: 'Amount Paid',
                        data: Object.values(personData),
                        backgroundColor: Object.keys(personData).map(n => Utils.getAvatarColor(n).replace('linear-gradient(135deg, ', '').split(',')[0]),
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    },

    renderCategoryBars: (expenses) => {
        const categoryData = {};
        expenses.forEach(e => {
            categoryData[e.category] = (categoryData[e.category] || 0) + parseFloat(e.amount);
        });

        const sorted = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
        const max = sorted[0]?.[1] || 1;

        if (sorted.length === 0) {
            return '<p style="color:var(--text-muted);text-align:center;">No data yet</p>';
        }

        return sorted.slice(0, 5).map(([cat, amount]) => `
            <div class="category-bar-item">
                <div class="category-bar-header">
                    <span>${Utils.getCategoryIcon(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    <span>${Utils.formatCurrency(amount)}</span>
                </div>
                <div class="category-bar-fill">
                    <div class="category-bar-progress" style="width:${(amount / max) * 100}%;background:${Utils.getCategoryColor(cat)}"></div>
                </div>
            </div>
        `).join('');
    },

    renderSettlements: (trip, expenses) => {
        if (!trip.members || trip.members.length < 2) {
            return '<p style="color:var(--text-muted);text-align:center;">Need at least 2 members</p>';
        }

        const perPerson = expenses.reduce((s, e) => s + parseFloat(e.amount), 0) / trip.members.length;
        const balances = {};

        trip.members.forEach(m => {
            const paid = expenses.filter(e => e.paidBy === m.name).reduce((s, e) => s + parseFloat(e.amount), 0);
            balances[m.name] = paid - perPerson;
        });

        // Simple settlement algorithm
        const settlements = [];
        const debtors = Object.entries(balances).filter(([_, b]) => b < 0).sort((a, b) => a[1] - b[1]);
        const creditors = Object.entries(balances).filter(([_, b]) => b > 0).sort((a, b) => b[1] - a[1]);

        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const amount = Math.min(-debtor[1], creditor[1]);

            if (amount > 0.01) {
                settlements.push({ from: debtor[0], to: creditor[0], amount });
            }

            debtor[1] += amount;
            creditor[1] -= amount;

            if (Math.abs(debtor[1]) < 0.01) i++;
            if (Math.abs(creditor[1]) < 0.01) j++;
        }

        if (settlements.length === 0) {
            return '<p style="color:var(--text-muted);text-align:center;">All settled! 🎉</p>';
        }

        return settlements.map(s => `
            <div class="settlement-item">
                <div class="person-avatar" style="background:${Utils.getAvatarColor(s.from)};width:32px;height:32px;font-size:0.75rem;">
                    ${Utils.getInitials(s.from)}
                </div>
                <span>${s.from}</span>
                <i class="fas fa-arrow-right settlement-arrow"></i>
                <div class="person-avatar" style="background:${Utils.getAvatarColor(s.to)};width:32px;height:32px;font-size:0.75rem;">
                    ${Utils.getInitials(s.to)}
                </div>
                <span>${s.to}</span>
                <span class="settlement-amount">${Utils.formatCurrency(s.amount)}</span>
            </div>
        `).join('');
    }
};

// ===== AI Assistant Module =====
const AI = {
    init: () => {
        AI.bindEvents();
    },

    bindEvents: () => {
        const form = $('#ai-input-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = $('#ai-input');
                const message = input.value.trim();
                if (message) {
                    AI.sendMessage(message);
                    input.value = '';
                }
            });
        }

        $$('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                AI.handleQuickAction(action);
            });
        });
    },

    handleQuickAction: (action) => {
        const trip = state.activeTrip ? state.trips.find(t => t.id === state.activeTrip) : null;
        const dest = trip?.destination || 'your destination';

        const prompts = {
            weather: `What's the current weather like in ${dest}?`,
            spending: 'Analyze my spending patterns and give me insights',
            places: `What are the must-visit places in ${dest}?`,
            tips: 'Give me budget-saving tips for my trip'
        };

        if (prompts[action]) {
            AI.sendMessage(prompts[action]);
        }
    },

    addMessage: (content, isBot = false) => {
        const container = $('#ai-messages');
        const div = document.createElement('div');
        div.className = `ai-message ${isBot ? 'bot' : 'user'}`;
        div.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${isBot ? 'robot' : 'user'}"></i>
            </div>
            <div class="message-content">
                <p>${content}</p>
            </div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    sendMessage: async (message) => {
        AI.addMessage(message, false);

        const trip = state.activeTrip ? state.trips.find(t => t.id === state.activeTrip) : null;
        const expenses = trip ? state.expenses.filter(e => e.tripId === trip.id) : [];

        // Build context
        const context = {
            trip: trip ? {
                name: trip.name,
                destination: trip.destination,
                budget: trip.budget,
                startDate: trip.startDate,
                endDate: trip.endDate,
                members: trip.members?.map(m => m.name) || []
            } : null,
            totalSpent: expenses.reduce((s, e) => s + parseFloat(e.amount), 0),
            expenseCount: expenses.length,
            categories: [...new Set(expenses.map(e => e.category))]
        };

        if (!state.settings.geminiApiKey) {
            AI.addMessage('Please add your Gemini API key in Settings to use AI features. You can get a free key from Google AI Studio.', true);
            return;
        }

        try {
            AI.addMessage('<i class="fas fa-spinner fa-spin"></i> Thinking...', true);

            const prompt = `You are TripTrack AI, a helpful travel and expense management assistant.
            
Current trip context:
${JSON.stringify(context, null, 2)}

User question: ${message}

Please provide a helpful, concise response. If asking about weather, provide realistic estimates. If asking about spending, analyze the data provided. Format your response nicely.`;

            const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${state.settings.geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();

            // Remove loading message
            const messages = $('#ai-messages');
            messages.lastElementChild?.remove();

            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                AI.addMessage(data.candidates[0].content.parts[0].text.replace(/\n/g, '<br>'), true);
            } else {
                AI.addMessage('Sorry, I couldn\'t process that request. Please try again.', true);
            }
        } catch (err) {
            const messages = $('#ai-messages');
            messages.lastElementChild?.remove();
            AI.addMessage('Sorry, there was an error connecting to the AI service. Please check your API key.', true);
        }
    }
};

// ===== Modals Module =====
const Modals = {
    openTripModal: (trip = null) => {
        const isEdit = !!trip;
        const container = $('#modal-container');

        container.innerHTML = `
            <div class="modal open" id="trip-modal">
                <div class="modal-content glass-card">
                    <div class="modal-header">
                        <h2>${isEdit ? 'Edit Trip' : 'Create New Trip'}</h2>
                        <button class="modal-close"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="trip-form" class="modal-form">
                        <div class="form-group">
                            <label for="trip-name">Trip Name</label>
                            <input type="text" id="trip-name" placeholder="e.g., Goa Beach Trip" value="${trip?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="trip-destination">Destination</label>
                            <input type="text" id="trip-destination" placeholder="e.g., Goa, India" value="${trip?.destination || ''}" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="trip-start-date">Start Date</label>
                                <input type="date" id="trip-start-date" value="${trip?.startDate || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="trip-end-date">End Date</label>
                                <input type="date" id="trip-end-date" value="${trip?.endDate || ''}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="trip-budget">Total Budget (₹)</label>
                            <input type="number" id="trip-budget" placeholder="50000" value="${trip?.budget || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Trip Members</label>
                            <div class="members-input" id="members-input">
                                ${(trip?.members || [{ name: '', email: '', phone: '' }]).map((m, i) => `
                                    <div class="member-entry">
                                        <input type="text" class="member-name" placeholder="Name" value="${m.name}" required>
                                        <input type="email" class="member-email" placeholder="Email" value="${m.email || ''}">
                                        <input type="tel" class="member-phone" placeholder="Phone" value="${m.phone || ''}">
                                        <button type="button" class="btn-icon remove-member" style="${i === 0 ? 'display:none' : ''}">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="btn btn-outline btn-sm" id="add-member-btn">
                                <i class="fas fa-plus"></i> Add Member
                            </button>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline modal-cancel">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Create'} Trip
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        Modals.bindTripModalEvents(trip);
    },

    bindTripModalEvents: (existingTrip) => {
        const modal = $('#trip-modal');

        modal.querySelector('.modal-close').addEventListener('click', Modals.closeAll);
        modal.querySelector('.modal-cancel').addEventListener('click', Modals.closeAll);
        modal.addEventListener('click', (e) => { if (e.target === modal) Modals.closeAll(); });

        $('#add-member-btn').addEventListener('click', () => {
            const container = $('#members-input');
            const entry = document.createElement('div');
            entry.className = 'member-entry';
            entry.innerHTML = `
                <input type="text" class="member-name" placeholder="Name" required>
                <input type="email" class="member-email" placeholder="Email">
                <input type="tel" class="member-phone" placeholder="Phone">
                <button type="button" class="btn-icon remove-member"><i class="fas fa-times"></i></button>
            `;
            container.appendChild(entry);
            entry.querySelector('.remove-member').addEventListener('click', () => entry.remove());
        });

        $$('.remove-member').forEach(btn => {
            btn.addEventListener('click', () => btn.closest('.member-entry').remove());
        });

        $('#trip-form').addEventListener('submit', (e) => {
            e.preventDefault();

            const members = [];
            $$('.member-entry').forEach(entry => {
                const name = entry.querySelector('.member-name').value.trim();
                if (name) {
                    members.push({
                        name,
                        email: entry.querySelector('.member-email').value.trim(),
                        phone: entry.querySelector('.member-phone').value.trim()
                    });
                }
            });

            const tripData = {
                id: existingTrip?.id || Utils.generateId(),
                name: $('#trip-name').value,
                destination: $('#trip-destination').value,
                startDate: $('#trip-start-date').value,
                endDate: $('#trip-end-date').value,
                budget: $('#trip-budget').value,
                members,
                createdAt: existingTrip?.createdAt || new Date().toISOString()
            };

            if (existingTrip) {
                const index = state.trips.findIndex(t => t.id === existingTrip.id);
                if (index !== -1) state.trips[index] = tripData;
            } else {
                state.trips.push(tripData);
                state.activeTrip = tripData.id;
            }

            Storage.save();
            GoogleSheets.syncTrip(tripData);
            Modals.closeAll();
            Navigation.goTo('dashboard');
            Toast.show(existingTrip ? 'Trip updated!' : 'Trip created!', 'success');
        });
    },

    openItineraryModal: (item = null) => {
        const isEdit = !!item;
        const trip = state.trips.find(t => t.id === state.activeTrip);
        if (!trip) return;

        const container = $('#modal-container');
        container.innerHTML = `
            <div class="modal open" id="itinerary-modal">
                <div class="modal-content glass-card">
                    <div class="modal-header">
                        <h2>${isEdit ? 'Edit Activity' : 'Add Activity'}</h2>
                        <button class="modal-close"><i class="fas fa-times"></i></button>
                    </div>
                    <form id="itinerary-form" class="modal-form">
                        <div class="form-group">
                            <label for="itinerary-title">Activity Title</label>
                            <input type="text" id="itinerary-title" placeholder="e.g., Visit Beach" value="${item?.title || ''}" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="itinerary-date">Date</label>
                                <input type="date" id="itinerary-date" value="${item?.date || ''}" min="${trip.startDate}" max="${trip.endDate}" required>
                            </div>
                            <div class="form-group">
                                <label for="itinerary-time">Time</label>
                                <input type="time" id="itinerary-time" value="${item?.time || ''}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="itinerary-location">Location</label>
                            <input type="text" id="itinerary-location" placeholder="e.g., Baga Beach" value="${item?.location || ''}">
                        </div>
                        <div class="form-group">
                            <label for="itinerary-type">Type</label>
                            <select id="itinerary-type">
                                <option value="sightseeing" ${item?.type === 'sightseeing' ? 'selected' : ''}>🏛️ Sightseeing</option>
                                <option value="food" ${item?.type === 'food' ? 'selected' : ''}>🍽️ Food</option>
                                <option value="adventure" ${item?.type === 'adventure' ? 'selected' : ''}>🎢 Adventure</option>
                                <option value="shopping" ${item?.type === 'shopping' ? 'selected' : ''}>🛍️ Shopping</option>
                                <option value="travel" ${item?.type === 'travel' ? 'selected' : ''}>✈️ Travel</option>
                                <option value="accommodation" ${item?.type === 'accommodation' ? 'selected' : ''}>🏨 Check-in</option>
                                <option value="relaxation" ${item?.type === 'relaxation' ? 'selected' : ''}>🏖️ Relaxation</option>
                                <option value="other" ${item?.type === 'other' ? 'selected' : ''}>📍 Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="itinerary-notes">Notes</label>
                            <textarea id="itinerary-notes" placeholder="Details...">${item?.notes || ''}</textarea>
                        </div>
                        <div class="modal-actions">
                            ${isEdit ? '<button type="button" class="btn btn-danger" id="delete-itinerary"><i class="fas fa-trash"></i></button>' : ''}
                            <button type="button" class="btn btn-outline modal-cancel">Cancel</button>
                            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modal = $('#itinerary-modal');
        modal.querySelector('.modal-close').addEventListener('click', Modals.closeAll);
        modal.querySelector('.modal-cancel').addEventListener('click', Modals.closeAll);
        modal.addEventListener('click', (e) => { if (e.target === modal) Modals.closeAll(); });

        if (isEdit) {
            const deleteBtn = $('#delete-itinerary');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Delete this activity?')) {
                        state.itinerary = state.itinerary.filter(i => i.id !== item.id);
                        Storage.save();
                        Modals.closeAll();
                        Pages.render('itinerary');
                        Toast.show('Activity deleted', 'info');
                    }
                });
            }
        }

        $('#itinerary-form').addEventListener('submit', (e) => {
            e.preventDefault();

            const data = {
                id: item?.id || Utils.generateId(),
                tripId: trip.id,
                title: $('#itinerary-title').value,
                date: $('#itinerary-date').value,
                time: $('#itinerary-time').value,
                location: $('#itinerary-location').value,
                type: $('#itinerary-type').value,
                notes: $('#itinerary-notes').value
            };

            if (item) {
                const index = state.itinerary.findIndex(i => i.id === item.id);
                if (index !== -1) state.itinerary[index] = data;
            } else {
                state.itinerary.push(data);
            }

            Storage.save();
            Modals.closeAll();
            Pages.render('itinerary');
            Toast.show(item ? 'Activity updated!' : 'Activity added!', 'success');
        });
    },

    openExpenseModal: () => {
        const trip = state.trips.find(t => t.id === state.activeTrip);
        if (!trip) {
            Toast.show('Please select a trip first', 'error');
            return;
        }

        // Just navigate to dashboard where the expense form is
        Navigation.goTo('dashboard');
        setTimeout(() => {
            $('#expense-amount')?.focus();
        }, 300);
    },

    showExpenseDetail: (expense) => {
        const container = $('#modal-container');
        container.innerHTML = `
            <div class="modal open" id="expense-detail-modal">
                <div class="modal-content glass-card">
                    <div class="modal-header">
                        <h2>Expense Details</h2>
                        <button class="modal-close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-form">
                        <div style="text-align:center;margin-bottom:20px;">
                            <div class="expense-icon" style="width:64px;height:64px;margin:0 auto 12px;font-size:2rem;background:${Utils.getCategoryColor(expense.category)}20;color:${Utils.getCategoryColor(expense.category)};border-radius:16px;display:flex;align-items:center;justify-content:center;">
                                ${Utils.getCategoryIcon(expense.category)}
                            </div>
                            <h3 style="font-size:1.5rem;margin-bottom:4px;">${Utils.formatCurrency(expense.amount)}</h3>
                            <p style="color:var(--text-muted);">${expense.description}</p>
                        </div>
                        <div style="background:var(--bg-tertiary);padding:16px;border-radius:12px;">
                            <p style="display:flex;justify-content:space-between;margin-bottom:12px;">
                                <span style="color:var(--text-muted);">Category</span>
                                <span>${Utils.getCategoryIcon(expense.category)} ${expense.category}</span>
                            </p>
                            <p style="display:flex;justify-content:space-between;margin-bottom:12px;">
                                <span style="color:var(--text-muted);">Paid By</span>
                                <span>${expense.paidBy}</span>
                            </p>
                            <p style="display:flex;justify-content:space-between;">
                                <span style="color:var(--text-muted);">Date & Time</span>
                                <span>${Utils.formatDateTime(expense.date)}</span>
                            </p>
                        </div>
                        <div class="modal-actions" style="margin-top:20px;">
                            <button class="btn btn-danger" id="delete-expense"><i class="fas fa-trash"></i> Delete</button>
                            <button class="btn btn-primary modal-cancel">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = $('#expense-detail-modal');
        modal.querySelector('.modal-close').addEventListener('click', Modals.closeAll);
        modal.querySelector('.modal-cancel').addEventListener('click', Modals.closeAll);
        modal.addEventListener('click', (e) => { if (e.target === modal) Modals.closeAll(); });

        const deleteBtn = $('#delete-expense');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Delete this expense?')) {
                    state.expenses = state.expenses.filter(e => e.id !== expense.id);
                    Storage.save();
                    Modals.closeAll();
                    Pages.render(state.currentPage);
                    Toast.show('Expense deleted', 'info');
                }
            });
        }
    },

    closeAll: () => {
        $('#modal-container').innerHTML = '';
    }
};

// ===== Google Sheets Integration =====
const GoogleSheets = {
    syncTrip: async (trip) => {
        if (!state.settings.sheetId || !state.settings.apiKey) return;

        const values = [trip.id, trip.name, trip.destination, trip.startDate, trip.endDate, trip.budget, new Date().toISOString(), JSON.stringify(trip.members || [])];

        if (state.settings.scriptUrl) {
            try {
                await fetch(state.settings.scriptUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        sheetName: 'Trips',
                        headers: ['ID', 'Name', 'Destination', 'Start Date', 'End Date', 'Budget', 'Created At', 'Members'],
                        values: values
                    })
                });
                console.log('Trip synced via Script URL');
                return;
            } catch (e) { console.error('Script Sync Error:', e); }
        }

        try {
            const range = 'Trips!A:H';
            await fetch(`${CONFIG.SHEETS_API_URL}/${state.settings.sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${state.settings.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: [values] })
            });
        } catch (err) { console.error('Sheets Error:', err); }
    },

    syncExpense: async (expense) => {
        if (!state.settings.sheetId || !state.settings.apiKey) return;

        const values = [expense.id, expense.tripId, expense.amount, expense.category, expense.description, expense.date, expense.paidBy];

        if (state.settings.scriptUrl) {
            try {
                await fetch(state.settings.scriptUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        sheetName: 'Expenses',
                        headers: ['ID', 'Trip ID', 'Amount', 'Category', 'Description', 'Date', 'Paid By'],
                        values: values
                    })
                });
                console.log('Expense synced via Script URL');
                return;
            } catch (e) { console.error('Script Sync Error:', e); }
        }

        try {
            const range = 'Expenses!A:G';
            await fetch(`${CONFIG.SHEETS_API_URL}/${state.settings.sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${state.settings.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: [values] })
            });
        } catch (err) { console.error('Sheets Error:', err); }
    },

    loadFromSheets: async () => {
        if (!state.settings.sheetId || !state.settings.apiKey) {
            Toast.show('Please enter Sheet ID and API Key in Settings', 'warning');
            return;
        }

        Toast.show('Syncing with Google Sheets...', 'info');

        try {
            // Load Trips
            const tripsRes = await fetch(`${CONFIG.SHEETS_API_URL}/${state.settings.sheetId}/values/Trips!A2:H?key=${state.settings.apiKey}`);
            const tripsData = await tripsRes.json();

            if (tripsData.values) {
                const trips = tripsData.values.map(row => {
                    let members = [];
                    try {
                        members = row[7] ? JSON.parse(row[7]) : [];
                    } catch (e) {
                        console.error('Error parsing members JSON:', e);
                    }
                    return {
                        id: row[0],
                        name: row[1],
                        destination: row[2],
                        startDate: row[3],
                        endDate: row[4],
                        budget: row[5],
                        createdAt: row[6],
                        members: members
                    };
                });

                trips.forEach(t => {
                    const idx = state.trips.findIndex(local => local.id === t.id);
                    if (idx !== -1) {
                        const existing = state.trips[idx];
                        state.trips[idx] = {
                            ...existing,
                            ...t,
                            // Only overwrite members if cloud data actually has members or if local is empty
                            members: (t.members && t.members.length > 0) ? t.members : (existing.members && existing.members.length > 0 ? existing.members : [])
                        };
                    } else {
                        state.trips.push(t);
                    }
                });
            }

            // Load Expenses
            const expensesRes = await fetch(`${CONFIG.SHEETS_API_URL}/${state.settings.sheetId}/values/Expenses!A2:G?key=${state.settings.apiKey}`);
            const expensesData = await expensesRes.json();

            if (expensesData.values) {
                const expenses = expensesData.values.map(row => ({
                    id: row[0],
                    tripId: row[1],
                    amount: row[2],
                    category: row[3],
                    description: row[4],
                    date: row[5],
                    paidBy: row[6]
                }));

                expenses.forEach(e => {
                    const idx = state.expenses.findIndex(local => local.id === e.id);
                    if (idx !== -1) state.expenses[idx] = e;
                    else state.expenses.push(e);
                });
            }

            Storage.save();
            Pages.render(state.currentPage);
            Toast.show('Google Sheets sync complete!', 'success');
        } catch (err) {
            console.error('Sheets Load Error:', err);
            Toast.show('Failed to sync with Google Sheets', 'error');
        }
    },

    pushAllToSheets: async () => {
        if (!state.settings.scriptUrl) {
            Toast.show('Apps Script URL is required to push data', 'warning');
            return;
        }

        Toast.show('Pushing all data to Google Sheets...', 'info');

        try {
            // Push Trips
            for (const trip of state.trips) {
                await GoogleSheets.syncTrip(trip);
            }
            // Push Expenses
            for (const expense of state.expenses) {
                await GoogleSheets.syncExpense(expense);
            }
            Toast.show('Data pushed successfully!', 'success');
        } catch (err) {
            console.error('Push Error:', err);
            Toast.show('Failed to push data', 'error');
        }
    }
};


// ===== Settings Module =====
const Settings = {
    init: () => {
        Settings.bindEvents();
    },

    bindEvents: () => {
        const connectBtn = $('#connect-sheets-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                state.settings.sheetId = $('#sheet-id').value;
                state.settings.apiKey = $('#api-key').value;
                state.settings.scriptUrl = $('#script-url').value;
                Storage.save();
                Toast.show('Google Sheets settings saved!', 'success');
            });
        }

        const viewScriptBtn = $('#view-script-btn');
        if (viewScriptBtn) {
            viewScriptBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Settings.showScriptInstructions();
            });
        }

        const syncBtn = $('#sync-sheets-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => GoogleSheets.loadFromSheets());
        }

        const pushBtn = $('#push-sheets-btn');
        if (pushBtn) {
            pushBtn.addEventListener('click', () => GoogleSheets.pushAllToSheets());
        }

        const saveAiBtn = $('#save-ai-settings-btn');
        if (saveAiBtn) {
            saveAiBtn.addEventListener('click', () => {
                state.settings.geminiApiKey = $('#gemini-api-key').value;
                state.settings.weatherApiKey = $('#weather-api-key').value;
                Storage.save();
                Toast.show('AI settings saved!', 'success');
            });
        }

        const exportBtn = $('#export-data-btn');
        if (exportBtn) exportBtn.addEventListener('click', Storage.exportData);

        const importBtn = $('#import-data-btn');
        const importInput = $('#import-file-input');
        if (importBtn && importInput) {
            importBtn.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', (e) => {
                if (e.target.files[0]) Storage.importData(e.target.files[0]);
            });
        }

        const clearBtn = $('#clear-data-btn');
        if (clearBtn) clearBtn.addEventListener('click', Storage.clearAll);
    },

    showScriptInstructions: () => {
        const container = $('#modal-container');
        container.innerHTML = `
            <div class="modal open" id="script-help-modal">
                <div class="modal-content glass-card" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>Google Sheets Write Setup</h2>
                        <button class="modal-close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body" style="padding: 20px; overflow-y: auto; max-height: 70vh;">
                        <p>Google requires a small script to allow this app to write data directly to your sheet.</p>
                        <ol style="margin-left: 20px; margin-bottom: 20px;">
                            <li>Open your Google Sheet.</li>
                            <li>Go to <strong>Extensions > Apps Script</strong>.</li>
                            <li>Copy and paste the code below into the editor.</li>
                            <li>Click <strong>Deploy > New Deployment</strong>.</li>
                            <li>Select type <strong>Web App</strong>.</li>
                            <li>Set "Who has access" to <strong>Anyone</strong> (this is required).</li>
                            <li>Click <strong>Deploy</strong> and copy the <strong>Web App URL</strong>.</li>
                            <li>Paste that URL into the "Apps Script URL" field in Settings.</li>
                        </ol>
                        <pre style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; font-size: 0.8rem; overflow-x: auto;">
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(data.sheetName);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(data.sheetName);
    sheet.appendRow(data.headers);
  }
  sheet.appendRow(data.values);
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}
                        </pre>
                    </div>
                </div>
            </div>
        `;

        const modal = $('#script-help-modal');
        modal.querySelector('.modal-close').addEventListener('click', () => container.innerHTML = '');
        modal.addEventListener('click', (e) => { if (e.target === modal) container.innerHTML = ''; });
    }
};

// ===== App Initialization =====
const App = {
    init: () => {
        Storage.load();
        Theme.init();
        Navigation.init();
        Pages.render(state.currentPage);

        // Sync button
        $('#sync-btn').addEventListener('click', () => {
            GoogleSheets.loadFromSheets();
        });

        // Automatic Sync on Startup
        if (state.settings.sheetId && state.settings.apiKey) {
            GoogleSheets.loadFromSheets();
        }

        // Hide splash screen
        setTimeout(() => {
            $('#splash-screen').classList.add('hidden');
            $('#app').classList.remove('hidden');
        }, 1500);
    }
};

// Start the app
document.addEventListener('DOMContentLoaded', App.init);
