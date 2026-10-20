/**
 * Products Controller with Modal Add/Edit, Delete, Real-Time Search & Barcode
 */
window.productsController = {
    allProducts: [],
    filteredProducts: [],

    init: async function(container) {
        this.container = container;
        if (window.utils && window.utils.showLoader) utils.showLoader();
        try {
            await this.loadProducts();
            this.renderLayout();
            this.attachEvents();
        } catch (err) {
            console.error("Error loading products:", err);
            if (window.utils && window.utils.showToast) {
                utils.showToast("خطأ أثناء تحميل المنتجات", "error");
            }
        } finally {
            if (window.utils && window.utils.hideLoader) utils.hideLoader();
        }
    },

    loadProducts: async function() {
        const db = window.fbDb;
        if (!db) return;

        try {
            const snap = await db.collection('products').get();
            this.allProducts = [];
            snap.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                this.allProducts.push(data);
            });

            // ترتيب زمني من الأحدث للأقدم
            this.allProducts.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tB - tA;
            });

            this.filteredProducts = [...this.allProducts];
        } catch (e) {
            console.error("Failed to load products from db:", e);
        }
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
                        <button id="btn-clear-search" class="icon-btn hidden" title="مسح البحث" style="font-size: 1rem; border:none; background:none; cursor:pointer;">✕</button>
                    </div>

                    <button class="btn btn-primary" id="btn-add-product">
                        <span>+ إضافة منتج جديد</span>
                    </button>
                </div>
            </div>

            <!-- شريط المعلومات -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; color: var(--text-muted); font-size: 0.88rem;">
                <span id="search-results-count">عرض ${this.filteredProducts.length} من أصل ${this.allProducts.length} صنف</span>
                <span style="font-size: 0.8rem; background: var(--surface-hover); padding: 0.2rem 0.6rem; border-radius: 6px; border: 1px solid var(--border);">
                    ⚡ جاهز لمسح الباركود مباشرة
                </span>
            </div>

            <!-- جدول المنتجات -->
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>الباركود / SKU</th>
                            <th>اسم الصنف</th>
                            <th>الفئة (Category)</th>
                            <th>سعر التكلفة</th>
                            <th>سعر البيع</th>
                            <th style="text-align: center; width: 170px;">الإجراءات</th>
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
            <tr>
                <td>
                    <span style="font-family: monospace; font-weight: 700; background: var(--surface-hover); padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid var(--border);">
                        ${p.sku || '-'}
                    </span>
                </td>
                <td><strong>${p.name || '-'}</strong></td>
                <td><span class="badge badge-draft">${p.category || 'عام'}</span></td>
                <td>${Number(p.perUnitCost || 0).toFixed(2)} ج.م</td>
                <td style="font-weight: 700; color: var(--primary);">${Number(p.salePrice || (p.perUnitCost ? p.perUnitCost * 1.25 : 0)).toFixed(2)} ج.م</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm btn-edit-product" data-id="${p.id}" style="margin-left: 4px;">تعديل</button>
                    <button class="btn btn-secondary btn-sm btn-delete-product text-error" data-id="${p.id}" style="color: var(--error); border-color: #fecdd3;">حذف</button>
                </td>
            </tr>
        `).join('');

        // ربط أزرار التعديل والحذف في الجدول
        tbody.querySelectorAll('.btn-edit-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const product = this.allProducts.find(x => x.id === id);
                if (product) this.openProductModal(product);
            });
        });

        tbody.querySelectorAll('.btn-delete-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                this.deleteProduct(id);
            });
        });
    },

    attachEvents: function() {
        const searchInput = document.getElementById('product-instant-search');
        const clearBtn = document.getElementById('btn-clear-search');

        if (searchInput) {
            searchInput.focus();

            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();

                if (query.length > 0) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }

                this.filteredProducts = this.allProducts.filter(p => {
                    const nameMatch = (p.name || '').toLowerCase().includes(query);
                    const skuMatch = (p.sku || '').toLowerCase().includes(query);
                    const catMatch = (p.category || '').toLowerCase().includes(query);
                    return nameMatch || skuMatch || catMatch;
                });

                this.renderTableRows();
            });

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

        // زر إضافة منتج جديد
        const addBtn = document.getElementById('btn-add-product');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openProductModal());
        }
    },

    /**
     * نافذة إضافة وتعديل المنتج (Modal Popup)
     */
    openProductModal: function(product = null) {
        const isEdit = !!product;
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="modal-overlay" id="product-modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${isEdit ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}</h3>
                        <button class="btn-close" id="btn-close-modal">&times;</button>
                    </div>
                    <form id="product-modal-form">
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="prod-name">اسم الصنف / المنتج <span style="color:var(--error)">*</span></label>
                                <input type="text" id="prod-name" value="${isEdit ? (product.name || '') : ''}" placeholder="مثال: شاشة سامسونج 27 بوصة" required>
                            </div>

                            <div class="form-group">
                                <label for="prod-sku">كود الباركود / SKU <span style="color:var(--error)">*</span></label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" id="prod-sku" value="${isEdit ? (product.sku || '') : ''}" placeholder="مثال: PRD-1001 أو امسح الباركود" required style="font-family: monospace; font-weight:700;">
                                    ${!isEdit ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-gen-sku" title="توليد كود عشوائي">توليد كود</button>` : ''}
                                </div>
                            </div>

                            <div class="form-grid" style="margin-bottom: 0;">
                                <div class="form-group">
                                    <label for="prod-cat">التصنيف (Category)</label>
                                    <input type="text" id="prod-cat" value="${isEdit ? (product.category || '') : ''}" placeholder="إلكترونيات، أدوات، مواد خام...">
                                </div>
                                <div class="form-group">
                                    <label for="prod-uom">وحدة القياس</label>
                                    <select id="prod-uom">
                                        <option value="قطعة" ${isEdit && product.uom === 'قطعة' ? 'selected' : ''}>قطعة (Pcs)</option>
                                        <option value="كرتونة" ${isEdit && product.uom === 'كرتونة' ? 'selected' : ''}>كرتونة (Box)</option>
                                        <option value="كيلو" ${isEdit && product.uom === 'كيلو' ? 'selected' : ''}>كيلو جرام (Kg)</option>
                                        <option value="متر" ${isEdit && product.uom === 'متر' ? 'selected' : ''}>متر (Meter)</option>
                                        <option value="لتر" ${isEdit && product.uom === 'لتر' ? 'selected' : ''}>لتر (Litre)</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-grid" style="margin-bottom: 0;">
                                <div class="form-group">
                                    <label for="prod-cost">سعر التكلفة (شراء)</label>
                                    <input type="number" step="0.01" id="prod-cost" value="${isEdit ? (product.perUnitCost || 0) : ''}" placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label for="prod-sale">سعر البيع المقترح</label>
                                    <input type="number" step="0.01" id="prod-sale" value="${isEdit ? (product.salePrice || 0) : ''}" placeholder="0.00">
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'حفظ التعديلات' : 'إضافة المنتج للمخزن'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // إغلاق المودال
        const closeModal = () => { modalContainer.innerHTML = ''; };
        document.getElementById('btn-close-modal').addEventListener('click', closeModal);
        document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
        document.getElementById('product-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'product-modal-overlay') closeModal();
        });

        // زر توليد باركود تلقائي
        const genBtn = document.getElementById('btn-gen-sku');
        if (genBtn) {
            genBtn.addEventListener('click', () => {
                const randomCode = 'SKU-' + Math.floor(100000 + Math.random() * 900000);
                document.getElementById('prod-sku').value = randomCode;
            });
        }

        // حفظ المنتج (إضافة أو تعديل)
        const form = document.getElementById('product-modal-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('prod-name').value.trim();
            const sku = document.getElementById('prod-sku').value.trim().toUpperCase();
            const category = document.getElementById('prod-cat').value.trim() || 'عام';
            const uom = document.getElementById('prod-uom').value;
            const perUnitCost = parseFloat(document.getElementById('prod-cost').value) || 0;
            const salePrice = parseFloat(document.getElementById('prod-sale').value) || (perUnitCost * 1.25);

            if (!name || !sku) {
                return utils.showToast("يرجى ملء اسم الصنف والباركود", "warning");
            }

            if (window.utils && window.utils.showLoader) utils.showLoader();

            try {
                const db = window.fbDb;
                const productData = {
                    name,
                    sku,
                    category,
                    uom,
                    perUnitCost,
                    salePrice,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (isEdit) {
                    await db.collection('products').doc(product.id).update(productData);
                    utils.showToast("تم تحديث بيانات المنتج بنجاح", "success");
                } else {
                    productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('products').add(productData);
                    utils.showToast("تمت إضافة المنتج الجديد بنجاح", "success");
                }

                // إبطال الكاش حتى يظهر المنتج الجديد في باقي الشاشات فوراً
                if (window.utils && window.utils.invalidateProductsCache) {
                    utils.invalidateProductsCache();
                }

                closeModal();
                await this.loadProducts();
                this.renderTableRows();

            } catch (err) {
                console.error("Save product error:", err);
                utils.showToast("حدث خطأ أثناء الحفظ: " + err.message, "error");
            } finally {
                if (window.utils && window.utils.hideLoader) utils.hideLoader();
            }
        });
    },

    /**
     * حذف منتج
     */
    deleteProduct: async function(id) {
        const product = this.allProducts.find(p => p.id === id);
        const name = product ? product.name : 'هذا المنتج';

        const confirmed = await utils.showConfirm(
            "تأكيد حذف المنتج",
            `هل أنت متأكد من رغبتك في حذف (${name})؟ لن يمكنك التراجع عن هذا الإجراء.`
        );

        if (!confirmed) return;

        if (window.utils && window.utils.showLoader) utils.showLoader();

        try {
            const db = window.fbDb;
            await db.collection('products').doc(id).delete();

            // إبطال كاش المنتجات
            if (window.utils && window.utils.invalidateProductsCache) {
                utils.invalidateProductsCache();
            }

            utils.showToast("تم حذف المنتج بنجاح", "success");
            await this.loadProducts();
            this.renderTableRows();

        } catch (err) {
            console.error("Delete product error:", err);
            utils.showToast("تعذر حذف المنتج: " + err.message, "error");
        } finally {
            if (window.utils && window.utils.hideLoader) utils.hideLoader();
        }
    }
};
