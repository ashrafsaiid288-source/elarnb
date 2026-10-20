/**
 * Deliveries Controller (Outgoing Operations - Arabic Version with A4 Slip / Invoice Printing)
 */

window.deliveriesController = {
    deliveriesList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    translateStatus: function(status) {
        switch (status) {
            case 'Draft': return 'مسودة';
            case 'Waiting': return 'قيد الانتظار';
            case 'Ready': return 'جاهز للصرف';
            case 'Done': return 'مكتمل';
            case 'Canceled': return 'ملغي';
            default: return status || '-';
        }
    },

    translateOperationType: function(type) {
        switch (type) {
            case 'Delivery': return 'إذن صرف / تسليم';
            case 'Return': return 'مرتجع بضاعة';
            default: return type || '-';
        }
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-delivery">إذن صرف جديد</button>
                    <h2 class="view-title">أذون الصرف (المنصرف)</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="delivery-search" placeholder="بحث برقم الإذن أو العنوان / العميل...">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>رقم المرجع / الإذن</th>
                            <th>العميل / عنوان التسليم</th>
                            <th>تاريخ الصرف المقرر</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody id="deliveries-tbody">
                        <tr><td colspan="4" class="text-center text-muted">جاري تحميل أذون الصرف...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('btn-new-delivery').addEventListener('click', () => this.openForm());
        
        document.getElementById('delivery-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.deliveriesList.filter(d => 
                (d.reference || '').toLowerCase().includes(val) || 
                (d.deliveryAddress || '').toLowerCase().includes(val) || 
                (this.translateStatus(d.status) || '').toLowerCase().includes(val)
            );
            this.populateTable(filtered);
        });
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        utils.showLoader();
        try {
            const snap = await window.fbDb.collection('deliveries').orderBy('createdAt', 'desc').get();
            this.deliveriesList = [];
            snap.forEach(doc => {
                const d = doc.data();
                d.id = doc.id;
                this.deliveriesList.push(d);
            });
            this.populateTable(this.deliveriesList);
        } catch (e) {
            console.error(e);
            utils.showToast("خطأ أثناء تحميل بيانات أذون الصرف", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('deliveries-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">لا توجد أذون صرف مسجلة.</td></tr>';
            return;
        } 
        
        data.forEach(d => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => this.openForm(d);
            tr.innerHTML = `
                <td class="font-weight-600">${d.reference || 'مسودة'}</td>
                <td>${d.deliveryAddress || '-'}</td>
                <td>${utils.formatDate(d.scheduleDate)}</td>
                <td><span class="badge badge-${(d.status || '').toLowerCase()}">${this.translateStatus(d.status)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    },

    /**
     * دالة توليد وطباعة الفاتورة الرسمية A4
     */
    printSlip: function(delivery) {
        if (!delivery) return utils.showToast("لا توجد بيانات للطباعة", "error");

        const lines = delivery.lines || [];
        const isReturn = delivery.operationType === 'Return';
        const docTitle = isReturn ? "إذن مرتجع بضاعة / إشعار استرجاع" : "إذن صرف بضاعة / فاتورة تسليم";
        const contactLabel = isReturn ? "المورد / جهة المرتجع" : "العميل / عنوان التسليم";

        const totalQty = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

        const rowsHtml = lines.map((item, index) => {
            const label = item.productLabel || item.name || 'صنف غير محدد';
            const qty = item.quantity || 0;
            return `
                <tr>
                    <td style="text-align: center; font-weight: bold; width: 40px;">${index + 1}</td>
                    <td><strong>${label}</strong></td>
                    <td style="text-align: center; font-weight: 800; font-size: 14px; width: 130px;">${qty} وحدة</td>
                    <td style="text-align: center; width: 120px;">جاهز للتسليم</td>
                </tr>
            `;
        }).join('');

        const invoiceHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>طباعة ${delivery.reference || 'إذن صرف'}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                @page {
                    size: A4 portrait;
                    margin: 12mm 15mm;
                }
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                    font-family: 'Cairo', -apple-system, sans-serif;
                }
                body {
                    background: #fff;
                    color: #0f172a;
                    padding: 24px;
                    font-size: 13px;
                    line-height: 1.6;
                }
                .slip-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #0f172a;
                    padding-bottom: 16px;
                    margin-bottom: 20px;
                }
                .brand-name {
                    font-size: 24px;
                    font-weight: 900;
                    color: #4338ca;
                }
                .brand-sub {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 600;
                }
                .doc-title-box {
                    text-align: left;
                }
                .doc-title {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                }
                .doc-ref-badge {
                    display: inline-block;
                    background: #f1f5f9;
                    border: 1.5px solid #cbd5e1;
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-family: monospace;
                    font-size: 15px;
                    font-weight: 900;
                    color: #4338ca;
                    margin-top: 6px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1.2fr 1fr;
                    gap: 15px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 14px 18px;
                    margin-bottom: 24px;
                }
                .info-line {
                    display: flex;
                    margin-bottom: 6px;
                }
                .info-line:last-child {
                    margin-bottom: 0;
                }
                .info-label {
                    width: 130px;
                    color: #64748b;
                    font-weight: 700;
                }
                .info-value {
                    font-weight: 700;
                    color: #0f172a;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    border: 1px solid #cbd5e1;
                    padding: 10px 12px;
                    text-align: right;
                }
                th {
                    background: #f1f5f9;
                    color: #1e293b;
                    font-weight: 800;
                    font-size: 12px;
                }
                .total-box {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 30px;
                }
                .total-table {
                    width: 320px;
                    border: 1px solid #cbd5e1;
                }
                .total-table td {
                    padding: 8px 14px;
                    font-weight: 800;
                    font-size: 14px;
                }
                .signatures-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 20px;
                    margin-top: 40px;
                    padding-top: 24px;
                    border-top: 1px dashed #cbd5e1;
                    text-align: center;
                }
                .sig-box {
                    padding: 8px;
                }
                .sig-title {
                    font-weight: 800;
                    color: #334155;
                    margin-bottom: 45px;
                }
                .sig-line {
                    border-bottom: 1.5px solid #0f172a;
                    margin: 0 10px;
                }
                .sig-sub {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 600;
                    margin-top: 6px;
                }
                .footer-note {
                    text-align: center;
                    font-size: 11px;
                    color: #94a3b8;
                    margin-top: 30px;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="slip-header">
                <div>
                    <div class="brand-name">CoreInventory 📦</div>
                    <div class="brand-sub">إدارة المخازن والمستودعات والخدمات اللوجستية</div>
                </div>
                <div class="doc-title-box">
                    <div class="doc-title">${docTitle}</div>
                    <div class="doc-ref-badge">${delivery.reference || 'مسودة جديدة'}</div>
                </div>
            </div>

            <div class="info-grid">
                <div>
                    <div class="info-line">
                        <span class="info-label">${contactLabel}:</span>
                        <span class="info-value">${delivery.deliveryAddress || 'غير محدد'}</span>
                    </div>
                    <div class="info-line">
                        <span class="info-label">المستودع المصدر:</span>
                        <span class="info-value">المستودع الرئيسي</span>
                    </div>
                    <div class="info-line">
                        <span class="info-label">نوع العملية:</span>
                        <span class="info-value">${isReturn ? 'مرتجع بضاعة' : 'إذن صرف / تسليم'}</span>
                    </div>
                </div>
                <div>
                    <div class="info-line">
                        <span class="info-label">تاريخ الصرف:</span>
                        <span class="info-value">${delivery.scheduleDate || new Date().toISOString().split('T')[0]}</span>
                    </div>
                    <div class="info-line">
                        <span class="info-label">حالة الإذن:</span>
                        <span class="info-value" style="color: #059669;">${this.translateStatus(delivery.status)}</span>
                    </div>
                    <div class="info-line">
                        <span class="info-label">المسؤول عن الصرف:</span>
                        <span class="info-value">${delivery.responsible || 'مدير النظام'}</span>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th>اسم الصنف ومواصفاته (الباركود / SKU)</th>
                        <th style="width: 130px; text-align: center;">الكمية المصروفة</th>
                        <th style="width: 120px; text-align: center;">ملاحظة الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding: 20px;">لا توجد أصناف مدرجة في الإذن</td></tr>'}
                </tbody>
            </table>

            <div class="total-box">
                <table class="total-table">
                    <tr>
                        <td style="background: #f8fafc;">إجمالي عدد الوحدات المصروفة:</td>
                        <td style="text-align: left; color: #4338ca;">${totalQty} قطعة / وحدة</td>
                    </tr>
                </table>
            </div>

            <div class="signatures-grid">
                <div class="sig-box">
                    <div class="sig-title">أمين المستودع</div>
                    <div class="sig-line"></div>
                    <div class="sig-sub">التوقيع والاسم</div>
                </div>
                <div class="sig-box">
                    <div class="sig-title">المشرف / المراجع</div>
                    <div class="sig-line"></div>
                    <div class="sig-sub">التوقيع والاعتماد</div>
                </div>
                <div class="sig-box">
                    <div class="sig-title">المستلم / السائق</div>
                    <div class="sig-line"></div>
                    <div class="sig-sub">الاسم ورقم الهوية والتوقيع</div>
                </div>
            </div>

            <div class="footer-note">
                تم استخراج هذه الفاتورة آلياً عبر نظام CoreInventory - يُرجى مراجعة الأصناف بدقة قبل الاستلام.
            </div>
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=950');
        if (!printWindow) {
            return utils.showToast("يرجى السماح بالنوافذ المنبثقة (Popups) لإتمام عملية الطباعة", "warning");
        }

        printWindow.document.open();
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();

        printWindow.onload = function() {
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };
    },

    openForm: async function(delivery = null) {
        const isEdit = !!delivery;
        const status = isEdit ? delivery.status : 'Draft';
        const isReadOnly = (status === 'Done' || status === 'Canceled');

        this.container.innerHTML = `
            <div class="view-header" style="margin-bottom:var(--spacing-sm); border:none; padding-bottom:0;">
                <div class="view-header-left">
                    <button class="btn btn-secondary" id="btn-back">← رجوع</button>
                    ${status === 'Draft' ? `<button class="btn btn-primary" id="btn-mark-ready">تحديد كـ جاهز</button>` : ''}
                    <h2 class="view-title" style="margin-right:var(--spacing-md)">إذن صرف بضاعة</h2>
                </div>
            </div>
            
            <div class="doc-header" style="background:var(--surface); padding:var(--spacing-md); border:1px solid var(--border); border-bottom:none; border-radius:var(--border-radius) var(--border-radius) 0 0; margin-bottom:0; display:flex; align-items:center;">
                <div style="flex:1; display:flex; gap:8px; align-items:center;">
                    ${status === 'Ready' && !isReadOnly ? `<button class="btn btn-success" id="btn-validate" style="background:var(--status-done); color:white; border:none; padding:0.5rem 1rem; border-radius:4px;">اعتماد وصرف المخزون</button>` : ''}
                    
                    <!-- زر طباعة الفاتورة الرسمي -->
                    <button class="btn btn-secondary" id="btn-print" title="طباعة إذن الصرف والفاتورة المعتمدة">
                        🖨️ طباعة الفاتورة / الإذن
                    </button>
                    
                    ${!isReadOnly ? `<button class="btn btn-secondary" id="btn-cancel">إلغاء الإذن</button>` : ''}
                </div>
                
                <div class="status-pipeline">
                    <span class="step ${status === 'Draft' ? 'active' : ''}">مسودة</span> ←
                    <span class="step ${status === 'Waiting' ? 'active' : ''}">انتظار</span> ←
                    <span class="step ${status === 'Ready' ? 'active' : ''}">جاهز</span> ←
                    <span class="step ${status === 'Done' ? 'active' : ''}">مكتمل</span>
                </div>
            </div>

            <div class="form-document" style="border-top-left-radius:0; border-top-right-radius:0;">
                <div class="doc-ref text-muted" style="margin-bottom:var(--spacing-md)">${isEdit ? delivery.reference : 'جديد'}</div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>عنوان التسليم / العميل</label>
                        <input type="text" id="d-contact" value="${isEdit ? (delivery.deliveryAddress || '') : ''}" placeholder="اسم العميل أو عنوان الاستلام" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                    <div class="form-group">
                        <label>تاريخ الصرف المقرر</label>
                        <input type="date" id="d-date" value="${isEdit ? (delivery.scheduleDate || '') : new Date().toISOString().split('T')[0]}" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>المسؤول</label>
                        <input type="text" value="${isEdit ? delivery.responsible : (window.currentUser?.name || 'مدير النظام')}" disabled>
                    </div>
                    <div class="form-group">
                        <label>نوع العملية</label>
                        <select id="d-type" ${isReadOnly ? 'disabled' : ''}>
                            <option value="Delivery" ${isEdit && delivery.operationType==='Delivery'?'selected':''}>إذن صرف / تسليم</option>
                            <option value="Return" ${isEdit && delivery.operationType==='Return'?'selected':''}>مرتجع بضاعة</option>
                        </select>
                    </div>
                </div>

                <div class="table-container lines-table">
                    <table>
                        <thead>
                            <tr>
                                <th>المنتج / الصنف</th>
                                <th>الكمية المطلوبة</th>
                                ${!isReadOnly ? '<th>إجراء</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="d-lines-tbody"></tbody>
                        ${!isReadOnly ? `
                        <tfoot>
                            <tr>
                                <td colspan="3"><a href="#" id="add-d-line"> + إضافة صنف آخر للإذن</a></td>
                            </tr>
                        </tfoot>` : ''}
                    </table>
                </div>
                
                ${!isReadOnly ? `
                <div style="margin-top:var(--spacing-xl)">
                    <button class="btn btn-primary" id="btn-save-draft">حفظ التغييرات</button>
                </div>` : ''}
            </div>
        `;

        let productOptions = [];
        try {
            const pSnap = await window.fbDb.collection('products').get();
            pSnap.forEach(d => productOptions.push({id: d.id, ...d.data()}));
        } catch(e) {}

        const renderLine = (lineData, index) => {
            const tr = document.createElement('tr');
            if(isReadOnly) {
                tr.innerHTML = `<td>${lineData.productLabel}</td><td>${lineData.quantity}</td>`;
            } else {
                let opts = `<option value="">اختر المنتج...</option>`;
                productOptions.forEach(p => {
                    const sel = (p.id === lineData.productId) ? 'selected' : '';
                    opts += `<option value="${p.id}" ${sel}>[${p.sku}] ${p.name}</option>`;
                });
                const selectId = `dline-prod-${index}`;
                tr.innerHTML = `
                    <td class="editable" style="padding:0">
                        <select id="${selectId}" style="border:none; height:100%; width:100%; padding:0.75rem" required>${opts}</select>
                    </td>
                    <td class="editable" style="padding:0">
                        <input type="number" class="dline-qty" value="${lineData.quantity || 1}" min="1" required style="border:none; height:100%; padding:0.75rem;">
                    </td>
                    <td style="text-align:center; padding:0 1rem;">
                        <button type="button" class="icon-btn text-error btn-remove-line" style="cursor:pointer;" title="حذف">&times;</button>
                    </td>
                `;
                setTimeout(() => {
                    const el = document.getElementById(selectId);
                    if(el) {
                        el.addEventListener('change', (e) => tr.dataset.label = e.target.options[e.target.selectedIndex].text);
                        tr.dataset.label = el.options[el.selectedIndex]?.text || '';
                    }
                }, 0);
            }
            return tr;
        };

        const tbody = document.getElementById('d-lines-tbody');
        const lines = isEdit ? (delivery.lines || []) : [];
        let lineCounter = 0;
        lines.forEach(l => tbody.appendChild(renderLine(l, lineCounter++)));

        // Listeners
        document.getElementById('btn-back').addEventListener('click', () => this.init(this.container));
        
        const gatherData = () => {
            const trs = tbody.querySelectorAll('tr');
            const newLines = [];
            trs.forEach(tr => {
                const sel = tr.querySelector('select');
                const qtyInp = tr.querySelector('.dline-qty');
                if(sel && sel.value && qtyInp) {
                    newLines.push({
                        productId: sel.value,
                        productLabel: tr.dataset.label || sel.options[sel.selectedIndex].text,
                        quantity: parseInt(qtyInp.value) || 0
                    });
                }
            });
            return {
                deliveryAddress: document.getElementById('d-contact').value.trim(),
                scheduleDate: document.getElementById('d-date').value,
                responsible: window.currentUser?.name || "مدير النظام",
                operationType: document.getElementById('d-type').value,
                lines: newLines
            };
        };

        // زر الطباعة: يطبع مباشرة الفاتورة المعتمدة
        const printBtn = document.getElementById('btn-print');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                const activeLines = !isReadOnly ? gatherData().lines : (delivery?.lines || []);
                const slipData = {
                    ...(delivery || {}),
                    reference: isEdit ? delivery.reference : 'مسودة جديدة',
                    deliveryAddress: document.getElementById('d-contact')?.value.trim() || delivery?.deliveryAddress || 'عميل عام',
                    scheduleDate: document.getElementById('d-date')?.value || delivery?.scheduleDate || new Date().toISOString().split('T')[0],
                    responsible: isEdit ? delivery.responsible : (window.currentUser?.name || "مدير النظام"),
                    operationType: document.getElementById('d-type')?.value || delivery?.operationType || 'Delivery',
                    status: status,
                    lines: activeLines.length > 0 ? activeLines : (delivery?.lines || [])
                };

                if (slipData.lines.length === 0) {
                    return utils.showToast("يرجى إضافة أصناف للإذن قبل الطباعة", "warning");
                }

                this.printSlip(slipData);
            });
        }

        if(!isReadOnly) {
            document.getElementById('add-d-line').addEventListener('click', (e) => {
                e.preventDefault();
                tbody.appendChild(renderLine({}, lineCounter++));
            });

            tbody.addEventListener('click', (e) => {
                if(e.target.classList.contains('btn-remove-line')) e.target.closest('tr').remove();
            });

            const saveDelivery = async (newStatus) => {
                utils.showLoader();
                try {
                    const db = window.fbDb;
                    const data = gatherData();
                    data.status = newStatus;
                    
                    if(!isEdit) {
                        const t = await db.runTransaction(async (tr) => {
                            const cRef = db.collection('counters').doc('deliveries');
                            const cDoc = await tr.get(cRef);
                            let nCount = 1;
                            if(cDoc.exists) nCount = (cDoc.data().count || 0) + 1;
                            tr.set(cRef, { count: nCount }, { merge: true });
                            
                            data.reference = utils.formatReference('OUT', nCount);
                            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                            const newRef = db.collection('deliveries').doc();
                            tr.set(newRef, data);
                            return newRef.id;
                        });
                        utils.showToast("تم حفظ إذن الصرف بنجاح", "success");
                        this.openForm({id: t, ...data});
                    } else {
                        await db.collection('deliveries').doc(delivery.id).update(data);
                        utils.showToast("تم تحديث إذن الصرف بنجاح", "success");
                        delivery.status = newStatus;
                        this.openForm(delivery);
                    }
                } catch(e) {
                    utils.showToast(e.message, "error");
                } finally {
                    utils.hideLoader();
                }
            };

            const saveBtn = document.getElementById('btn-save-draft');
            if(saveBtn) saveBtn.addEventListener('click', () => saveDelivery(status));

            const markReady = document.getElementById('btn-mark-ready');
            if(markReady) markReady.addEventListener('click', () => saveDelivery('Ready'));

            const cancelBtn = document.getElementById('btn-cancel');
            if(cancelBtn) cancelBtn.addEventListener('click', async () => {
                if(await utils.showConfirm("إلغاء الإذن", "هل أنت متأكد من رغبتك في إلغاء إذن الصرف هذا؟")) saveDelivery('Canceled');
            });

            // الاعتماد والخصم من المخزون
            const validateBtn = document.getElementById('btn-validate');
            if(validateBtn) {
                validateBtn.addEventListener('click', async () => {
                    const data = gatherData();
                    if(data.lines.length === 0) return utils.showToast("يرجى إضافة أصناف إلى إذن الصرف أولاً", "error");
                    
                    if(!await utils.showConfirm("اعتماد وصرف البضاعة", "سيؤدي هذا الإجراء إلى خصم الكميات من رصيد المخزون الفعلي بشكل نهائي. هل تريد المتابعة؟")) return;

                    utils.showLoader();
                    const db = window.fbDb;
                    const whId = data.warehouseId || (await db.collection('warehouses').limit(1).get()).docs[0]?.id;
                    
                    try {
                        const batch = db.batch();
                        
                        for(const line of data.lines) {
                            const sReq = await db.collection('stock')
                                .where('productId', '==', line.productId)
                                .where('warehouseId', '==', whId).get();
                            
                            const stockOnHand = sReq.empty ? 0 : (sReq.docs[0].data().onHand || 0);
                            
                            if (stockOnHand < line.quantity) {
                                throw new Error(`الرصيد المتاح غير كافٍ للصنف (${line.productLabel}). الرصيد بالمخزن: ${stockOnHand}، والكمية المطلوبة: ${line.quantity}`);
                            }

                            // Update stock
                            const sDoc = sReq.docs[0];
                            batch.update(sDoc.ref, {
                                onHand: stockOnHand - line.quantity,
                                freeToUse: (sDoc.data().freeToUse || 0) - line.quantity,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });

                            // Append Ledger
                            const ledgerRef = db.collection('ledger').doc();
                            batch.set(ledgerRef, {
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                type: "Delivery",
                                reference: delivery.reference,
                                productId: line.productId,
                                productName: line.productLabel,
                                contact: data.deliveryAddress || 'غير محدد',
                                from: 'المستودع الرئيسي',
                                to: data.deliveryAddress || 'العميل',
                                quantity: line.quantity,
                                qtyChange: -line.quantity,
                                status: "Done"
                            });
                        }

                        // Update Delivery Doc
                        data.status = 'Done';
                        data.validatedAt = firebase.firestore.FieldValue.serverTimestamp();
                        batch.update(db.collection('deliveries').doc(delivery.id), data);

                        await batch.commit();
                        utils.showToast("تم اعتماد وصرف البضاعة من المخزن بنجاح", "success");
                        
                        delivery.status = 'Done';
                        this.openForm(delivery);

                    } catch(err) {
                        utils.hideLoader();
                        utils.showToast(err.message, "error");
                    }
                });
            }
        }
    }
};
