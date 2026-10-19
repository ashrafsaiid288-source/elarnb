/**
 * Products Controller (List + Create/Edit Modal - Arabic Version)
 */

window.productsController = {
    productsList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    translateCategory: function(cat) {
        switch (cat) {
            case 'Raw Materials': return 'مواد خام';
            case 'Finished Goods': return 'منتجات تامة الصنع';
            case 'Packaging': return 'مواد تعبئة وتغليف';
            case 'Consumables': return 'مستهلكات';
            default: return cat || '-';
        }
    },

    translateUom: function(uom) {
        switch (uom) {
            case 'pcs': return 'قطعة';
            case 'kg': return 'كجم';
            case 'ltr': return 'لتر';
            case 'm': return 'متر';
            case 'box': return 'صندوق / كرتونة';
            default: return uom || '-';
        }
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-product">إضافة منتج جديد</button>
                    <h2 class="view-title">قائمة المنتجات والأصناف</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="product-search" placeholder="بحث بالاسم أو كود الصنف (SKU)...">
                    </div>
                </div>
            </div>
            
            <div class="table-container" id="products-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>اسم المنتج</th>
                            <th>كود الصنف (SKU)</th>
                            <th>الفئة / التصنيف</th>
                            <th>وحدة القياس</th>
                            <th>الرصيد المتاح</th>
                            <th>حد إعادة الطلب</th>
                            <th>حالة المخزون</th>
                        </tr>
                    </thead>
                    <tbody id="products-tbody">
                        <tr><td colspan="7" class="text-center text-muted">جاري تحميل قائمة المنتجات...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        // Listeners
        document.getElementById('btn-new-product').addEventListener('click', () => this.openModal());
        
        document.getElementById('product-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.productsList.filter(p => 
                (p.name || '').toLowerCase().includes(val) || 
                (p.sku || '').toLowerCase().includes(val) ||
                (this.translateCategory(p.category) || '').toLowerCase().includes(val)
            );
            this.populateTable(filtered);
        });
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        utils.showLoader();
        try {
            // Need to join Products with Stock to get onHand aggregate
            const pSnap = await window.fbDb.collection('products').get();
            const sSnap = await window.fbDb.collection('stock').get();
            
            // Map stock by productId
            const stockMap = {};
            sSnap.forEach(doc => {
                const s = doc.data();
                if (!stockMap[s.productId]) stockMap[s.productId] = 0;
                stockMap[s.productId] += s.onHand;
            });
            
            this.productsList = [];
            pSnap.forEach(doc => {
                const p = doc.data();
                p.id = doc.id;
                p.onHand = stockMap[doc.id] || 0;
                this.productsList.push(p);
            });
            
            this.populateTable(this.productsList);
        } catch(e) {
            console.error(e);
            utils.showToast("خطأ أثناء تحميل بيانات المنتجات", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('products-tbody');
        tbody.innerHTML = '';
        
        if(data.length === 0) {
            utils.showEmptyState('products-table-container', 'لا توجد منتجات مسجلة.', 'إضافة منتج جديد', () => this.openModal());
            return;
        }
        
        data.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => this.openModal(p);
            
            let statusBadge = '';
            if (p.onHand === 0) {
                statusBadge = '<span class="badge badge-canceled">نفد من المخزن</span>';
            } else if (p.onHand <= p.reorderLevel) {
                statusBadge = '<span class="badge badge-ready">مخزون منخفض</span>';
            } else {
                statusBadge = '<span class="badge badge-done">متوفر بالمخزن</span>';
            }
            
            tr.innerHTML = `
                <td class="font-weight-600">${p.name || '-'}</td>
                <td><strong>${p.sku || '-'}</strong></td>
                <td>${this.translateCategory(p.category)}</td>
                <td>${this.translateUom(p.uom)}</td>
                <td><span style="font-weight:600;">${p.onHand}</span></td>
                <td>${p.reorderLevel !== undefined ? p.reorderLevel : 0}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    openModal: async function(product = null) {
        const isEdit = !!product;
        
        // Fetch warehouses for initial stock placement
        let whOptions = '';
        if (!isEdit) {
            const wSnap = await window.fbDb.collection('warehouses').get();
            wSnap.forEach(doc => {
                const w = doc.data();
                whOptions += `<option value="${doc.id}">${w.name} (${w.shortCode || ''})</option>`;
            });
        }
        
        // Modal DOM
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        modal.innerHTML = `
            <div class="modal-header">
                <div>${isEdit ? 'تعديل بيانات المنتج' : 'إضافة صنف جديد'}</div>
                <button class="icon-btn" id="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="product-form">
                    <div class="form-group">
                        <label>اسم الصنف / المنتج <span class="text-error">*</span></label>
                        <input type="text" id="p-name" value="${isEdit ? product.name : ''}" placeholder="أدخل اسم المنتج" required>
                    </div>
                    <div class="form-group">
                        <label>كود المنتج (SKU) - سيتم إنشاؤه تلقائياً إن تُرِك فارغاً</label>
                        <input type="text" id="p-sku" value="${isEdit ? product.sku : ''}" placeholder="مثال: RAW-1024">
                    </div>
                    
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: 0;">
                        <div class="form-group">
                            <label>الفئة / التصنيف <span class="text-error">*</span></label>
                            <input type="text" id="p-category" value="${isEdit ? product.category : 'Finished Goods'}" required list="category-list">
                            <datalist id="category-list">
                                <option value="Raw Materials">مواد خام</option>
                                <option value="Finished Goods">منتجات تامة الصنع</option>
                                <option value="Packaging">مواد تعبئة وتغليف</option>
                                <option value="Consumables">مستهلكات</option>
                            </datalist>
                        </div>
                        <div class="form-group">
                            <label>وحدة القياس <span class="text-error">*</span></label>
                            <select id="p-uom">
                                <option value="pcs" ${isEdit && product.uom==='pcs'?'selected':''}>قطعة (pcs)</option>
                                <option value="kg" ${isEdit && product.uom==='kg'?'selected':''}>كيلوجرام (kg)</option>
                                <option value="ltr" ${isEdit && product.uom==='ltr'?'selected':''}>لتر (ltr)</option>
                                <option value="m" ${isEdit && product.uom==='m'?'selected':''}>متر (meter)</option>
                                <option value="box" ${isEdit && product.uom==='box'?'selected':''}>صندوق / كرتونة (box)</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: 0;">
                        <div class="form-group">
                            <label>تكلفة الوحدة (ج.م)</label>
                            <input type="number" id="p-cost" value="${isEdit ? product.perUnitCost : 0}" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>حد إعادة الطلب (الحد الأدنى)</label>
                            <input type="number" id="p-reorder" value="${isEdit ? product.reorderLevel : 0}">
                        </div>
                    </div>

                    ${!isEdit ? `
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--border);">
                        <div class="form-group">
                            <label>رصيد أول المدة الافتتاحي</label>
                            <input type="number" id="p-init-stock" value="0" min="0">
                        </div>
                        <div class="form-group">
                            <label>المستودع (لإيداع الرصيد الافتتاحي)</label>
                            <select id="p-wh">${whOptions}</select>
                        </div>
                    </div>
                    ` : ''}
                </form>
            </div>
            <div class="modal-footer">
                ${isEdit ? '<button class="btn btn-danger" style="margin-left:auto" id="btn-del-product">حذف المنتج</button>' : ''}
                <button class="btn btn-secondary" id="modal-cancel">إلغاء</button>
                <button class="btn btn-primary" id="modal-save">حفظ البيانات</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.getElementById('modal-container').appendChild(overlay);
        
        // Listeners for Modal
        const closeMod = () => document.getElementById('modal-container').removeChild(overlay);
        document.getElementById('modal-close').addEventListener('click', closeMod);
        document.getElementById('modal-cancel').addEventListener('click', closeMod);
        
        document.getElementById('modal-save').addEventListener('click', async () => {
            if(!document.getElementById('product-form').checkValidity()) {
                document.getElementById('product-form').reportValidity();
                return;
            }
            
            utils.showLoader();
            const db = window.fbDb;
            
            try {
                const saveObj = {
                    name: document.getElementById('p-name').value.trim(),
                    sku: document.getElementById('p-sku').value.trim(),
                    category: document.getElementById('p-category').value.trim(),
                    uom: document.getElementById('p-uom').value,
                    perUnitCost: parseFloat(document.getElementById('p-cost').value) || 0,
                    reorderLevel: parseInt(document.getElementById('p-reorder').value) || 0,
                };
                
                // Auto-gen SKU if blank
                if(!saveObj.sku) {
                    const pre = saveObj.category.substring(0,3).toUpperCase() || 'PRD';
                    const rnd = Math.floor(1000 + Math.random() * 9000);
                    saveObj.sku = `${pre}-${rnd}`;
                }
                
                // Check SKU Uniqueness
                const skuCheck = await db.collection('products').where('sku', '==', saveObj.sku).get();
                if(!skuCheck.empty) {
                    if(!isEdit || skuCheck.docs[0].id !== product.id) {
                        throw new Error(`كود الصنف (SKU) "${saveObj.sku}" مستخدم بالفعل لمنتج آخر.`);
                    }
                }

                const batch = db.batch();

                if(isEdit) {
                    batch.update(db.collection('products').doc(product.id), saveObj);
                } else {
                    saveObj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    const newRef = db.collection('products').doc();
                    batch.set(newRef, saveObj);
                    
                    // Initial Stock Logic
                    const iStock = parseInt(document.getElementById('p-init-stock').value) || 0;
                    if(iStock > 0) {
                        const whId = document.getElementById('p-wh').value;
                        const sRef = db.collection('stock').doc();
                        batch.set(sRef, {
                            productId: newRef.id,
                            productName: saveObj.name,
                            warehouseId: whId,
                            locationId: "",
                            onHand: iStock,
                            freeToUse: iStock,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        
                        // Ledger Entry
                        const lRef = db.collection('ledger').doc();
                        batch.set(lRef, {
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            type: "Adjustment",
                            reference: "رصيد-افتتاحي",
                            productId: newRef.id,
                            productName: saveObj.name,
                            contact: "إدخال رصيد أولي",
                            from: "النظام",
                            to: "المستودع",
                            quantity: iStock,
                            qtyChange: iStock,
                            status: "Done"
                        });
                    }
                }
                
                await batch.commit();
                utils.showToast(isEdit ? "تم تحديث بيانات المنتج بنجاح" : "تمت إضافة الصنف بنجاح", "success");
                closeMod();
                this.fetchData();
                
            } catch (err) {
                console.error(err);
                utils.showToast(err.message, "error");
            } finally {
                utils.hideLoader();
            }
        });

        // Delete Logic
        if(isEdit) {
            document.getElementById('btn-del-product').addEventListener('click', async () => {
                if(product.onHand > 0) {
                    utils.showToast("لا يمكن حذف منتج لا يزال لديه رصيد متاح في المخزن.", "error");
                    return;
                }
                const c = await utils.showConfirm("حذف المنتج", `هل أنت متأكد من رغبتك في حذف الصنف "${product.name}"؟`);
                if(c) {
                    utils.showLoader();
                    await window.fbDb.collection('products').doc(product.id).delete();
                    utils.hideLoader();
                    utils.showToast("تم حذف المنتج بنجاح");
                    closeMod();
                    this.fetchData();
                }
            });
        }
    }
};
