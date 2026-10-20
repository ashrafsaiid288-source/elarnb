/**
 * Dashboard Controller with Financial Valuation & Low Stock Alerts
 */
window.dashboardController = {
    lowStockThreshold: 5,
    lowStockItems: [],

    init: async function(container) {
        this.container = container;
        
        // 1. رسم هيكل الكروت فوراً لمنع الشاشة البيضاء
        this.renderInitialLayout();

        // 2. حساب المؤشرات المالية وجلب الأرقام في الخلفية
        await this.loadDashboardData();
    },

    // دالة لتنسيق الأرقام والعملة بوضوح
    formatCurrency: function(num) {
        return Number(num || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' ج.م';
    },

    renderInitialLayout: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <h2 class="view-title">نظرة عامة والتقييم المالي</h2>
                </div>
            </div>

            <!-- 1. شريط المؤشرات المالية التنفيذية (Financial Valuation Cards) -->
            <div class="dashboard-grid" style="margin-bottom: 1.5rem;">
                <!-- قيمة رأس المال المخزن (تكلفة الشراء) -->
                <div class="summary-card" style="border-top: 4px solid var(--primary); cursor: default;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>قيمة رأس المال المخزن</h3>
                        <span class="badge badge-draft">سعر التكلفة</span>
                    </div>
                    <div class="huge-number" id="dash-total-cost" style="color: var(--primary); font-size: 2.2rem;">...</div>
                    <div class="stat-line">
                        <span>إجمالي التكلفة الفعلية للبضاعة</span>
                        <span style="font-weight: 700; color: var(--text-muted);">رصيد المخزن</span>
                    </div>
                </div>

                <!-- القيمة السوقية للبضاعة (سعر البيع) -->
                <div class="summary-card" style="border-top: 4px solid var(--status-done); cursor: default;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>القيمة السوقية التقديرية</h3>
                        <span class="badge badge-done">سعر البيع</span>
                    </div>
                    <div class="huge-number" id="dash-total-sale" style="color: var(--status-done); font-size: 2.2rem;">...</div>
                    <div class="stat-line">
                        <span>العائد الإجمالي المتوقع</span>
                        <span style="font-weight: 700; color: var(--status-done);">عند التصفية</span>
                    </div>
                </div>

                <!-- هامش الربح الإجمالي المتوقع -->
                <div class="summary-card" style="border-top: 4px solid var(--status-waiting); cursor: default;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>الأرباح الكامنة بالمخزن</h3>
                        <span class="badge badge-waiting" id="dash-profit-margin">0%</span>
                    </div>
                    <div class="huge-number" id="dash-total-profit" style="color: var(--status-waiting); font-size: 2.2rem;">...</div>
                    <div class="stat-line">
                        <span>هامش الربح المتوقع</span>
                        <span style="font-weight: 700;">فارق البيع والتكلفة</span>
                    </div>
                </div>
            </div>

            <!-- 2. شبكة كروت الحركة والمخزون التشغيلي -->
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

                <!-- إجمالي المنتجات المسجلة -->
                <div class="summary-card" onclick="window.appRouter.loadRoute('products')">
                    <h3>إجمالي الأصناف المسجلة</h3>
                    <div class="huge-number" id="dash-products-count">...</div>
                    <div class="stat-line">
                        <span>قائمة المنتجات الكلية</span>
                        <span class="badge badge-draft">عرض الكتالوج</span>
                    </div>
                </div>
            </div>

            <!-- 3. حاوية تفاصيل النواقص السريعة -->
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
                            <th>تكلفة الوحدة</th>
                            <th>حالة الطلب</th>
                        </tr>
                    </thead>
                    <tbody id="low-stock-tbody"></tbody>
                </table>
            </div>
        `;

        // أحداث كارت النواقص
        const alertCard = document.getElementById('btn-show-low-stock');
        const detailsSection = document.getElementById('low-stock-details-section');
        const closeBtn = document.getElementById('btn-close-low-stock');
        const tbody = document.getElementById('low-stock-tbody');

        if (alertCard && detailsSection) {
            alertCard.addEventListener('click', () => {
                if (this.lowStockItems.length === 0) {
                    return utils.showToast("المخزون آمن بالكامل، لا توجد أي نواقص حالياً!", "success");
                }

                tbody.innerHTML = this.lowStockItems.map(item => `
                    <tr>
                        <td><strong>${item.sku}</strong></td>
                        <td>${item.name}</td>
                        <td><span class="badge badge-canceled">${item.qty} قطع فقط</span></td>
                        <td>${this.formatCurrency(item.cost)}</td>
                        <td><span style="color: var(--error); font-weight: 700;">يلزم عمل إذن استلام</span></td>
                    </tr>
                `).join('');

                detailsSection.classList.remove('hidden');
                detailsSection.scrollIntoView({ behavior: 'smooth' });
            });
        }

        if (closeBtn && detailsSection) {
            closeBtn.addEventListener('click', () => {
                detailsSection.classList.add('hidden');
            });
        }
    },

    loadDashboardData: async function() {
        const db = window.fbDb;
        if (!db) return;

        try {
            // جلب البيانات بشكل متوازي لتسريع وقت الاستجابة
            const [productsSnap, stockSnap, receiptsSnap, deliveriesSnap] = await Promise.all([
                db.collection('products').get().catch(() => ({ size: 0, forEach: () => {} })),
                db.collection('stock').get().catch(() => ({ size: 0, forEach: () => {} })),
                db.collection('receipts').get().catch(() => ({ size: 0, docs: [] })),
                db.collection('deliveries').get().catch(() => ({ size: 0, docs: [] }))
            ]);

            // تجميع أرصدة المخزون لكل منتج
            const stockMap = {};
            stockSnap.forEach(doc => {
                const data = doc.data();
                const pId = data.productId;
                const qty = Number(data.freeToUse ?? data.onHand) || 0;
                stockMap[pId] = (stockMap[pId] || 0) + qty;
            });

            // حساب المؤشرات المالية وفحص النواقص
            let totalCostValue = 0;
            let totalSaleValue = 0;
            this.lowStockItems = [];

            productsSnap.forEach(doc => {
                const prod = doc.data();
                const currentQty = stockMap[doc.id] || 0;
                const unitCost = Number(prod.perUnitCost) || 0;
                const unitSale = Number(prod.salePrice) || (unitCost > 0 ? unitCost * 1.25 : 0);

                totalCostValue += (currentQty * unitCost);
                totalSaleValue += (currentQty * unitSale);

                if (currentQty <= this.lowStockThreshold) {
                    this.lowStockItems.push({
                        id: doc.id,
                        name: prod.name || 'منتج غير مسمى',
                        sku: prod.sku || '-',
                        qty: currentQty,
                        cost: unitCost
                    });
                }
            });

            const totalProfit = totalSaleValue - totalCostValue;
            const profitMargin = totalCostValue > 0 ? ((totalProfit / totalCostValue) * 100).toFixed(1) : 0;

            const readyReceipts = receiptsSnap.docs ? receiptsSnap.docs.filter(d => d.data().status === 'Ready').length : 0;
            const readyDeliveries = deliveriesSnap.docs ? deliveriesSnap.docs.filter(d => d.data().status === 'Ready').length : 0;

            // تحديث قيم الكروت المالية
            const costEl = document.getElementById('dash-total-cost');
            const saleEl = document.getElementById('dash-total-sale');
            const profitEl = document.getElementById('dash-total-profit');
            const marginEl = document.getElementById('dash-profit-margin');

            if (costEl) costEl.textContent = this.formatCurrency(totalCostValue);
            if (saleEl) saleEl.textContent = this.formatCurrency(totalSaleValue);
            if (profitEl) profitEl.textContent = this.formatCurrency(totalProfit);
            if (marginEl) marginEl.textContent = `+${profitMargin}% ربح`;

            // تحديث الكروت التشغيلية
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
                lBadge.textContent = this.lowStockItems.length > 0 ? 'نواقص حرجة' : 'المخزون آمن';
                lBadge.className = `badge ${this.lowStockItems.length > 0 ? 'badge-canceled' : 'badge-done'}`;
            }

            if (this.lowStockItems.length > 0) {
                utils.showToast(`⚠️ تنبيه: يوجد ${this.lowStockItems.length} أصناف قاربت على النفاد بالمستودع`, "warning");
            }

        } catch (err) {
            console.error("Dashboard calculation error:", err);
            utils.showToast("تعذر احتساب بعض المؤشرات المالية للمخزون", "error");
        }
    }
};
