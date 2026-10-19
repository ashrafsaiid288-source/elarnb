/**
 * Internal Transfers Controller (Location changes - Arabic Version)
 */

window.transfersController = {
    transfersList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    translateStatus: function(status) {
        switch (status) {
            case 'Draft': return 'مسودة';
            case 'Ready': return 'جاهز للتحويل';
            case 'Done': return 'مكتمل';
            case 'Canceled': return 'ملغي';
            default: return status || '-';
        }
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-transfer">إذن تحويل جديد</button>
                    <h2 class="view-title">التحويلات الداخلية بين المخازن</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="transfer-search" placeholder="بحث برقم الإذن...">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>رقم المرجع / الإذن</th>
                            <th>من مستودع</th>
                            <th>إلى مستودع</th>
                            <th>التاريخ المقرر</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody id="transfers-tbody">
                        <tr><td colspan="5" class="text-center text-muted">جاري تحميل أذون التحويل...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('btn-new-transfer').addEventListener('click', () => this.openForm());
        
        document.getElementById('transfer-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.transfersList.filter(t => 
                (t.reference || '').toLowerCase().includes(val) ||
                (t.fromName || '').toLowerCase().includes(val) ||
                (t.toName || '').toLowerCase().includes(val) ||
                (this.translateStatus(t.status) || '').toLowerCase().includes(val)
            );
            this.populateTable(filtered);
        });
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        utils.showLoader();
        try {
            // Need warehouse names
            const whSnap = await window.fbDb.collection('warehouses').get();
            const whMap = {};
            whSnap.forEach(d => whMap[d.id] = d.data().name);

            const snap = await window.fbDb.collection('transfers').orderBy('createdAt', 'desc').get();
            this.transfersList = [];
            snap.forEach(doc => {
                const t = doc.data();
                t.id = doc.id;
                t.fromName = whMap[t.fromWarehouseId] || 'مستودع غير محدد';
                t.toName = whMap[t.toWarehouseId] || 'مستودع غير محدد';
                this.transfersList.push(t);
            });
            this.populateTable(this.transfersList);
        } catch (e) {
            console.error(e);
            utils.showToast("خطأ أثناء تحميل بيانات التحويلات الداخلية", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('transfers-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لا توجد تحويلات داخلية مسجلة.</td></tr>';
            return;
        }
        
        data.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => this.openForm(t);
            tr.innerHTML = `
                <td class="font-weight-600">${t.reference || 'مسودة'}</td>
                <td>${t.fromName}</td>
                <td>${t.toName}</td>
                <td>${utils.formatDate(t.scheduleDate)}</td>
                <td><span class="badge badge-${(t.status || '').toLowerCase()}">${this.translateStatus(t.status)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    },

    openForm: async function(transfer = null) {
        const isEdit = !!transfer;
        const status = isEdit ? transfer.status : 'Draft';
        const isReadOnly = (status === 'Done' || status === 'Canceled');

        let whOptions = '<option value="">اختر المستودع...</option>';
        try {
            const wSnap = await window.fbDb.collection('warehouses').get();
            wSnap.forEach(doc => {
                whOptions += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
        } catch(e) {}

        this.container.innerHTML = `
            <div class="view-header" style="margin-bottom:var(--spacing-sm); border:none; padding-bottom:0;">
                <div class="view-header-left">
                    <button class="btn btn-secondary" id="btn-back">← رجوع</button>
                    ${status === 'Draft' ? `<button class="btn btn-primary" id="btn-mark-ready">تحديد كـ جاهز</button>` : ''}
                    <h2 class="view-title" style="margin-right:var(--spacing-md)">إذن تحويل بضاعة داخلي</h2>
                </div>
            </div>
            
            <div class="doc-header" style="background:var(--surface); padding:var(--spacing-md); border:1px solid var(--border); border-bottom:none; border-radius:var(--border-radius) var(--border-radius) 0 0; margin-bottom:0; display:flex; align-items:center;">
                <div style="flex:1;">
                    ${status === 'Ready' && !isReadOnly ? `<button class="btn btn-success" id="btn-validate" style="background:var(--status-done); color:white; border:none; padding:0.5rem 1rem; border-radius:4px; margin-left:8px;">اعتماد ونقل البضاعة</button>` : ''}
                    <button class="btn btn-secondary" id="btn-print" ${!isReadOnly ? 'disabled' : ''}>طباعة</button>
                    ${!isReadOnly ? `<button class="btn btn-secondary" id="btn-cancel">إلغاء الإذن</button>` : ''}
                </div>
                
                <div class="status-pipeline">
                    <span class="step ${status === 'Draft' ? 'active' : ''}">مسودة</span> ←
                    <span class="step ${status === 'Ready' ? 'active' : ''}">جاهز</span> ←
                    <span class="step ${status === 'Done' ? 'active' : ''}">مكتمل</span>
                </div>
            </div>

            <div class="form-document" style="border-top-left-radius:0; border-top-right-radius:0;">
                <div class="doc-ref text-muted" style="margin-bottom:var(--spacing-md)">${isEdit ? transfer.reference : 'جديد'}</div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>من مستودع (المصدر)</label>
                        <select id="t-from-wh" ${isReadOnly ? 'disabled' : ''}>${whOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>إلى مستودع (الوجهة)</label>
                        <select id="t-to-wh" ${isReadOnly ? 'disabled' : ''}>${whOptions}</select>
                    </div>
                </div>
                
                <div class="form-group" style="max-width:300px;">
                    <label>تاريخ التحويل المقرر</label>
                    <input type="date" id="t-date" value="${isEdit ? (transfer.scheduleDate || '') : new Date().toISOString().split('T')[0]}" ${isReadOnly ? 'disabled' : ''}>
                </div>

                <div class="table-container lines-table">
                    <table>
                        <thead>
                            <tr>
                                <th>المنتج / الصنف</th>
                                <th>الكمية المنقولة</th>
                                ${!isReadOnly ? '<th>إجراء</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="t-lines-tbody"></tbody>
                        ${!isReadOnly ? `
                        <tfoot>
                            <tr>
                                <td colspan="3"><a href="#" id="add-t-line"> + إضافة صنف آخر للتحويل</a></td>
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

        if(isEdit) {
            document.getElementById('t-from-wh').value = transfer.fromWarehouseId;
            document.getElementById('t-to-wh').value = transfer.toWarehouseId;
        }

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
                const selectId = `tline-prod-${index}`;
                tr.innerHTML = `
                    <td class="editable" style="padding:0">
                        <select id="${selectId}" style="border:none; height:100%; width:100%; padding:0.75rem" required>${opts}</select>
                    </td>
                    <td class="editable" style="padding:0">
                        <input type="number" class="tline-qty" value="${lineData.quantity || 1}" min="1" required style="border:none; height:100%; padding:0.75rem;">
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

        const tbody = document.getElementById('t-lines-tbody');
        const lines = isEdit ? (transfer.lines || []) : [];
        let lineCounter = 0;
        lines.forEach(l => tbody.appendChild(renderLine(l, lineCounter++)));

        // Listeners
        document.getElementById('btn-back').addEventListener('click', () => this.init(this.container));
        
        if(!isReadOnly) {
            document.getElementById('add-t-line').addEventListener('click', (e) => {
                e.preventDefault();
                tbody.appendChild(renderLine({}, lineCounter++));
            });

            tbody.addEventListener('click', (e) => {
                if(e.target.classList.contains('btn-remove-line')) e.target.closest('tr').remove();
            });

            const gatherData = () => {
                const trs = tbody.querySelectorAll('tr');
                const newLines = [];
                trs.forEach(tr => {
                    const sel = tr.querySelector('select');
                    const qtyInp = tr.querySelector('.tline-qty');
                    if(sel && sel.value && qtyInp) {
                        newLines.push({
                            productId: sel.value,
                            productLabel: tr.dataset.label || sel.options[sel.selectedIndex].text,
                            quantity: parseInt(qtyInp.value) || 0
                        });
                    }
                });
                
                return {
                    fromWarehouseId: document.getElementById('t-from-wh').value,
                    toWarehouseId: document.getElementById('t-to-wh').value,
                    scheduleDate: document.getElementById('t-date').value,
                    lines: newLines
                };
            };

            const saveTransfer = async (newStatus) => {
                utils.showLoader();
                try {
                    const db = window.fbDb;
                    const data = gatherData();
                    data.status = newStatus;
                    
                    if(!data.fromWarehouseId || !data.toWarehouseId) throw new Error("يرجى اختيار مستودع المصدر ومستودع الوجهة.");
                    if(data.fromWarehouseId === data.toWarehouseId) throw new Error("لا يمكن أن يكون مستودع المصدر هو نفسه مستودع الوجهة.");
                    
                    if(!isEdit) {
                        const tId = await db.runTransaction(async (tr) => {
                            const cRef = db.collection('counters').doc('transfers');
                            const cDoc = await tr.get(cRef);
                            let nCount = 1;
                            if(cDoc.exists) nCount = (cDoc.data().count || 0) + 1;
                            tr.set(cRef, { count: nCount }, { merge: true });
                            
                            data.reference = utils.formatReference('INT', nCount);
                            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                            const newRef = db.collection('transfers').doc();
                            tr.set(newRef, data);
                            return newRef.id;
                        });
                        utils.showToast("تم حفظ إذن التحويل بنجاح", "success");
                        this.openForm({id: tId, ...data});
                    } else {
                        await db.collection('transfers').doc(transfer.id).update(data);
                        utils.showToast("تم تحديث إذن التحويل بنجاح", "success");
                        transfer.status = newStatus;
                        this.openForm(transfer);
                    }
                } catch(e) {
                    utils.showToast(e.message, "error");
                } finally {
                    utils.hideLoader();
                }
            };

            const saveBtn = document.getElementById('btn-save-draft');
            if(saveBtn) saveBtn.addEventListener('click', () => saveTransfer(status));

            const printBtn = document.getElementById('btn-print');
            if(printBtn) printBtn.addEventListener('click', () => window.print());

            const markReady = document.getElementById('btn-mark-ready');
            if(markReady) markReady.addEventListener('click', () => saveTransfer('Ready'));

            const cancelBtn = document.getElementById('btn-cancel');
            if(cancelBtn) cancelBtn.addEventListener('click', async () => {
                if(await utils.showConfirm("إلغاء التحويل", "هل أنت متأكد من رغبتك في إلغاء إذن التحويل هذا؟")) saveTransfer('Canceled');
            });

            // VALIDATE LOGIC
            const validateBtn = document.getElementById('btn-validate');
            if(validateBtn) {
                validateBtn.addEventListener('click', async () => {
                    const data = gatherData();
                    if(data.lines.length === 0) return utils.showToast("يرجى إضافة أصناف للتحويل أولاً", "error");
                    
                    if(!await utils.showConfirm("اعتماد التحويل", "هل أنت متأكد من نقل رصيد المخزون فعلياً إلى المستودع المحدد؟")) return;

                    utils.showLoader();
                    const db = window.fbDb;
                    
                    // Need names for ledger
                    const fmName = document.getElementById('t-from-wh').options[document.getElementById('t-from-wh').selectedIndex].text;
                    const tmName = document.getElementById('t-to-wh').options[document.getElementById('t-to-wh').selectedIndex].text;

                    try {
                        const batch = db.batch();
                        
                        for(const line of data.lines) {
                            // Check From Warehouse Stock
                            const sFromReq = await db.collection('stock').where('productId', '==', line.productId).where('warehouseId', '==', data.fromWarehouseId).get();
                            const fromOnHand = sFromReq.empty ? 0 : (sFromReq.docs[0].data().onHand || 0);
                            
                            if (fromOnHand < line.quantity) {
                                throw new Error(`الرصيد المتاح غير كافٍ للصنف (${line.productLabel}) في مستودع المصدر. الرصيد المتاح: ${fromOnHand}، والمطلوب: ${line.quantity}`);
                            }
                            
                            // Deduct From Location
                            batch.update(sFromReq.docs[0].ref, {
                                onHand: fromOnHand - line.quantity,
                                freeToUse: (sFromReq.docs[0].data().freeToUse || 0) - line.quantity,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });

                            // Add To Location
                            const sToReq = await db.collection('stock').where('productId', '==', line.productId).where('warehouseId', '==', data.toWarehouseId).get();
                            if(sToReq.empty) {
                                const sRef = db.collection('stock').doc();
                                batch.set(sRef, {
                                    productId: line.productId,
                                    productName: line.productLabel,
                                    warehouseId: data.toWarehouseId,
                                    locationId: "",
                                    onHand: line.quantity,
                                    freeToUse: line.quantity,
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            } else {
                                const sDoc = sToReq.docs[0];
                                batch.update(sDoc.ref, {
                                    onHand: (sDoc.data().onHand || 0) + line.quantity,
                                    freeToUse: (sDoc.data().freeToUse || 0) + line.quantity,
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }

                            // Append Ledger (2 entries: OUT and IN)
                            batch.set(db.collection('ledger').doc(), {
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                type: "Transfer", reference: transfer.reference,
                                productId: line.productId, productName: line.productLabel,
                                contact: `${fmName} ➔ ${tmName}`,
                                from: fmName, to: tmName,
                                quantity: line.quantity, qtyChange: -line.quantity, status: "Done"
                            });
                            
                            batch.set(db.collection('ledger').doc(), {
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                type: "Transfer", reference: transfer.reference + ' (وارد)',
                                productId: line.productId, productName: line.productLabel,
                                contact: `${fmName} ➔ ${tmName}`,
                                from: fmName, to: tmName,
                                quantity: line.quantity, qtyChange: line.quantity, status: "Done"
                            });
                        }

                        // Update Transfer Status
                        data.status = 'Done';
                        batch.update(db.collection('transfers').doc(transfer.id), data);

                        await batch.commit();
                        utils.showToast("تم إتمام عملية التحويل الداخلي بنجاح", "success");
                        transfer.status = 'Done';
                        this.openForm(transfer);

                    } catch(err) {
                        utils.hideLoader();
                        utils.showToast(err.message, "error");
                    }
                });
            }
        }
    }
};
