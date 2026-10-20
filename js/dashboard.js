/**
 * Dashboard Controller with Low Stock Alert Card
 */
window.dashboardController = {
    lowStockThreshold: 5, // الحد الأدنى للتنبيه (يمكنك تغييره لأي رقم)
    lowStockItems: [],

    init: async function(container) {
        this.container = container;
        utils.showLoader();
        try {
            await this.loadDashboardData();
        } catch (error) {
            console.error("Dashboard error:", error);
            utils.showToast("خطأ أثناء تحميل بيانات لوحة التحكم", "error");
        } finally {
            utils.hideLoader();
        }
    },

    loadDashboardData: async function() {
        const db = window.fbDb;
        if (!db) return;

        // 1. جلب المنتجات والأرصدة
        const [productsSnap, stockSnap, receiptsSnap, deliveriesSnap] = await Promise.all([
            db.collection('products').get(),
            db.collection('stock').get(),
            db.collection('receipts').where('status', '==', 'Ready').get(),
            db.collection('deliveries').where('status', '==', 'Ready').get()
        ]);

        // تجميع كميات المخزون المتاحة لكل منتج
        const stockMap = {};
        stockSnap.forEach(doc => {
            const data = doc.data();
            stockMap[data.productId] = (stockMap[data.productId] || 0) + (Number(data.freeToUse) || 0);
        });

        // فحص المنتجات التي أوشكت على النفاد
        this.lowStockItems = [];
        productsSnap.forEach(doc => {
            const prod = doc.data();
            const currentQty = stockMap[doc.id] || 0;
            if (currentQty <= this.lowStockThreshold) {
                this.lowStockItems.push({
                    id: doc.id,
                    name: prod.name || 'منتج غير مسمى',
                    sku: prod.sku || '-',
                    qty: currentQty
                });
            }
        });

        // 2. بناء واجهة لوحة التحكم وكارت التنبيه
        this.renderUI(receiptsSnap.size, deliveriesSnap.size, productsSnap.size);

        // 3. إطلاق رسالة تنبيه فورية إذا كانت هناك نواقص
        if (this.lowStockItems.length > 0) {
            utils.showToast(`⚠️ تنبيه: يوجد ${this.lowStockItems.length} أصناف أوشكت على النفاد بالمخزن!`, "warning");
        }
    },

    renderUI: function(receiptsCount, deliveriesCount, totalProducts) {
        const lowStockCount = this.lowStockItems.length;

        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <h2 class="view-title">نظرة عامة على المخازن</h2>
                </div>
            </div>

            <!-- كروت المؤشرات الأساسية -->
            <div class="dashboard-grid">
                <!-- كارت الوارد -->
                <div class="summary-card" onclick="window.appRouter.loadRoute('receipts')">
                    <h3>أذون الاستلام (الوارد)</h3>
                    <div class="huge-number">${receiptsCount}</div>
                    <div class="stat-line">
                        <span>أذون جاهزة للاستلام</span>
                        <span class="badge badge-ready">${receiptsCount} أذون</span>
                    </div>
                </div>

                <!-- كارت المنصرف -->
                <div class="summary-card" onclick="window.appRouter.loadRoute('deliveries')">
                    <h3>أذون الصرف (المنصرف)</h3>
                    <div class="huge-number">${deliveriesCount}</div>
                    <div class="stat-line">
                        <span>طلبات جاهزة للتجهيز</span>
                        <span class="badge badge-waiting">${deliveriesCount} طلبات</span>
                    </div>
                </div>

                <!-- كارت تنبيه النواقص (Alert Card) -->
                <div class="summary-card" id="btn-show-low-stock" style="border-right: 4px solid var(--error); cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="color: var(--error);">تنبيه النواقص والعجز</h3>
                        <span class="badge ${lowStockCount > 0 ? 'badge-canceled' : 'badge-done'}">
                            ${lowStockCount > 0 ? 'مخزون منخفض' : 'المخزون آمن'}
                        </span>
                    </div>
                    <div class="huge-number" style="color: var(--error);">${lowStockCount}</div>
                    <div class="stat-line">
                        <span>أصناف رصيدها (5 أو أقل)</span>
                        <span style="font-weight: 700; color: var(--error);">اضغط لعرض النواقص</span>
                    </div>
                </div>

                <!-- إجمالي المنتجات -->
                <div class="summary-card" onclick="window.appRouter.loadRoute('products')">
                    <h3>إجمالي الأصناف المسجلة</h3>
                    <div class="huge-number">${totalProducts}</div>
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

        // إضافة أحداث الضغط لعرض وإخفاء قائمة النواقص
        const alertCard = document.getElementById('btn-show-low-stock');
        const detailsSection = document.getElementById('low-stock-details-section');
        const closeBtn = document.getElementById('btn-close-low-stock');
        const tbody = document.getElementById('low-stock-tbody');

        if (alertCard && detailsSection) {
            alertCard.addEventListener('click', () => {
                if (this.lowStockItems.length === 0) {
                    utils.showToast("المخزون ممتاز، لا توجد أي نواقص حالياً!", "success");
                    return;
                }

                // تعبئة الجدول
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
        }

        if (closeBtn && detailsSection) {
            closeBtn.addEventListener('click', () => {
                detailsSection.classList.add('hidden');
            });
        }
    }
};
