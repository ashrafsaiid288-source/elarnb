/**
 * Products Controller with Instant Real-Time Search & Barcode Support
 */
window.productsController = {
    allProducts: [],
    filteredProducts: [],

    init: async function(container) {
        this.container = container;
        utils.showLoader();
        try {
            await this.loadProducts();
            this.renderLayout();
            this.attachEvents();
        } catch (err) {
            console.error("Error loading products:", err);
            utils.showToast("خطأ أثناء تحميل المنتجات", "error");
        } finally {
            utils.hideLoader();
        }
    },

    loadProducts: async function() {
        const db = window.fbDb;
        if (!db) return;

        const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
        this.allProducts = [];
        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            this.allProducts.push(data);
        });
        this.filteredProducts = [...this.allProducts];
    },

    renderLayout: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <h2 class="view-title">دليل المنتجات والأصناف</h2>
                </div>
                <div class="view-header-right">
                    <!-- حقل البحث الفوري والباركود -->
                    <div class="search-container expanded">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--text-muted); margin-left: 6px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input type="text" id="product-instant-search" placeholder="ابحث بالاسم أو امسح الباركود / SKU..." autocomplete="off">
                        <button id="btn-clear-search" class="icon-btn hidden" title="مسح البحث" style="font-size: 1rem;">✕</button>
                    </div>

                    <button class="btn btn-primary" id="btn-add-product">
                        <span>+ إضافة منتج جديد</span>
                    </button>
                </div>
            </div>

            <!-- معلومات الفلترة الفورية -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; color: var(--text-muted); font-size: 0.88rem;">
                <span id="search-results-count">عرض ${this.filteredProducts.length} من أصل ${this.allProducts.length} صنف</span>
                <span style="font-size: 0.8rem; background: var(--surface-hover); padding: 0.2rem 0.6rem; border-radius: 6px; border: 1px solid var(--border);">
                    ⚡ جاهز لمسح الباركود مباشرة
                </span>
            </div>

            <!-- جدول المنتجات العصرية -->
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>الباركود / SKU</th>
                            <th>اسم الصنف</th>
                            <th>الفئة (Category)</th>
                            <th>سعر التكلفة</th>
                            <th>سعر البيع</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="products-tbody"></tbody>
                </table>
            </div>
        `;

        this.renderTableRows();
    },

    renderTableRows: function() {
        const tbody = document.getElementById('products-tbody');
        const countEl = document.getElementById('search-results-count');
        if (!tbody) return;

        if (countEl) {
            countEl.textContent = `عرض ${this.filteredProducts.length} من أصل ${this.allProducts.length} صنف`;
        }

        if (this.filteredProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                        🔍 لم يتم العثور على أي منتج مطابق للبحث أو الباركود
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredProducts.map(p => `
            <tr class="clickable" data-id="${p.id}">
                <td>
                    <span style="font-family: monospace; font-weight: 700; background: var(--surface-hover); padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border);">
                        ${p.sku || '-'}
                    </span>
                </td>
                <td><strong>${p.name || '-'}</strong></td>
                <td><span class="badge badge-draft">${p.category || 'عام'}</span></td>
                <td>${Number(p.perUnitCost || 0).toFixed(2)} ج.م</td>
                <td style="font-weight: 700; color: var(--primary);">${Number(p.salePrice || (p.perUnitCost ? p.perUnitCost * 1.25 : 0)).toFixed(2)} ج.م</td>
                <td>
                    <button class="btn btn-secondary btn-sm btn-edit-product" data-id="${p.id}">تعديل</button>
                </td>
            </tr>
        `).join('');
    },

    attachEvents: function() {
        const searchInput = document.getElementById('product-instant-search');
        const clearBtn = document.getElementById('btn-clear-search');

        if (searchInput) {
            // التركيز التلقائي على حقل البحث ليكون جاهز للباركود
            searchInput.focus();

            // الفلترة الفورية اللحظية عند كتابة أي حرف أو قراءة الباركود
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();

                if (query.length > 0) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }

                // فلترة فورية بالاسم أو كود SKU أو التصنيف
                this.filteredProducts = this.allProducts.filter(p => {
                    const nameMatch = (p.name || '').toLowerCase().includes(query);
                    const skuMatch = (p.sku || '').toLowerCase().includes(query);
                    const catMatch = (p.category || '').toLowerCase().includes(query);
                    return nameMatch || skuMatch || catMatch;
                });

                this.renderTableRows();
            });

            // مسح البحث بزر Escape
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchInput.value = '';
                    clearBtn.classList.add('hidden');
                    this.filteredProducts = [...this.allProducts];
                    this.renderTableRows();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.classList.add('hidden');
                searchInput.focus();
                this.filteredProducts = [...this.allProducts];
                this.renderTableRows();
            });
        }

        // زر إضافة منتج
        const addBtn = document.getElementById('btn-add-product');
        if (addBtn && window.productsController.openProductModal) {
            addBtn.addEventListener('click', () => this.openProductModal());
        }
    }
};
