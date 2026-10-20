/**
 * Stock Controller with Real-Time Instant Search, Barcode Support,
 * 1-Step Direct Incoming (الوارد), and Clear Movement History Log.
 */

window.stockController = {
    allStock: [],
    filteredStock: [],
    products: [],
    warehouses: [],

    init: async function(container) {
        this.container = container;
        this.renderLayout();
        await this.fetchData();
        this.attachSearchEvents();
    },

    renderLayout: function() {
        this.container.innerHTML = `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                <div class="view-header-left">
                    <h2 class="view-title" style="margin:0; font-size:1.5rem; font-weight:800;">المخزون الحالي والأرصدة</h2>
                </div>
                <div class="view-header-right" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <!-- حقل البحث الفوري والباركود -->
                    <div class="search-container expanded" style="display:flex; align-items:center; background:var(--surface-hover); border:1px solid var(--border); border-radius:8px; padding:0.4rem 0.8rem;">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:var(--text-muted); margin-left: 6px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input type="text" id="stock-instant-search" placeholder="ابحث بالاسم، أو امسح الباركود / SKU..." autocomplete="off" style="border:none; background:transparent; outline:none; width:220px; font-size:0.9rem;">
                        <button id="btn-clear-stock-search" class="icon-btn hidden" title="مسح البحث" style="font-size: 1rem; border:none; background:none; cursor:pointer;">✕</button>
                    </div>

                    <!-- أزرار الإجراءات السريعة -->
                    <button class="btn btn-secondary" onclick="stockController.openMovesHistoryModal()" style="display:inline-flex; align-items:center; gap:6px; padding:0.5rem 1rem; border-radius:8px; cursor:pointer; font-weight:600;">
                        <span>📋</span>
                        <span>سجل الحركات</span>
                    </button>

                    <button class="btn btn-primary" onclick="stockController.openIncomingModal()" style="display:inline-flex; align-items:center; gap:6px; padding:0.5rem 1.2rem; border-radius:8px; cursor:pointer; font-weight:700; background:var(--primary); color:#fff; border:none;">
                        <span>⚡</span>
                        <span>+ وارد جديد (Incoming)</span>
                    </button>
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

            <!-- حاوية المودالز المنبثقة -->
            <div id="stock-modal-container"></div>
        `;
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        if (window.utils && window.utils.showLoader) utils.showLoader();

        try {
            const [stockSnap, products, warehouses] = await Promise.all([
                window.fbDb.collection('stock').get(),
                window.utils.getProducts ? window.utils.getProducts() : [],
                window.utils.getWarehouses ? window.utils.getWarehouses() : []
            ]);

            this.products = products || [];
            this.warehouses = warehouses || [];

            const prodMap = {};
            this.products.forEach(p => { prodMap[p.id] = p; });

            const whMap = {};
            this.warehouses.forEach(w => { whMap[w.id] = w.name; });

            this.allStock = [];
            stockSnap.forEach(doc => {
                const s = doc.data();
                const prod = prodMap[s.productId] || {};
                const whName = whMap[s.warehouseId] || 'المستودع الرئيسي';

                this.allStock.push({
                    id: doc.id,
                    productId: s.productId,
                    warehouseId: s.warehouseId,
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

    // ================== نافذة الوارد في خطوة واحدة (1-Step Incoming) ==================
    openIncomingModal: function() {
        const modalContainer = document.getElementById('stock-modal-container');
        if (!modalContainer) return;

        const defaultRef = 'IN-' + Math.floor(1000 + Math.random() * 9000);

        modalContainer.innerHTML = `
            <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.55); z-index:9999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(3px);">
                <div class="modal-card" style="background:#fff; border-radius:14px; width:95%; max-width:520px; padding:1.5rem; box-shadow:0 15px 40px rgba(0,0,0,0.2); direction:rtl; text-align:right;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:0.8rem; margin-bottom:1.2rem;">
                        <h3 style="margin:0; font-size:1.25rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                            <span>📦</span> استلام وارد جديد (Incoming)
                        </h3>
                        <button onclick="stockController.closeModal()" style="border:none; background:none; font-size:1.2rem; cursor:pointer; color:#888;">✕</button>
                    </div>

                    <form id="incoming-quick-form" onsubmit="event.preventDefault(); stockController.submitIncoming();">
                        <div style="margin-bottom:1rem;">
                            <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">الصنف المطلوب استلامه: <span style="color:red;">*</span></label>
                            <select id="incoming-product-id" required style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd; font-size:0.9rem;">
                                <option value="" disabled selected>-- اختاري الصنف من القائمة --</option>
                                ${this.products.map(p => `<option value="${p.id}">${p.name} (${p.sku || 'بدون كود'})</option>`).join('')}
                            </select>
                        </div>

                        <div style="margin-bottom:1rem;">
                            <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">المستودع المستلم: <span style="color:red;">*</span></label>
                            <select id="incoming-warehouse-id" required style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd; font-size:0.9rem;">
                                ${this.warehouses.length > 0 
                                    ? this.warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')
                                    : `<option value="main">المستودع الرئيسي</option>`
                                }
                            </select>
                        </div>

                        <div style="display:flex; gap:10px; margin-bottom:1rem;">
                            <div style="flex:1;">
                                <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">الكمية الواردة: <span style="color:red;">*</span></label>
                                <input type="number" id="incoming-qty" min="1" step="1" placeholder="مثال: 10" required style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd; font-weight:700; font-size:0.95rem;">
                            </div>
                            <div style="flex:1;">
                                <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">رقم المرجع (فاتورة / إذن):</label>
                                <input type="text" id="incoming-ref" value="${defaultRef}" placeholder="مثال: REC-102" required style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd; font-size:0.9rem;">
                            </div>
                        </div>

                        <div style="margin-bottom:1.4rem;">
                            <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">ملاحظات الشحنة / المورّد (اختياري):</label>
                            <input type="text" id="incoming-notes" placeholder="مثال: توريد مباشر من الورشة" style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd; font-size:0.9rem;">
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid #eee; padding-top:1rem;">
                            <button type="button" onclick="stockController.closeModal()" style="padding:0.65rem 1.2rem; border-radius:8px; border:1px solid #ccc; background:#f7f7f7; cursor:pointer;">إلغاء</button>
                            <button type="submit" id="btn-save-incoming" style="padding:0.65rem 1.4rem; border-radius:8px; border:none; background:#16a34a; color:#fff; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px;">
                                <span>⚡ إتمام الوارد وتحديث الرصيد فوراً</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    // ================== حفظ الوارد في خطوة واحدة بدون مسودة أو انتظار ==================
    submitIncoming: async function() {
        const prodId = document.getElementById('incoming-product-id').value;
        const whId = document.getElementById('incoming-warehouse-id').value;
        const qty = parseInt(document.getElementById('incoming-qty').value, 10);
        const refNo = document.getElementById('incoming-ref').value.trim() || 'IN-DIRECT';
        const notes = document.getElementById('incoming-notes').value.trim();
        const submitBtn = document.getElementById('btn-save-incoming');

        if (!prodId || !qty || qty <= 0) {
            if (window.utils && utils.showToast) utils.showToast("يرجى اختيار الصنف وإدخال كمية صحيحة", "error");
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = "جاري الحفظ والتحديث...";
        }

        try {
            const product = this.products.find(p => p.id === prodId) || {};
            const warehouse = this.warehouses.find(w => w.id === whId) || { name: 'المستودع الرئيسي' };

            // 1. البحث عن سجل المخزون الحالي للمنتج في هذا المستودع
            const stockQuery = await window.fbDb.collection('stock')
                .where('productId', '==', prodId)
                .where('warehouseId', '==', whId)
                .limit(1)
                .get();

            let newOnHand = qty;
            let stockDocRef;

            if (!stockQuery.empty) {
                // الصنف موجود بالمستودع: نزيد الرصيد فوراً
                const currentDoc = stockQuery.docs[0];
                stockDocRef = currentDoc.ref;
                const currentData = currentDoc.data();
                newOnHand = (Number(currentData.onHand) || 0) + qty;
                const newFree = (Number(currentData.freeToUse) || 0) + qty;

                await stockDocRef.update({
                    onHand: newOnHand,
                    freeToUse: newFree,
                    updatedAt: new Date().toISOString()
                });
            } else {
                // أول مرة يدخل الصنف هذا المستودع: إنشاء السجل فوراً
                stockDocRef = window.fbDb.collection('stock').doc();
                await stockDocRef.set({
                    productId: prodId,
                    warehouseId: whId,
                    productName: product.name || 'صنف جديد',
                    sku: product.sku || '',
                    onHand: qty,
                    freeToUse: qty,
                    createdAt: new Date().toISOString()
                });
            }

            // 2. تسجيل الحركة مباشرة في سجل الحركات بحالة "مكتمل / Done" بدون مسودات
            await window.fbDb.collection('stock_moves').add({
                date: new Date().toISOString(),
                reference: refNo,
                productId: prodId,
                productName: product.name || 'صنف',
                sku: product.sku || '-',
                warehouseId: whId,
                warehouseName: warehouse.name || 'المستودع الرئيسي',
                operationType: 'الوارد', // Incoming
                qtyChange: qty,         // التغير في الكمية بالموجب
                newOnHand: newOnHand,    // الرصيد بعد الحركة
                status: 'تم',           // Done
                notes: notes
            });

            if (window.utils && utils.showToast) {
                utils.showToast(`تم إتمام الوارد بنجاح! زاد الرصيد (+${qty}) برقم مرجع: ${refNo}`, "success");
            }

            this.closeModal();
            await this.fetchData(); // تحديث الأرصدة المعروضة على الفور

        } catch (error) {
            console.error("Error saving incoming stock:", error);
            if (window.utils && utils.showToast) utils.showToast("حدث خطأ أثناء حفظ الوارد", "error");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    // ================== نافذة سجل الحركات الواضحة والمفصلة ==================
    openMovesHistoryModal: async function() {
        const modalContainer = document.getElementById('stock-modal-container');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.55); z-index:9999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(3px);">
                <div class="modal-card" style="background:#fff; border-radius:14px; width:95%; max-width:850px; max-height:85vh; display:flex; flex-direction:column; padding:1.5rem; box-shadow:0 15px 40px rgba(0,0,0,0.2); direction:rtl; text-align:right;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:0.8rem; margin-bottom:1rem;">
                        <h3 style="margin:0; font-size:1.25rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                            <span>📋</span> سجل حركات المخزون (Stock Moves Log)
                        </h3>
                        <button onclick="stockController.closeModal()" style="border:none; background:none; font-size:1.2rem; cursor:pointer; color:#888;">✕</button>
                    </div>

                    <div style="overflow-y:auto; flex:1;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
                            <thead>
                                <tr style="background:#f8f9fa; border-bottom:2px solid #ddd; text-align:right;">
                                    <th style="padding:8px;">التاريخ والوقت</th>
                                    <th style="padding:8px;">رقم المرجع</th>
                                    <th style="padding:8px;">نوع الحركة</th>
                                    <th style="padding:8px;">اسم الصنف</th>
                                    <th style="padding:8px;">المستودع</th>
                                    <th style="padding:8px; text-align:center;">التغير في الكمية</th>
                                    <th style="padding:8px; text-align:center;">الرصيد بعد الحركة</th>
                                </tr>
                            </thead>
                            <tbody id="moves-log-tbody">
                                <tr><td colspan="7" style="text-align:center; padding:2rem; color:#888;">جاري جلب سجل الحركات...</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div style="border-top:1px solid #eee; padding-top:0.8rem; text-align:left;">
                        <button type="button" onclick="stockController.closeModal()" style="padding:0.5rem 1.2rem; border-radius:8px; border:1px solid #ccc; background:#f7f7f7; cursor:pointer;">إغلاق</button>
                    </div>
                </div>
            </div>
        `;

        try {
            const movesSnap = await window.fbDb.collection('stock_moves')
                .orderBy('date', 'desc')
                .limit(50)
                .get();

            const movesTbody = document.getElementById('moves-log-tbody');
            if (!movesTbody) return;

            if (movesSnap.empty) {
                movesTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#888;">لا توجد أي حركات مسجلة حتى الآن</td></tr>`;
                return;
            }

            movesTbody.innerHTML = movesSnap.docs.map(doc => {
                const m = doc.data();
                const isIncoming = (m.operationType === 'الوارد' || (m.qtyChange > 0));
                const changeColor = isIncoming ? '#16a34a' : '#dc2626';
                const changeSign = m.qtyChange > 0 ? `+${m.qtyChange}` : `${m.qtyChange}`;

                const dateStr = m.date ? new Date(m.date).toLocaleString('ar-EG', { dateStyle:'short', timeStyle:'short' }) : '-';

                return `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px; color:#555;">${dateStr}</td>
                        <td style="padding:8px;"><span style="font-family:monospace; font-weight:700; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${m.reference || '-'}</span></td>
                        <td style="padding:8px;"><span style="font-weight:700; color:${isIncoming ? '#16a34a' : '#2563eb'};">${m.operationType || 'الوارد'}</span></td>
                        <td style="padding:8px;"><strong>${m.productName || '-'}</strong></td>
                        <td style="padding:8px; color:#666;">${m.warehouseName || '-'}</td>
                        <td style="padding:8px; text-align:center; font-weight:800; font-size:0.95rem; color:${changeColor}; direction:ltr;">${changeSign}</td>
                        <td style="padding:8px; text-align:center; font-weight:700;">${m.newOnHand ?? '-'} وحدة</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error("Error fetching stock moves:", err);
            const movesTbody = document.getElementById('moves-log-tbody');
            if (movesTbody) {
                movesTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:red;">خطأ أثناء تحميل سجل الحركات</td></tr>`;
            }
        }
    },

    closeModal: function() {
        const modalContainer = document.getElementById('stock-modal-container');
        if (modalContainer) modalContainer.innerHTML = '';
    },

    attachSearchEvents: function() {
        const searchInput = document.getElementById('stock-instant-search');
        const clearBtn = document.getElementById('btn-clear-stock-search');

        if (searchInput) {
            searchInput.focus();

            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();

                if (query.length > 0) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }

                this.filteredStock = this.allStock.filter(item => {
                    const skuMatch = (item.sku || '').toLowerCase().includes(query);
                    const nameMatch = (item.name || '').toLowerCase().includes(query);
                    const whMatch = (item.warehouseName || '').toLowerCase().includes(query);
                    return skuMatch || nameMatch || whMatch;
                });

                this.renderTableRows();
            });

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
