/**
 * Receipts Controller (Incoming Operations - 1-Step Direct Incoming "الوارد" with A4 Slip Printing)
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
            case 'Done': return 'مكتمل';
            case 'Canceled': return 'ملغي';
            default: return 'مكتمل';
        }
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                <div class="view-header-left" style="display:flex; align-items:center; gap:12px;">
                    <button class="btn btn-primary" id="btn-new-receipt" style="display:inline-flex; align-items:center; gap:6px; font-weight:700; padding:0.6rem 1.2rem; border-radius:8px; background:var(--primary); color:#fff; border:none; cursor:pointer;">
                        <span>⚡</span>
                        <span>+ وارد جديد (Incoming)</span>
                    </button>
                    <h2 class="view-title" style="margin:0; font-size:1.5rem; font-weight:800;">عمليات الوارد (Incoming)</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container" style="display:flex; align-items:center; background:var(--surface-hover); border:1px solid var(--border); border-radius:8px; padding:0.4rem 0.8rem;">
                        <input type="text" id="receipt-search" placeholder="بحث برقم المرجع أو المورد..." style="border:none; background:transparent; outline:none; width:220px; font-size:0.9rem;">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>رقم المرجع</th>
                            <th>المورد / جهة التوريد</th>
                            <th>تاريخ الاستلام</th>
                            <th>حالة العملية</th>
                        </tr>
                    </thead>
                    <tbody id="receipts-tbody">
                        <tr><td colspan="4" class="text-center text-muted" style="padding:2rem;">جاري تحميل سجلات الوارد...</td></tr>
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
        if (window.utils && utils.showLoader) utils.showLoader();
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
            if (window.utils && utils.showToast) utils.showToast("خطأ أثناء تحميل بيانات الوارد", "error");
        } finally {
            if (window.utils && utils.hideLoader) utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('receipts-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:2rem;">لا توجد عمليات وارد مسجلة حتى الآن.</td></tr>';
            return;
        } 
        
        data.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.style.cursor = 'pointer';
            tr.onclick = () => this.openForm(r);
            
            const isDone = (r.status === 'Done' || !r.status);
            const badgeClass = isDone ? 'badge-done' : 'badge-canceled';
            const dateDisplay = (window.utils && utils.formatDate) ? utils.formatDate(r.scheduleDate) : (r.scheduleDate || '-');

            tr.innerHTML = `
                <td class="font-weight-600"><span style="font-family:monospace; font-weight:700; background:var(--surface-hover); padding:3px 8px; border-radius:4px;">${r.reference || '-'}</span></td>
                <td><strong>${r.supplier || 'مورد عام'}</strong></td>
                <td>${dateDisplay}</td>
                <td><span class="badge ${badgeClass}">${this.translateStatus(r.status)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    },

    printSlip: function(receipt) {
        if (!receipt) return (window.utils && utils.showToast) ? utils.showToast("لا توجد بيانات للطباعة", "error") : null;

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
                    <td style="text-align: center; width: 120px; color:#059669; font-weight:700;">تم الاستلام والتوريد</td>
                </tr>
            `;
        }).join('');

        const invoiceHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>طباعة ${receipt.reference || 'إذن الوارد'}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 portrait; margin: 12mm 15mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
                body { background: #fff; color: #0f172a; padding: 24px; font-size: 13px; line-height: 1.6; }
                .slip-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
                .brand-name { font-size: 24px; font-weight: 900; color: #0f172a; }
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
                    <div class="brand-name">إدارة المخازن 📦</div>
                    <div class="brand-sub">إذن استلام وتوريد بضاعة للمستودع</div>
                </div>
                <div style="text-align: left;">
                    <div class="doc-title">إذن توريد واستلام بضاعة (الوارد)</div>
                    <div class="doc-ref-badge">${receipt.reference || 'وارد فوري'}</div>
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
                        <span class="info-label">حالة العملية:</span>
                        <span class="info-value" style="color: #059669; font-weight:800;">مكتمل (تم التوريد للمخزن)</span>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th>اسم الصنف ومواصفاته</th>
                        <th style="width: 130px; text-align: center;">الكمية الواردة</th>
                        <th style="width: 120px; text-align: center;">الحالة</th>
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
                    <div class="sig-title">أمين المستودع المستلم</div>
                    <div class="sig-line"></div>
                    <div class="sig-sub">التوقيع والاسم</div>
                </div>
                <div class="sig-box">
                    <div class="sig-title">إدارة المخزون والمراجعة</div>
                    <div class="sig-line"></div>
                    <div class="sig-sub">الاعتماد والتسجيل</div>
                </div>
                <div class="sig-box">
                    <div class="sig-title">مندوب التوريد / السائق</div>
                    <div class="sig-line"></div>
                    <div class="sig-sub">الاسم ورقم الهوية</div>
                </div>
            </div>

            <div class="footer-note">
                تم استخراج إذن الوارد وتحديث رصيد المخزن آلياً.
            </div>
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=950');
        if (!printWindow) {
            return (window.utils && utils.showToast) ? utils.showToast("يرجى السماح بالنوافذ المنبثقة (Popups) للطباعة", "warning") : null;
        }

        printWindow.document.open();
        printWindow.document.write(invoiceHtml);
        printWindow.document.close();

        printWindow.onload = function() {
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 250);
        };
    },

    openForm: async function(receipt = null) {
        const isEdit = !!receipt; // لو موجود، يبقى استعراض لعملية تمت بالفعل

        this.container.innerHTML = `
            <div class="view-header" style="margin-bottom:var(--spacing-sm); border:none; padding-bottom:0;">
                <div class="view-header-left" style="display:flex; align-items:center; gap:10px;">
                    <button class="btn btn-secondary" id="btn-back">← رجوع لقائمة الوارد</button>
                    <h2 class="view-title">${isEdit ? 'تفاصيل إذن الوارد' : 'استلام وارد جديد (Incoming)'}</h2>
                </div>
            </div>
            
            <div class="doc-header" style="background:var(--surface); padding:var(--spacing-md); border:1px solid var(--border); border-bottom:none; border-radius:var(--border-radius) var(--border-radius) 0 0; margin-bottom:0; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:8px; align-items:center;">
                    ${!isEdit ? `
                        <button class="btn btn-success" id="btn-direct-receive" style="background:#16a34a; color:white; font-weight:700; border:none; padding:0.6rem 1.4rem; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                            <span>⚡ إتمام وتأكيد الوارد فوراً</span>
                        </button>
                    ` : `
                        <button class="btn btn-secondary" id="btn-print" title="طباعة إذن الاستلام">
                            🖨️ طباعة إذن الوارد
                        </button>
                        <button class="btn btn-danger" id="btn-cancel" style="background:#dc2626; color:#fff; border:none; border-radius:6px; padding:0.5rem 1rem; cursor:pointer;">إلغاء العملية</button>
                    `}
                </div>
                
                <!-- عرض حالة العملية فورية وبسيطة بدون مسودة وانتظار وجاهز -->
                <div>
                    <span class="badge" style="background:${isEdit ? '#dcfce7' : '#e0f2fe'}; color:${isEdit ? '#16a34a' : '#0284c7'}; padding:6px 14px; border-radius:50rem; font-weight:700; font-size:0.85rem;">
                        ${isEdit ? '✓ عملية وارد مكتملة (Done)' : '⚡ وارد مباشر فوري'}
                    </span>
                </div>
            </div>

            <div class="form-document" style="border-top-left-radius:0; border-top-right-radius:0; padding:1.5rem; background:var(--surface); border:1px solid var(--border); border-radius:0 0 var(--border-radius) var(--border-radius);">
                <div class="doc-ref text-muted" style="margin-bottom:var(--spacing-md); font-family:monospace; font-weight:700;">
                    رقم المرجع: <span style="color:var(--primary);">${isEdit ? receipt.reference : 'سيتم التوليد تلقائياً (IN-XXXX)'}</span>
                </div>
                
                <div class="form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; margin-bottom:1.5rem;">
                    <div class="form-group">
                        <label style="display:block; font-weight:700; margin-bottom:0.4rem;">المورد / جهة التوريد: <span style="color:red;">*</span></label>
                        <input type="text" id="r-supplier" value="${isEdit ? (receipt.supplier || '') : ''}" placeholder="مثال: ورشة الصياغة / شركة التوريد" ${isEdit ? 'disabled' : ''} style="width:100%; padding:0.65rem; border-radius:6px; border:1px solid var(--border);">
                    </div>
                    <div class="form-group">
                        <label style="display:block; font-weight:700; margin-bottom:0.4rem;">تاريخ الاستلام:</label>
                        <input type="date" id="r-date" value="${isEdit ? (receipt.scheduleDate || '') : new Date().toISOString().split('T')[0]}" ${isEdit ? 'disabled' : ''} style="width:100%; padding:0.65rem; border-radius:6px; border:1px solid var(--border);">
                    </div>
                </div>

                <div class="table-container lines-table">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:var(--surface-hover); text-align:right;">
                                <th style="padding:10px;">المنتج / الصنف</th>
                                <th style="padding:10px; width:180px;">الكمية المستلمة</th>
                                ${!isEdit ? '<th style="padding:10px; width:80px; text-align:center;">إجراء</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="r-lines-tbody"></tbody>
                        ${!isEdit ? `
                        <tfoot>
                            <tr>
                                <td colspan="3" style="padding:10px;"><a href="#" id="add-r-line" style="color:var(--primary); font-weight:700; text-decoration:none;"> + إضافة صنف آخر للإذن</a></td>
                            </tr>
                        </tfoot>` : ''}
                    </table>
                </div>
            </div>
        `;

        let productOptions = [];
        try {
            const pSnap = await window.fbDb.collection('products').get();
            pSnap.forEach(d => productOptions.push({id: d.id, ...d.data()}));
        } catch(e) {}

        const renderLine = (lineData, index) => {
            const tr = document.createElement('tr');
            if(isEdit) {
                tr.innerHTML = `<td style="padding:10px;"><strong>${lineData.productLabel}</strong></td><td style="padding:10px; font-weight:700;">${lineData.quantity} وحدة</td>`;
            } else {
                let opts = `<option value="">اختر المنتج...</option>`;
                productOptions.forEach(p => {
                    const sel = (p.id === lineData.productId) ? 'selected' : '';
                    opts += `<option value="${p.id}" ${sel}>[${p.sku || ''}] ${p.name}</option>`;
                });
                const selectId = `rline-prod-${index}`;
                tr.innerHTML = `
                    <td class="editable" style="padding:4px">
                        <select id="${selectId}" style="border:1px solid var(--border); border-radius:6px; height:100%; width:100%; padding:0.65rem" required>${opts}</select>
                    </td>
                    <td class="editable" style="padding:4px">
                        <input type="number" class="rline-qty" value="${lineData.quantity || 1}" min="1" required style="border:1px solid var(--border); border-radius:6px; height:100%; width:100%; padding:0.65rem; font-weight:700;">
                    </td>
                    <td style="text-align:center; padding:4px;">
                        <button type="button" class="icon-btn text-error btn-remove-line" style="cursor:pointer; border:none; background:none; font-size:1.2rem; color:#dc2626;" title="حذف">&times;</button>
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

        if (lines.length > 0) {
            lines.forEach(l => tbody.appendChild(renderLine(l, lineCounter++)));
        } else if (!isEdit) {
            // سطر أولي جاهز للإدخال
            tbody.appendChild(renderLine({}, lineCounter++));
        }

        // رجوع للقائمة
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
                        quantity: parseInt(qtyInp.value, 10) || 0
                    });
                }
            });
            return {
                supplier: document.getElementById('r-supplier').value.trim(),
                scheduleDate: document.getElementById('r-date').value,
                lines: newLines
            };
        };

        // زر الطباعة
        const printBtn = document.getElementById('btn-print');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printSlip(receipt);
            });
        }

        // إضافة سطر جديد وحذف سطر
        if(!isEdit) {
            document.getElementById('add-r-line').addEventListener('click', (e) => {
                e.preventDefault();
                tbody.appendChild(renderLine({}, lineCounter++));
            });

            tbody.addEventListener('click', (e) => {
                if(e.target.classList.contains('btn-remove-line')) e.target.closest('tr').remove();
            });

            // ================== الزرار السحري: إتمام الوارد في خطوة واحدة ==================
            const directReceiveBtn = document.getElementById('btn-direct-receive');
            if (directReceiveBtn) {
                directReceiveBtn.addEventListener('click', async () => {
                    const data = gatherData();
                    if(!data.supplier) {
                        return utils.showToast("يرجى كتابة اسم المورد أو جهة التوريد", "error");
                    }
                    if(data.lines.length === 0) {
                        return utils.showToast("يرجى اختيار صنف واحد على الأقل وتحديد الكمية", "error");
                    }

                    if(window.utils && utils.showLoader) utils.showLoader();
                    directReceiveBtn.disabled = true;
                    directReceiveBtn.textContent = "جاري التوريد وتحديث المخزن...";

                    const db = window.fbDb;
                    try {
                        // المستودع الافتراضي
                        const whSnap = await db.collection('warehouses').limit(1).get();
                        const whId = !whSnap.empty ? whSnap.docs[0].id : 'default_warehouse';
                        const whName = !whSnap.empty ? (whSnap.docs[0].data().name || 'المستودع الرئيسي') : 'المستودع الرئيسي';

                        // 1. توليد رقم المرجع آلياً وتحديث العداد
                        let reference = 'IN-001';
                        await db.runTransaction(async (tr) => {
                            const cRef = db.collection('counters').doc('receipts');
                            const cDoc = await tr.get(cRef);
                            let nCount = 1;
                            if(cDoc.exists) nCount = (cDoc.data().count || 0) + 1;
                            tr.set(cRef, { count: nCount }, { merge: true });
                            reference = utils.formatReference ? utils.formatReference('IN', nCount) : `IN-${nCount}`;
                        });

                        data.reference = reference;
                        data.status = 'Done'; // مكتمل فوراً بدون مسودة
                        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                        data.validatedAt = firebase.firestore.FieldValue.serverTimestamp();

                        // 2. تحديث أرصدة المخزون وسجل الحركات في Batch واحد فوري
                        const batch = db.batch();

                        for (const line of data.lines) {
                            const sReq = await db.collection('stock')
                                .where('productId', '==', line.productId)
                                .where('warehouseId', '==', whId)
                                .limit(1)
                                .get();

                            let newOnHand = line.quantity;

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
                                newOnHand = currentOnHand + line.quantity;

                                batch.update(sDoc.ref, {
                                    onHand: newOnHand,
                                    freeToUse: currentFree + line.quantity,
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }

                            // تسجيل الحركة في سجل الحركات (Ledger) كـ "الوارد"
                            const ledgerRef = db.collection('ledger').doc();
                            batch.set(ledgerRef, {
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                type: "الوارد",
                                reference: reference,
                                productId: line.productId,
                                productName: line.productLabel,
                                contact: data.supplier,
                                from: data.supplier,
                                to: whName,
                                quantity: line.quantity,
                                qtyChange: line.quantity, // التغير في الكمية بالموجب
                                newOnHand: newOnHand,
                                status: "Done"
                            });
                        }

                        // حفظ إذن الوارد نفسه بحالة مكتمل
                        const newReceiptRef = db.collection('receipts').doc();
                        batch.set(newReceiptRef, data);

                        await batch.commit();

                        if (window.utils && utils.showToast) {
                            utils.showToast(`تم إتمام الوارد وزيادة المخزن فوراً بنجاح! رقم المرجع: ${reference}`, "success");
                        }

                        // فتح صفحة الإذن المكتمل مع زر الطباعة
                        data.id = newReceiptRef.id;
                        this.openForm(data);

                    } catch (err) {
                        console.error(err);
                        if (window.utils && utils.showToast) utils.showToast("حدث خطأ: " + err.message, "error");
                        directReceiveBtn.disabled = false;
                        directReceiveBtn.textContent = "⚡ إتمام وتأكيد الوارد فوراً";
                    } finally {
                        if (window.utils && utils.hideLoader) utils.hideLoader();
                    }
                });
            }
        } else {
            // زر إلغاء الإذن في حالة الرغبة
            const cancelBtn = document.getElementById('btn-cancel');
            if(cancelBtn) {
                cancelBtn.addEventListener('click', async () => {
                    if(await utils.showConfirm("إلغاء الإذن", "هل أنت متأكد من رغبتك في إلغاء عملية الوارد هذه؟")) {
                        await window.fbDb.collection('receipts').doc(receipt.id).update({ status: 'Canceled' });
                        receipt.status = 'Canceled';
                        utils.showToast("تم إلغاء الإذن", "warning");
                        this.openForm(receipt);
                    }
                });
            }
        }
    }
};
