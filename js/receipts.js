/**
 * Receipts Controller (Incoming Operations - Arabic Version with A4 Slip Printing)
 */

window.receiptsController = {
    receiptsList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    translateStatus: function(status) {
        switch (status) {
            case 'Draft': return 'مسودة';
            case 'Waiting': return 'قيد الانتظار';
            case 'Ready': return 'جاهز للاستلام';
            case 'Done': return 'مكتمل';
            case 'Canceled': return 'ملغي';
            default: return status || '-';
        }
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-receipt">إذن استلام جديد</button>
                    <h2 class="view-title">أذون الاستلام (الوارد)</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="receipt-search" placeholder="بحث برقم الإذن أو المورد...">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>رقم المرجع / الإذن</th>
                            <th>المورد / جهة التوريد</th>
                            <th>تاريخ الاستلام المقرر</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody id="receipts-tbody">
                        <tr><td colspan="4" class="text-center text-muted">جاري تحميل أذون الاستلام...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('btn-new-receipt').addEventListener('click', () => this.openForm());
        
        document.getElementById('receipt-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.receiptsList.filter(r => 
                (r.reference || '').toLowerCase().includes(val) || 
                (r.supplier || '').toLowerCase().includes(val) || 
                (this.translateStatus(r.status) || '').toLowerCase().includes(val)
            );
            this.populateTable(filtered);
        });
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        utils.showLoader();
        try {
            const snap = await window.fbDb.collection('receipts').orderBy('createdAt', 'desc').get();
            this.receiptsList = [];
            snap.forEach(doc => {
                const r = doc.data();
                r.id = doc.id;
                this.receiptsList.push(r);
            });
            this.populateTable(this.receiptsList);
        } catch (e) {
            console.error(e);
            utils.showToast("خطأ أثناء تحميل بيانات أذون الاستلام", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('receipts-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">لا توجد أذون استلام مسجلة.</td></tr>';
            return;
        } 
        
        data.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => this.openForm(r);
            tr.innerHTML = `
                <td class="font-weight-600">${r.reference || 'مسودة'}</td>
                <td>${r.supplier || '-'}</td>
                <td>${utils.formatDate(r.scheduleDate)}</td>
                <td><span class="badge badge-${(r.status || '').toLowerCase()}">${this.translateStatus(r.status)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    },

    printSlip: function(receipt) {
        if (!receipt) return utils.showToast("لا توجد بيانات للطباعة", "error");

        const lines = receipt.lines || [];
        const totalQty = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

        const rowsHtml = lines.map((item, index) => {
            const label = item.productLabel || item.name || 'صنف غير محدد';
            const qty = item.quantity || 0;
            return `
                <tr>
                    <td style="text-align: center; font-weight: bold; width: 40px;">${index + 1}</td>
                    <td><strong>${label}</strong></td>
                    <td style="text-align: center; font-weight: 800; font-size: 14px; width: 130px;">${qty} وحدة</td>
                    <td style="text-align: center; width: 120px;">مطابق للمواصفات</td>
                </tr>
            `;
        }).join('');

        const invoiceHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>طباعة ${receipt.reference || 'إذن استلام'}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 portrait; margin: 12mm 15mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
                body { background: #fff; color: #0f172a; padding: 24px; font-size: 13px; line-height: 1.6; }
                .slip-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
                .brand-name { font-size: 24px; font-weight: 900; color: #4338ca; }
                .brand-sub { font-size: 12px; color: #64748b; font-weight: 600; }
                .doc-title { font-size: 18px; font-weight: 800; color: #0f172a; text-align: left; }
                .doc-ref-badge { display: inline-block; background: #f1f5f9; border: 1.5px solid #cbd5e1; padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 15px; font-weight: 900; color: #059669; margin-top: 6px; }
                .info-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
                .info-line { display: flex; margin-bottom: 6px; }
                .info-label { width: 130px; color: #64748b; font-weight: 700; }
                .info-value { font-weight: 700; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; }
                th { background: #f1f5f9; color: #1e293b; font-weight: 800; font-size: 12px; }
                .total-box { display: flex; justify-content: flex-end; margin-bottom: 30px; }
                .total-table { width: 320px; border: 1px solid #cbd5e1; }
                .total-table td { padding: 8px 14px; font-weight: 800; font-size: 14px; }
                .signatures-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; padding-top: 24px; border-top: 1px dashed #cbd5e1; text-align: center; }
                .sig-box { padding: 8px; }
                .sig-title { font-weight: 800; color: #334155; margin-bottom: 45px; }
                .sig-line { border-bottom: 1.5px solid #0f172a; margin: 0 10px; }
                .sig-sub { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 6px; }
                .footer-note { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="slip-header">
                <div>
                    <div class="brand-name">CoreInventory 📦</div>
                    <div class="brand-sub">إدارة المخازن والمستودعات والخدمات اللوجستية</div>
                </div>
                <div style="text-align: left;">
                    <div class="doc-title">إذن فحص واستلام بضاعة (وارد)</div>
                    <div class="doc-ref-badge">${receipt.reference || 'مسودة جديدة'}</div>
                </div>
            </div>

            <div class="info-grid">
                <div>
                    <div class="info-line">
                        <span class="info-label">المورد / جهة التوريد:</span>
                        <span class="info-value">${receipt.supplier || 'غير محدد'}</span>
                    </div>
                    <div class="info-line">
                        <span class="info-label">مستودع الاستلام:</span>
                        <span class="info-value">المستودع الرئيسي</span>
                    </div>
                </div>
                <div>
                    <div class="info-line">
                        <span class="info-label">تاريخ الاستلام:</span>
                        <span class="info-value">${receipt.scheduleDate || new Date().toISOString().split('T')[0]}</span>
                    </div>
                    <div class="info-line">
                        <span class="info-label">حالة الإذن:</span>
                        <span class="info-value" style="color: #059669;">${this.translateStatus(receipt.status)}</span>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th>اسم الصنف ومواصفاته (الباركود / SKU)</th>
                        <th style="width: 130px; text-align: center;">الكمية المستلمة</th>
                        <th style="width: 120px; text-align: center;">حالة الفحص</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding: 20px;">لا توجد أصناف مدرجة</td></tr>'}
                </tbody>
            </table>

            <div class="total-box">
                <table class="total-table">
                    <tr>
                        <td style="background: #f8fafc;">إجمالي عدد الوحدات المستلمة:</td>
                        <td style="text-align: left; color: #059669;">${totalQty} وحدة</td>
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
                    <div class="sig-title">لجنة الفحص والاستلام</div>
                    <div class="sig-line"></div>
                    <div class="sig-sub">التوقيع والاعتماد</div>
                </div>
                <div class="sig-box">
                    <div class="sig-title">مندوب التوريد / السائق</div>
                    <div class="sig-line"></div>
                    <div class="sig-sub">الاسم ورقم الهوية</div>
                </div>
            </div>

            <div class="footer-note">
                تم استخراج إذن الاستلام آلياً عبر نظام CoreInventory - يُرجى حفظ نسخة بالمخزن للتسوية المحاسبية.
            </div>
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=950');
        if (!printWindow) {
            return utils.showToast("يرجى السماح بالنوافذ المنبثقة (Popups) للطباعة", "warning");
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

    openForm: async function(receipt = null) {
        const isEdit = !!receipt;
        const status = isEdit ? receipt.status : 'Draft';
        const isReadOnly = (status === 'Done' || status === 'Canceled');

        this.container.innerHTML = `
            <div class="view-header" style="margin-bottom:var(--spacing-sm); border:none; padding-bottom:0;">
                <div class="view-header-left">
                    <button class="btn btn-secondary" id="btn-back">← رجوع</button>
                    ${status === 'Draft' ? `<button class="btn btn-primary" id="btn-mark-ready">تحديد كـ جاهز</button>` : ''}
                    <h2 class="view-title" style="margin-right:var(--spacing-md)">إذن استلام وتوريد بضاعة</h2>
                </div>
            </div>
            
            <div class="doc-header" style="background:var(--surface); padding:var(--spacing-md); border:1px solid var(--border); border-bottom:none; border-radius:var(--border-radius) var(--border-radius) 0 0; margin-bottom:0; display:flex; align-items:center;">
                <div style="flex:1; display:flex; gap:8px; align-items:center;">
                    ${status === 'Ready' && !isReadOnly ? `<button class="btn btn-success" id="btn-validate" style="background:var(--status-done); color:white; border:none; padding:0.5rem 1rem; border-radius:4px;">اعتماد وتوريد للمخزن</button>` : ''}
                    <button class="btn btn-secondary" id="btn-print" title="طباعة إذن الاستلام">
                        🖨️ طباعة إذن الاستلام
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
                <div class="doc-ref text-muted" style="margin-bottom:var(--spacing-md)">${isEdit ? receipt.reference : 'جديد'}</div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>المورد / جهة التوريد</label>
                        <input type="text" id="r-supplier" value="${isEdit ? (receipt.supplier || '') : ''}" placeholder="اسم المورد أو الشركة" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                    <div class="form-group">
                        <label>تاريخ الاستلام المقرر</label>
                        <input type="date" id="r-date" value="${isEdit ? (receipt.scheduleDate || '') : new Date().toISOString().split('T')[0]}" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                </div>

                <div class="table-container lines-table">
                    <table>
                        <thead>
                            <tr>
                                <th>المنتج / الصنف</th>
                                <th>الكمية المستلمة</th>
                                ${!isReadOnly ? '<th>إجراء</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="r-lines-tbody"></tbody>
                        ${!isReadOnly ? `
                        <tfoot>
                            <tr>
                                <td colspan="3"><a href="#" id="add-r-line"> + إضافة صنف آخر للإذن</a></td>
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
                    opts += `<option value="${p.id}" ${sel}>[${p.sku || ''}] ${p.name}</option>`;
                });
                const selectId = `rline-prod-${index}`;
                tr.innerHTML = `
                    <td class="editable" style="padding:0">
                        <select id="${selectId}" style="border:none; height:100%; width:100%; padding:0.75rem" required>${opts}</select>
                    </td>
                    <td class="editable" style="padding:0">
                        <input type="number" class="rline-qty" value="${lineData.quantity || 1}" min="1" required style="border:none; height:100%; padding:0.75rem;">
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

        const tbody = document.getElementById('r-lines-tbody');
        const lines = isEdit ? (receipt.lines || []) : [];
        let lineCounter = 0;
        lines.forEach(l => tbody.appendChild(renderLine(l, lineCounter++)));

        // Event Listeners
        document.getElementById('btn-back').addEventListener('click', () => this.init(this.container));
        
        const gatherData = () => {
            const trs = tbody.querySelectorAll('tr');
            const newLines = [];
            trs.forEach(tr => {
                const sel = tr.querySelector('select');
                const qtyInp = tr.querySelector('.rline-qty');
                if(sel && sel.value && qtyInp) {
                    newLines.push({
                        productId: sel.value,
                        productLabel: tr.dataset.label || sel.options[sel.selectedIndex].text,
                        quantity: parseInt(qtyInp.value) || 0
                    });
                }
            });
            return {
                supplier: document.getElementById('r-supplier').value.trim(),
                scheduleDate: document.getElementById('r-date').value,
                lines: newLines
            };
        };

        const printBtn = document.getElementById('btn-print');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                const activeLines = !isReadOnly ? gatherData().lines : (receipt?.lines || []);
                const slipData = {
                    ...(receipt || {}),
                    reference: isEdit ? receipt.reference : 'مسودة جديدة',
                    supplier: document.getElementById('r-supplier')?.value.trim() || receipt?.supplier || 'مورد عام',
                    scheduleDate: document.getElementById('r-date')?.value || receipt?.scheduleDate || new Date().toISOString().split('T')[0],
                    status: status,
                    lines: activeLines.length > 0 ? activeLines : (receipt?.lines || [])
                };

                if (slipData.lines.length === 0) {
                    return utils.showToast("يرجى إضافة أصناف للإذن قبل الطباعة", "warning");
                }
                this.printSlip(slipData);
            });
        }

        if(!isReadOnly) {
            document.getElementById('add-r-line').addEventListener('click', (e) => {
                e.preventDefault();
                tbody.appendChild(renderLine({}, lineCounter++));
            });

            tbody.addEventListener('click', (e) => {
                if(e.target.classList.contains('btn-remove-line')) e.target.closest('tr').remove();
            });

            const saveReceipt = async (newStatus) => {
                utils.showLoader();
                try {
                    const db = window.fbDb;
                    const data = gatherData();
                    data.status = newStatus;
                    
                    if(!isEdit) {
                        const t = await db.runTransaction(async (tr) => {
                            const cRef = db.collection('counters').doc('receipts');
                            const cDoc = await tr.get(cRef);
                            let nCount = 1;
                            if(cDoc.exists) nCount = (cDoc.data().count || 0) + 1;
                            tr.set(cRef, { count: nCount }, { merge: true });
                            
                            data.reference = utils.formatReference('IN', nCount);
                            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                            const newRef = db.collection('receipts').doc();
                            tr.set(newRef, data);
                            return newRef.id;
                        });
                        utils.showToast("تم حفظ إذن الاستلام بنجاح", "success");
                        this.openForm({id: t, ...data});
                    } else {
                        await db.collection('receipts').doc(receipt.id).update(data);
                        utils.showToast("تم تحديث إذن الاستلام بنجاح", "success");
                        receipt.status = newStatus;
                        this.openForm(receipt);
                    }
                } catch(e) {
                    utils.showToast(e.message, "error");
                } finally {
                    utils.hideLoader();
                }
            };

            const saveBtn = document.getElementById('btn-save-draft');
            if(saveBtn) saveBtn.addEventListener('click', () => saveReceipt(status));

            const markReady = document.getElementById('btn-mark-ready');
            if(markReady) markReady.addEventListener('click', () => saveReceipt('Ready'));

            const cancelBtn = document.getElementById('btn-cancel');
            if(cancelBtn) cancelBtn.addEventListener('click', async () => {
                if(await utils.showConfirm("إلغاء الإذن", "هل أنت متأكد من رغبتك في إلغاء إذن الاستلام هذا؟")) saveReceipt('Canceled');
            });

            // الاعتماد وإضافة الكميات للمخزون
            const validateBtn = document.getElementById('btn-validate');
            if(validateBtn) {
                validateBtn.addEventListener('click', async () => {
                    const data = gatherData();
                    if(data.lines.length === 0) return utils.showToast("يرجى إضافة أصناف إلى إذن الاستلام أولاً", "error");
                    
                    if(!await utils.showConfirm("اعتماد وتوريد البضاعة", "سيؤدي هذا الإجراء إلى زيادة رصيد المخزون الفعلي بالكميات الواردة. هل تريد المتابعة؟")) return;

                    utils.showLoader();
                    const db = window.fbDb;
                    const whId = (await db.collection('warehouses').limit(1).get()).docs[0]?.id || 'default_warehouse';
                    
                    try {
                        const batch = db.batch();
                        
                        for(const line of data.lines) {
                            const sReq = await db.collection('stock')
                                .where('productId', '==', line.productId)
                                .where('warehouseId', '==', whId).get();
                            
                            if (sReq.empty) {
                                const newStockRef = db.collection('stock').doc();
                                batch.set(newStockRef, {
                                    productId: line.productId,
                                    warehouseId: whId,
                                    onHand: line.quantity,
                                    freeToUse: line.quantity,
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            } else {
                                const sDoc = sReq.docs[0];
                                const currentOnHand = sDoc.data().onHand || 0;
                                const currentFree = sDoc.data().freeToUse || 0;
                                batch.update(sDoc.ref, {
                                    onHand: currentOnHand + line.quantity,
                                    freeToUse: currentFree + line.quantity,
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }

                            // تسجيل الحركة في السجل (Ledger)
                            const ledgerRef = db.collection('ledger').doc();
                            batch.set(ledgerRef, {
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                type: "Receipt",
                                reference: receipt.reference,
                                productId: line.productId,
                                productName: line.productLabel,
                                contact: data.supplier || 'المورد',
                                from: data.supplier || 'المورد',
                                to: 'المستودع الرئيسي',
                                quantity: line.quantity,
                                qtyChange: line.quantity,
                                status: "Done"
                            });
                        }

                        data.status = 'Done';
                        data.validatedAt = firebase.firestore.FieldValue.serverTimestamp();
                        batch.update(db.collection('receipts').doc(receipt.id), data);

                        await batch.commit();
                        utils.showToast("تم اعتماد وتوريد البضاعة للمخزن بنجاح", "success");
                        
                        receipt.status = 'Done';
                        this.openForm(receipt);

                    } catch(err) {
                        utils.hideLoader();
                        utils.showToast(err.message, "error");
                    }
                });
            }
        }
    }
};
