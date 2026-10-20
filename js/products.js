/**
     * نافذة إضافة وتعديل المنتج مع دعم الرصيد الافتتاحي الفوري
     */
    openProductModal: function(product = null) {
        const isEdit = !!product;
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;

        modalContainer.innerHTML = `
            <div class="modal-overlay" id="product-modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${isEdit ? 'تعديل بيانات المنتج' : 'تكويد منتج جديد وإدخال رصيده'}</h3>
                        <button class="btn-close" id="btn-close-modal">&times;</button>
                    </div>
                    <form id="product-modal-form">
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="prod-name">اسم الصنف / المنتج <span style="color:var(--error)">*</span></label>
                                <input type="text" id="prod-name" value="${isEdit ? (product.name || '') : ''}" placeholder="مثال: شاي العروسة كرتونة" required>
                            </div>

                            <div class="form-group">
                                <label for="prod-sku">كود الباركود / SKU <span style="color:var(--error)">*</span></label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" id="prod-sku" value="${isEdit ? (product.sku || '') : ''}" placeholder="امسح الباركود أو اكتب الكود" required style="font-family: monospace; font-weight:700;">
                                    ${!isEdit ? `<button type="button" class="btn btn-secondary btn-sm" id="btn-gen-sku">توليد تلقائي</button>` : ''}
                                </div>
                            </div>

                            <div class="form-grid" style="margin-bottom: 0;">
                                <div class="form-group">
                                    <label for="prod-cat">التصنيف (Category)</label>
                                    <input type="text" id="prod-cat" value="${isEdit ? (product.category || '') : ''}" placeholder="مواد غذائية، إلكترونيات...">
                                </div>
                                <div class="form-group">
                                    <label for="prod-uom">وحدة القياس الأساسية</label>
                                    <select id="prod-uom">
                                        <option value="قطعة" ${isEdit && product.uom === 'قطعة' ? 'selected' : ''}>قطعة (Pcs)</option>
                                        <option value="كرتونة" ${isEdit && product.uom === 'كرتونة' ? 'selected' : ''}>كرتونة (Box)</option>
                                        <option value="كيلو" ${isEdit && product.uom === 'كيلو' ? 'selected' : ''}>كيلو جرام (Kg)</option>
                                        <option value="متر" ${isEdit && product.uom === 'متر' ? 'selected' : ''}>متر (Meter)</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-grid" style="margin-bottom: 0;">
                                <div class="form-group">
                                    <label for="prod-cost">سعر التكلفة (شراء)</label>
                                    <input type="number" step="0.01" id="prod-cost" value="${isEdit ? (product.perUnitCost || 0) : ''}" placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label for="prod-sale">سعر البيع</label>
                                    <input type="number" step="0.01" id="prod-sale" value="${isEdit ? (product.salePrice || 0) : ''}" placeholder="0.00">
                                </div>
                            </div>

                            <!-- حقل الرصيد الافتتاحي (يظهر فقط عند إضافة منتج جديد) -->
                            ${!isEdit ? `
                            <div style="background: #f8fafc; border: 1.5px dashed var(--primary); padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <strong style="color: var(--primary); font-size: 0.9rem;">📦 الرصيد الافتتاحي الأولي (بالمخزن الآن)</strong>
                                    <span style="font-size: 0.75rem; color: var(--text-muted);">(اختياري)</span>
                                </div>
                                <div class="form-grid" style="margin-bottom: 0;">
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label for="prod-init-qty">الكمية الموجودة فعلياً</label>
                                        <input type="number" id="prod-init-qty" value="0" min="0" placeholder="مثلاً: 50">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label for="prod-init-wh">المستودع المستلم</label>
                                        <input type="text" id="prod-init-wh" value="المستودع الرئيسي" disabled>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">إلغاء</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'حفظ التعديلات' : 'حفظ الصنف وتوريد الرصيد'}</button>
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

        // توليد باركود تلقائي
        const genBtn = document.getElementById('btn-gen-sku');
        if (genBtn) {
            genBtn.addEventListener('click', () => {
                const randomCode = 'SKU-' + Math.floor(100000 + Math.random() * 900000);
                document.getElementById('prod-sku').value = randomCode;
            });
        }

        // حفظ المنتج والرصيد في قاعدة البيانات
        const form = document.getElementById('product-modal-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('prod-name').value.trim();
            const sku = document.getElementById('prod-sku').value.trim().toUpperCase();
            const category = document.getElementById('prod-cat').value.trim() || 'عام';
            const uom = document.getElementById('prod-uom').value;
            const perUnitCost = parseFloat(document.getElementById('prod-cost').value) || 0;
            const salePrice = parseFloat(document.getElementById('prod-sale').value) || (perUnitCost * 1.25);
            const initialQty = !isEdit ? (parseInt(document.getElementById('prod-init-qty')?.value) || 0) : 0;

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
                    
                    // استخدام Batch لكتابة المنتج ورصيده وسجل الحركة دفعة واحدة
                    const batch = db.batch();
                    const newProdRef = db.collection('products').doc();
                    batch.set(newProdRef, productData);

                    // إذا حدد المستخدم كمية أولية، يتم إنشاؤها فوراً في المخزون
                    if (initialQty > 0) {
                        const whSnap = await db.collection('warehouses').limit(1).get();
                        const whId = whSnap.empty ? 'default_warehouse' : whSnap.docs[0].id;

                        const stockRef = db.collection('stock').doc();
                        batch.set(stockRef, {
                            productId: newProdRef.id,
                            warehouseId: whId,
                            onHand: initialQty,
                            freeToUse: initialQty,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });

                        // تسجيل حركة رصيد افتتاحي في الـ Ledger
                        const ledgerRef = db.collection('ledger').doc();
                        batch.set(ledgerRef, {
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            type: "Initial Stock",
                            reference: "رصيد افتتاحي",
                            productId: newProdRef.id,
                            productName: name,
                            contact: "رصيد تأسيسي",
                            from: "تكويد مباشر",
                            to: "المستودع الرئيسي",
                            quantity: initialQty,
                            qtyChange: initialQty,
                            status: "Done"
                        });
                    }

                    await batch.commit();
                    utils.showToast(initialQty > 0 ? `تم تكويد المنتج وإضافة ${initialQty} ${uom} للمخزن` : "تمت إضافة المنتج بنجاح", "success");
                }

                // مسح الكاش لإظهار التحديث فوراً
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
    }
