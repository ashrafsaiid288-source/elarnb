/**
 * Dashboard View Controller
 */

window.dashboardController = {
    chartInstance: null,

    init: async function(container) {
        container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <h2 class="view-title">Dashboard</h2>
                </div>
            </div>
            
            <div class="dashboard-grid">
                <!-- Receipts Card -->
                <div class="summary-card" id="card-receipts">
                    <h3>Receipt</h3>
                    <div class="huge-number" id="dash-receipt-pending">0</div>
                    <div class="stat-line">
                        <span>Late</span>
                        <span id="dash-receipt-late" class="text-error">0</span>
                    </div>
                    <div class="stat-line">
                        <span>Total Operations</span>
                        <span id="dash-receipt-total">0</span>
                    </div>
                </div>

                <!-- Deliveries Card -->
                <div class="summary-card" id="card-deliveries">
                    <h3>Delivery</h3>
                    <div class="huge-number" id="dash-delivery-pending">0</div>
                    <div class="stat-line">
                        <span>Late</span>
                        <span id="dash-delivery-late" class="text-error">0</span>
                    </div>
                    <div class="stat-line">
                        <span>Waiting</span>
                        <span id="dash-delivery-waiting">0</span>
                    </div>
                    <div class="stat-line">
                        <span>Total Operations</span>
                        <span id="dash-delivery-total">0</span>
                    </div>
                </div>
            </div>

            <div class="table-container" style="margin-top: 1.5rem;">
                <div style="padding: 1rem; border-bottom: 1px solid var(--border); font-weight: 600;">
                    Recent Activity (Last 10)
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Type</th>
                            <th>Contact</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Quantity</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="dash-activity-tbody">
                        <tr><td colspan="7" class="text-center text-muted">Loading activity...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Analytics Chart -->
            <div class="table-container dash-chart-container" style="margin-top: 1.5rem; padding: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <span style="font-weight: 600; font-size: 1rem;">📊 Stock Movement Analytics</span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary chart-filter-btn active" data-type="all">All</button>
                        <button class="btn btn-secondary chart-filter-btn" data-type="Receipt">Receipts</button>
                        <button class="btn btn-secondary chart-filter-btn" data-type="Delivery">Deliveries</button>
                        <button class="btn btn-secondary chart-filter-btn" data-type="Transfer">Transfers</button>
                    </div>
                </div>
                <div style="position: relative; height: 280px;">
                    <canvas id="dash-chart"></canvas>
                </div>
                <p style="text-align: center; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
                    Last 30 days of stock movement activity
                </p>
            </div>
        `;

        this.attachListeners();
        this.fetchData();
    },

    attachListeners: function() {
        document.getElementById('card-receipts').addEventListener('click', () => window.appRouter.loadRoute('receipts'));
        document.getElementById('card-deliveries').addEventListener('click', () => window.appRouter.loadRoute('deliveries'));
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        
        try {
            // Fetch Receipts stats
            const recSnap = await window.fbDb.collection('receipts').get();
            let recPending = 0, recLate = 0;
            const todayStr = new Date().toISOString().split('T')[0];
            
            recSnap.forEach(doc => {
                const data = doc.data();
                if (data.status === 'Draft' || data.status === 'Ready') {
                    recPending++;
                    if (data.scheduleDate && data.scheduleDate < todayStr) recLate++;
                }
            });
            
            document.getElementById('dash-receipt-pending').textContent = recPending;
            document.getElementById('dash-receipt-late').textContent = recLate;
            document.getElementById('dash-receipt-total').textContent = recSnap.size;

            // Fetch Deliveries stats
            const delSnap = await window.fbDb.collection('deliveries').get();
            let delPending = 0, delLate = 0, delWaiting = 0;
            
            delSnap.forEach(doc => {
                const data = doc.data();
                if (['Draft', 'Waiting', 'Ready'].includes(data.status)) {
                    delPending++;
                    if (data.scheduleDate && data.scheduleDate < todayStr) delLate++;
                    if (data.status === 'Waiting') delWaiting++;
                }
            });
            
            document.getElementById('dash-delivery-pending').textContent = delPending;
            document.getElementById('dash-delivery-late').textContent = delLate;
            document.getElementById('dash-delivery-waiting').textContent = delWaiting;
            document.getElementById('dash-delivery-total').textContent = delSnap.size;

            // Fetch Recent Ledger Activity
            const ledgerSnap = await window.fbDb.collection('ledger')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
                
            const tbody = document.getElementById('dash-activity-tbody');
            tbody.innerHTML = '';
            
            if (ledgerSnap.empty) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No recent activity</td></tr>';
            } else {
                ledgerSnap.forEach(doc => {
                    const data = doc.data();
                    const tr = document.createElement('tr');
                    
                    if (data.qtyChange > 0) tr.classList.add('row-in');
                    else if (data.qtyChange < 0) tr.classList.add('row-out');
                    
                    const qtyStr = data.qtyChange > 0 ? `+${data.qtyChange}` : data.qtyChange.toString();
                    
                    tr.innerHTML = `
                        <td class="font-weight-600">${data.reference}</td>
                        <td>${data.type}</td>
                        <td>${data.contact || '-'}</td>
                        <td>${data.from || '-'}</td>
                        <td>${data.to || '-'}</td>
                        <td>${qtyStr}</td>
                        <td><span class="badge badge-${data.status.toLowerCase()}">${data.status}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            // Build Chart from ALL ledger entries (last 30 days)
            this.buildChart(null);

            // Wire filter buttons
            document.querySelectorAll('.chart-filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.chart-filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const type = btn.dataset.type === 'all' ? null : btn.dataset.type;
                    this.buildChart(type);
                });
            });

        } catch (error) {
            console.error("Dashboard fetch error:", error);
            utils.showToast("Error loading dashboard data", "error");
        }
    },

    buildChart: async function(filterType) {
        if (!window.fbDb) return;
        try {
            // Get all ledger entries
            let query = window.fbDb.collection('ledger').orderBy('timestamp', 'desc').limit(200);
            const snap = await query.get();

            // Group by date (last 30 days)
            const today = new Date();
            const dateMap = {};
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const key = d.toISOString().split('T')[0];
                dateMap[key] = { in: 0, out: 0 };
            }

            snap.forEach(doc => {
                const data = doc.data();
                if (filterType && data.type !== filterType) return;
                let dateKey = null;
                if (data.timestamp && data.timestamp.toDate) {
                    dateKey = data.timestamp.toDate().toISOString().split('T')[0];
                }
                if (dateKey && dateMap[dateKey] !== undefined) {
                    if (data.qtyChange > 0) dateMap[dateKey].in += data.qtyChange;
                    else dateMap[dateKey].out += Math.abs(data.qtyChange);
                }
            });

            const labels = Object.keys(dateMap).map(d => {
                const dt = new Date(d);
                return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            });
            const inData = Object.values(dateMap).map(v => v.in);
            const outData = Object.values(dateMap).map(v => v.out);

            const canvas = document.getElementById('dash-chart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            // Destroy previous instance
            if (this.chartInstance) {
                this.chartInstance.destroy();
                this.chartInstance = null;
            }

            const isDark = document.body.classList.contains('dark-mode');
            const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
            const tickColor = isDark ? '#9CA3AF' : '#6B7280';

            this.chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Stock In',
                            data: inData,
                            backgroundColor: 'rgba(16, 185, 129, 0.7)',
                            borderColor: 'rgba(16, 185, 129, 1)',
                            borderWidth: 1.5,
                            borderRadius: 4,
                        },
                        {
                            label: 'Stock Out',
                            data: outData,
                            backgroundColor: 'rgba(239, 68, 68, 0.65)',
                            borderColor: 'rgba(239, 68, 68, 1)',
                            borderWidth: 1.5,
                            borderRadius: 4,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            labels: { color: tickColor, font: { family: 'Inter', size: 12 } }
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#1F2937' : '#fff',
                            titleColor: isDark ? '#F9FAFB' : '#111827',
                            bodyColor: isDark ? '#9CA3AF' : '#6B7280',
                            borderColor: isDark ? '#374151' : '#E5E7EB',
                            borderWidth: 1,
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: tickColor, font: { family: 'Inter', size: 10 }, maxRotation: 45 }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: gridColor },
                            ticks: { color: tickColor, font: { family: 'Inter', size: 11 }, precision: 0 }
                        }
                    }
                }
            });
        } catch(e) {
            console.error('Chart build error', e);
        }
    }
};
