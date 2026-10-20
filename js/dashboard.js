/**
 * Dashboard Controller (Fail-Safe & Instant Render)
 */
window.dashboardController = {
    lowStockThreshold: 5,
    lowStockItems: [],

    init: async function(container) {
        this.container = container;
        
        // 1. رسم هيكل الكروت فوراً حتى لا تظهر الصفحة بيضاء نهائياً
        this.renderInitialLayout();

        // 2. جلب البيانات وتحديث الأرقام بأمان
        await this.loadDashboardData();
    },

    renderInitialLayout: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <h2 class="view-title">نظرة عامة على المخازن</h2>
                </div>
            </div>

            <!-- شبكة الكروت الأساسية -->
            <div class="dashboard-grid">
                <!-- كارت الوارد -->
                <div class="summary-card" onclick="window.appRouter.loadRoute('receipts')">
                    <h3>أذون الاستلام (الوارد)</h3>
                    <div class="huge-number" id="dash-receipts-count">...</div>
                    <div class="stat-line">
                        <span>أذون جاهزة للاستلام</span>
                        <span class="badge badge-ready" id="dash-receipts-badge">جاري الفحص</span>
                    </div>
                </div>

                <!-- كارت المنصرف -->
                <div class="summary-card" onclick="window.appRouter.loadRoute('deliveries')">
                    <h3>أذون الصرف (المنصرف)</h3>
                    <div class="huge-number" id="dash-deliveries-count">...</div>
                    <div class="stat-line">
                        <span>طلبات جاهزة للتجهيز</span>
                        <span class="badge badge-waiting" id="dash-deliveries-badge">جاري الفحص</span>
                    </div>
                </div>

                <!-- كارت تنبيه النواقص -->
                <div class="summary-card" id="btn-show-low-stock" style="border-right: 4px solid var(--error); cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="color: var(--error);">تنبيه النواقص والعجز</h3>
                        <span class="badge badge-canceled" id="dash-lowstock-badge">متابعة</span>
                    </div>
                    <div class="huge-number" style="color: var(--error);" id="dash-lowstock-count">0</div>
                    <div class="stat-line">
                        <span>أصناف رصيدها (5 أو أقل)</span>
                        <span style="font-weight: 700; color: var(--error);">اضغط لعرض النواقص</span>
                    </div>
                </div>

                <!-- إجمالي المنتجات -->
                <div class="summary-card" onclick="window.appRouter.loadRoute('products')">
                    <h3>إجمالي الأصناف المسجلة</h3>
                    <div class="huge-number" id="dash-products-count">...</div>
                    <div class="stat-line">
                        <span>قائمة المنتجات الكلية</span>
                        <span class="badge badge-draft">عرض الكتالوج</span>
                    </div>
                </div>
            </div>

            <!-- حاوية تفاصيل النواقص السريعة -->
            <div id="low-stock-details-section" class="table-container hidden">
                <div style="padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; background: #fff1f2; border-bottom: 1px solid #fecdd3;">
                    <strong style="color: #9f1239;">قائمة الأصناف التي قاربت على النفاد وتحتاج إعادة طلب فورية:</strong>
                    <button class="btn btn-secondary btn-sm" id="btn-close-low-stock">إغلاق الجدول</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>كود الصنف (SKU)</th>
                            <th>اسم الصنف</th>
                            <th>الرصيد المتبقي</th>
                            <th>حالة الطلب</th>
                        </tr>
                    </thead>
                    <tbody id="low-stock-tbody"></tbody>
                </table>
            </div>
        `;

        // إضافة أحداث كارت النواقص
        document.getElementById('btn-show-low-stock').addEventListener('click', () => {
            const detailsSection = document.getElementById('low-stock-details-section');
            const tbody = document.getElementById('low-stock-tbody');
            
            if (this.lowStockItems.length === 0) {
                return utils.showToast("المخزون ممتاز، لا توجد أي نواقص حالياً!", "success");
            }

            tbody.innerHTML = this.lowStockItems.map(item => `
                <tr>
                    <td><strong>${item.sku}</strong></td>
                    <td>${item.name}</td>
                    <td><span class="badge badge-canceled">${item.qty} قطع فقط</span></td>
                    <td><span style="color: var(--error); font-weight: 700;">يلزم عمل إذن استلام</span></td>
                </tr>
            `).join('');

            detailsSection.classList.remove('hidden');
            detailsSection.scrollIntoView({ behavior: 'smooth' });
        });

        document.getElementById('btn-close-low-stock').addEventListener('click', () => {
            document.getElementById('low-stock-details-section').classList.add('hidden');
        });
    },

    loadDashboardData: async function() {
        const db = window.fbDb;
        if (!db) return;

        try {
            // جلب البيانات مع تأمين ضد أخطاء الفلاتر
            const [productsSnap, stockSnap, receiptsSnap, deliveriesSnap] = await Promise.all([
                db.collection('products').get().catch(() => ({ size: 0, forEach: () => {} })),
                db.collection('stock').get().catch(() => ({ size: 0, forEach: () => {} })),
                db.collection('receipts').get().catch(() => ({ size: 0, docs: [] })),
                db.collection('deliveries').get().catch(() => ({ size: 0, docs: [] }))
            ]);

            // فلترة الأذون الجاهزة محلياً في الذاكرة لعدم الاعتماد على قواعد فايربيز المعقدة
            const readyReceipts = receiptsSnap.docs ? receiptsSnap.docs.filter(d => d.data().status === 'Ready').length : 0;
            const readyDeliveries = deliveriesSnap.docs ? deliveriesSnap.docs.filter(d => d.data().status === 'Ready').length : 0;

            // حساب أرصدة المنتجات
            const stockMap = {};
            stockSnap.forEach(doc => {
                const data = doc.data();
                stockMap[data.productId] = (stockMap[data.productId] || 0) + (Number(data.freeToUse || data.onHand) || 0);
            });

            // تحديد النواقص
            this.lowStockItems = [];
            productsSnap.forEach(doc => {
                const prod = doc.data();
                const currentQty = stockMap[doc.id] || 0;
                if (currentQty <= this.lowStockThreshold) {
                    this.lowStockItems.push({
                        id: doc.id,
                        name: prod.name || 'منتج',
                        sku: prod.sku || '-',
                        qty: currentQty
                    });
                }
            });

            // تحديث الأرقام داخل الواجهة المرسومة
            const pCountEl = document.getElementById('dash-products-count');
            const rCountEl = document.getElementById('dash-receipts-count');
            const dCountEl = document.getElementById('dash-deliveries-count');
            const lCountEl = document.getElementById('dash-lowstock-count');
            const rBadge = document.getElementById('dash-receipts-badge');
            const dBadge = document.getElementById('dash-deliveries-badge');
            const lBadge = document.getElementById('dash-lowstock-badge');

            if (pCountEl) pCountEl.textContent = productsSnap.size || 0;
            if (rCountEl) rCountEl.textContent = readyReceipts;
            if (dCountEl) dCountEl.textContent = readyDeliveries;
            if (lCountEl) lCountEl.textContent = this.lowStockItems.length;

            if (rBadge) rBadge.textContent = `${readyReceipts} أذون`;
            if (dBadge) dBadge.textContent = `${readyDeliveries} طلبات`;
            if (lBadge) {
                lBadge.textContent = this.lowStockItems.length > 0 ? 'نواقص حرجة' : 'آمن';
                lBadge.className = `badge ${this.lowStockItems.length > 0 ? 'badge-canceled' : 'badge-done'}`;
            }

            if (this.lowStockItems.length > 0) {
                utils.showToast(`⚠️ تنبيه: يوجد ${this.lowStockItems.length} أصناف قاربت على النفاد`, "warning");
            }

        } catch (err) {
            console.error("Dashboard calculation error:", err);
        }
    }
};
