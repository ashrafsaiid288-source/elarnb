/**
 * Stock Controller with Real-Time Instant Search & Barcode Support
 */

window.stockController = {
    allStock: [],
    filteredStock: [],

    init: async function(container) {
        this.container = container;
        this.renderLayout();
        await this.fetchData();
        this.attachSearchEvents();
    },

    renderLayout: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <h2 class="view-title">المخزون الحالي والأرصدة</h2>
                </div>
                <div class="view-header-right">
                    <!-- حقل البحث الفوري والباركود -->
                    <div class="search-container expanded">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--text-muted); margin-left: 6px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input type="text" id="stock-instant-search" placeholder="ابحث بالاسم، أو امسح الباركود / SKU..." autocomplete="off">
                        <button id="btn-clear-stock-search" class="icon-btn hidden" title="مسح البحث" style="font-size: 1rem; border:none; background:none; cursor:pointer;">✕</button>
                    </div>
                </div>
            </div>

            <!-- معلومات الفلترة الحالية وحالة الماسح -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; color: var(--text-muted); font-size: 0.88rem;">
                <span id="stock-count-label">جاري حصر الأرصدة...</span>
                <span style="font-size: 0.8rem; background: var(--surface-hover); padding: 0.25rem 0.65rem; border-radius: 6px; border: 1px solid var(--border);">
                    ⚡ يدعم المسح المباشر بماسح الباركود
                </span>
            </div>

            <!-- جدول الأرصدة الفعلي -->
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>الباركود / SKU</th>
                            <th>اسم الصنف</th>
                            <th>المستودع</th>
                            <th>الرصيد الفعلي (On Hand)</th>
                            <th>المتاح للصرف (Free)</th>
                            <th>حالة المخزون</th>
                        </tr>
                    </thead>
                    <tbody id="stock-tbody">
                        <tr><td colspan="6" class="text-center text-muted" style="padding: 2rem;">جاري تحميل أرصدة المخازن...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        if (window.utils && window.utils.showLoader) utils.showLoader();

        try {
            // جلب المخزون والمنتجات والمستودعات في نفس الوقت
            const [stockSnap, products, warehouses] = await Promise.all([
                window.fbDb.collection('stock').get(),
                window.utils.getProducts ? window.utils.getProducts() : [],
                window.utils.getWarehouses ? window.utils.getWarehouses() : []
            ]);

            // خرائط بيانات سريعة لربط الأسماء بالأكواد
            const prodMap = {};
            products.forEach(p => { prodMap[p.id] = p; });

            const whMap = {};
            warehouses.forEach(w => { whMap[w.id] = w.name; });

            this.allStock = [];
            stockSnap.forEach(doc => {
                const s = doc.data();
                const prod = prodMap[s.productId] || {};
                const whName = whMap[s.warehouseId] || 'المستودع الرئيسي';

                this.allStock.push({
                    id: doc.id,
                    sku: prod.sku || s.sku || '-',
                    name: prod.name || s.productName || 'صنف غير مسمى',
                    warehouseName: whName,
                    onHand: Number(s.onHand) || 0,
                    freeToUse: Number(s.freeToUse ?? s.onHand) || 0
                });
            });

            this.filteredStock = [...this.allStock];
            this.renderTableRows();

        } catch (err) {
            console.error("Stock loading error:", err);
            if (window.utils && window.utils.showToast) {
                utils.showToast("خطأ أثناء تحميل بيانات المخزون", "error");
            }
        } finally {
            if (window.utils && window.utils.hideLoader) utils.hideLoader();
        }
    },

    renderTableRows: function() {
        const tbody = document.getElementById('stock-tbody');
        const countLabel = document.getElementById('stock-count-label');
        if (!tbody) return;

        if (countLabel) {
            countLabel.textContent = `عرض ${this.filteredStock.length} من أصل ${this.allStock.length} صنف بالمخزن`;
        }

        if (this.filteredStock.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                        🔍 لم يتم العثور على أي صنف مطابق للبحث أو الباركود
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredStock.map(item => {
            const isLow = item.freeToUse <= 5;
            const isOut = item.freeToUse <= 0;

            let badgeHtml = `<span class="badge badge-done">متوفر</span>`;
            if (isOut) {
                badgeHtml = `<span class="badge badge-canceled">نفد من المخزن</span>`;
            } else if (isLow) {
                badgeHtml = `<span class="badge badge-ready">قارب على النفاد</span>`;
            }

            return `
                <tr>
                    <td>
                        <span style="font-family: monospace; font-weight: 700; background: var(--surface-hover); padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border);">
                            ${item.sku}
                        </span>
                    </td>
                    <td><strong>${item.name}</strong></td>
                    <td><span class="badge badge-draft">${item.warehouseName}</span></td>
                    <td style="font-weight: 700;">${item.onHand} وحدة</td>
                    <td style="font-weight: 800; color: ${isLow ? 'var(--error)' : 'var(--primary)'};">${item.freeToUse} وحدة</td>
                    <td>${badgeHtml}</td>
                </tr>
            `;
        }).join('');
    },

    attachSearchEvents: function() {
        const searchInput = document.getElementById('stock-instant-search');
        const clearBtn = document.getElementById('btn-clear-stock-search');

        if (searchInput) {
            // التركيز التلقائي على خانة البحث لتكون جاهزة للمسح المباشر
            searchInput.focus();

            // الاستماع اللحظي للكتابة أو مسح الباركود
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();

                if (query.length > 0) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }

                // فلترة فورية بالـ SKU أو اسم الصنف أو اسم المستودع
                this.filteredStock = this.allStock.filter(item => {
                    const skuMatch = (item.sku || '').toLowerCase().includes(query);
                    const nameMatch = (item.name || '').toLowerCase().includes(query);
                    const whMatch = (item.warehouseName || '').toLowerCase().includes(query);
                    return skuMatch || nameMatch || whMatch;
                });

                this.renderTableRows();
            });

            // مسح البحث عند الضغط على Escape
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    clearBtn.classList.add('hidden');
                    this.filteredStock = [...this.allStock];
                    this.renderTableRows();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.classList.add('hidden');
                searchInput.focus();
                this.filteredStock = [...this.allStock];
                this.renderTableRows();
            });
        }
    }
};
