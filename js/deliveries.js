/**
 * Deliveries Controller (Outgoing Operations)
 */

window.deliveriesController = {
    deliveriesList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-delivery">NEW</button>
                    <h2 class="view-title">Deliveries</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="delivery-search" placeholder="Search ref or address...">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Contact / Address</th>
                            <th>Schedule Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="deliveries-tbody">
                        <tr><td colspan="4" class="text-center text-muted">Loading deliveries...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('btn-new-delivery').addEventListener('click', () => this.openForm());
        
        document.getElementById('delivery-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.deliveriesList.filter(d => 
                (d.reference || '').toLowerCase().includes(val) || 
                (d.deliveryAddress || '').toLowerCase().includes(val)
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
            utils.showToast("Error loading deliveries", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('deliveries-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No deliveries found.</td></tr>';
            return;
        } 
        
        data.forEach(d => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => this.openForm(d);
            tr.innerHTML = `
                <td class="font-weight-600">${d.reference || 'Draft'}</td>
                <td>${d.deliveryAddress || '-'}</td>
                <td>${utils.formatDate(d.scheduleDate)}</td>
                <td><span class="badge badge-${d.status.toLowerCase()}">${d.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    },

    // Similar robust structure as receipts
    openForm: async function(delivery = null) {
        const isEdit = !!delivery;
        const status = isEdit ? delivery.status : 'Draft';
        const isReadOnly = (status === 'Done' || status === 'Canceled');

        this.container.innerHTML = `
            <div class="view-header" style="margin-bottom:var(--spacing-sm); border:none; padding-bottom:0;">
                <div class="view-header-left">
                    <button class="btn btn-secondary" id="btn-back">← Back</button>
                    ${status === 'Draft' ? `<button class="btn btn-primary" id="btn-mark-ready">Mark as Ready</button>` : ''}
                    <h2 class="view-title" style="margin-left:var(--spacing-md)">Delivery</h2>
                </div>
            </div>
            
            <div class="doc-header" style="background:var(--surface); padding:var(--spacing-md); border:1px solid var(--border); border-bottom:none; border-radius:var(--border-radius) var(--border-radius) 0 0; margin-bottom:0; display:flex; align-items:center;">
                <div style="flex:1;">
                    ${status === 'Ready' && !isReadOnly ? `<button class="btn btn-success" id="btn-validate" style="background:var(--status-done); color:white; border:none; padding:0.5rem 1rem; border-radius:4px; margin-right:8px;">Validate</button>` : ''}
                    <button class="btn btn-secondary" id="btn-print" ${!isReadOnly ? 'disabled' : ''}>Print</button>
                    ${!isReadOnly ? `<button class="btn btn-secondary" id="btn-cancel">Cancel</button>` : ''}
                </div>
                
                <div class="status-pipeline">
                    <span class="step ${status === 'Draft' ? 'active' : ''}">Draft</span> >
                    <span class="step ${status === 'Waiting' ? 'active' : ''}">Waiting</span> >
                    <span class="step ${status === 'Ready' ? 'active' : ''}">Ready</span> >
                    <span class="step ${status === 'Done' ? 'active' : ''}">Done</span>
                </div>
            </div>

            <div class="form-document" style="border-top-left-radius:0; border-top-right-radius:0;">
                <div class="doc-ref text-muted" style="margin-bottom:var(--spacing-md)">${isEdit ? delivery.reference : 'New'}</div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>Delivery Address / Contact</label>
                        <input type="text" id="d-contact" value="${isEdit ? (delivery.deliveryAddress || '') : ''}" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                    <div class="form-group">
                        <label>Schedule Date</label>
                        <input type="date" id="d-date" value="${isEdit ? (delivery.scheduleDate || '') : new Date().toISOString().split('T')[0]}" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                </div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>Responsible</label>
                        <input type="text" value="${isEdit ? delivery.responsible : window.currentUser?.name}" disabled>
                    </div>
                    <div class="form-group">
                        <label>Operation Type</label>
                        <select id="d-type" ${isReadOnly ? 'disabled' : ''}>
                            <option value="Delivery" ${isEdit && delivery.operationType==='Delivery'?'selected':''}>Delivery</option>
                            <option value="Return" ${isEdit && delivery.operationType==='Return'?'selected':''}>Return of Good</option>
                        </select>
                    </div>
                </div>

                <div class="table-container lines-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                ${!isReadOnly ? '<th></th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="d-lines-tbody"></tbody>
                        ${!isReadOnly ? `
                        <tfoot>
                            <tr>
                                <td colspan="3"><a href="#" id="add-d-line"> + Add New product</a></td>
                            </tr>
                        </tfoot>` : ''}
                    </table>
                </div>
                
                ${!isReadOnly ? `
                <div style="margin-top:var(--spacing-xl)">
                    <button class="btn btn-primary" id="btn-save-draft">Save Changes</button>
                </div>` : ''}
            </div>
        `;

        // Product Dropdown populate logic (same as receipts)
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
                let opts = `<option value="">Select Product...</option>`;
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
                    <td style="text-align:right; padding:0 1rem;">
                        <button class="icon-btn text-error btn-remove-line">&times;</button>
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
        
        if(!isReadOnly) {
            document.getElementById('add-d-line').addEventListener('click', (e) => {
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
                    responsible: window.currentUser?.name || "System Admin",
                    operationType: document.getElementById('d-type').value,
                    lines: newLines
                };
            };

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
                        utils.showToast("Delivery saved", "success");
                        this.openForm({id: t, ...data});
                    } else {
                        await db.collection('deliveries').doc(delivery.id).update(data);
                        utils.showToast("Delivery updated", "success");
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

            const printBtn = document.getElementById('btn-print');
            if(printBtn) printBtn.addEventListener('click', () => window.print());

            const markReady = document.getElementById('btn-mark-ready');
            if(markReady) markReady.addEventListener('click', () => saveDelivery('Ready'));

            const cancelBtn = document.getElementById('btn-cancel');
            if(cancelBtn) cancelBtn.addEventListener('click', async () => {
                if(await utils.showConfirm("Cancel Delivery", "Are you sure?")) saveDelivery('Canceled');
            });

            // VALIDATE LOGIC FOR DEMAND (CHECK STOCK)
            const validateBtn = document.getElementById('btn-validate');
            if(validateBtn) {
                validateBtn.addEventListener('click', async () => {
                    const data = gatherData();
                    if(data.lines.length === 0) return utils.showToast("No products to deliver", "error");
                    
                    if(!await utils.showConfirm("Validate Delivery", "This will deduct stock permanently. Continue?")) return;

                    utils.showLoader();
                    const db = window.fbDb;
                    const whId = data.warehouseId || (await db.collection('warehouses').limit(1).get()).docs[0]?.id;
                    
                    try {
                        // We must fetch stock and verify manually to prevent negative values
                        const batch = db.batch();
                        
                        for(const line of data.lines) {
                            const sReq = await db.collection('stock')
                                .where('productId', '==', line.productId)
                                .where('warehouseId', '==', whId).get();
                            
                            const stockOnHand = sReq.empty ? 0 : (sReq.docs[0].data().onHand || 0);
                            
                            if (stockOnHand < line.quantity) {
                                throw new Error(`Insufficient stock for ${line.productLabel}. Available: ${stockOnHand}, Requested: ${line.quantity}`);
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
                                contact: data.deliveryAddress || 'Unknown',
                                from: 'Warehouse',
                                to: data.deliveryAddress || 'Customer',
                                quantity: line.quantity, // raw qty
                                qtyChange: -line.quantity, // negative for outgoing
                                status: "Done"
                            });
                        }

                        // Update Delivery Doc
                        data.status = 'Done';
                        data.validatedAt = firebase.firestore.FieldValue.serverTimestamp();
                        batch.update(db.collection('deliveries').doc(delivery.id), data);

                        await batch.commit();
                        utils.showToast("Delivery Validated Successfully", "success");
                        // Refresh
                        delivery.status = 'Done';
                        this.openForm(delivery);

                    } catch(err) {
                        utils.hideLoader();
                        // Triggers when stock goes negative condition is met
                        utils.showToast(err.message, "error");
                    }
                });
            }
        }
    }
};
