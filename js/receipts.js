/**
 * Receipts Controller (Incoming Operations)
 */

window.receiptsController = {
    receiptsList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-receipt">NEW</button>
                    <h2 class="view-title">Receipts</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="receipt-search" placeholder="Search ref or contact...">
                    </div>
                    <button class="icon-btn active" id="btn-view-list" title="List View">≡</button>
                    <button class="icon-btn" id="btn-view-kanban" title="Kanban View">⊞</button>
                </div>
            </div>
            
            <div id="receipts-list-view" class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Contact</th>
                            <th>Schedule Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="receipts-tbody">
                        <tr><td colspan="4" class="text-center text-muted">Loading receipts...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div id="receipts-kanban-view" class="kanban-board hidden">
                <div class="kanban-col" id="col-draft">
                    <h3>Draft <span>0</span></h3>
                    <div class="k-cards"></div>
                </div>
                <div class="kanban-col" id="col-ready">
                    <h3>Ready <span>0</span></h3>
                    <div class="k-cards"></div>
                </div>
                <div class="kanban-col" id="col-done">
                    <h3>Done <span>0</span></h3>
                    <div class="k-cards"></div>
                </div>
                <div class="kanban-col" id="col-canceled">
                    <h3>Canceled <span>0</span></h3>
                    <div class="k-cards"></div>
                </div>
            </div>
        `;

        document.getElementById('btn-new-receipt').addEventListener('click', () => this.openForm());
        
        document.getElementById('receipt-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.receiptsList.filter(r => 
                (r.reference || '').toLowerCase().includes(val) || 
                (r.receiveFrom || '').toLowerCase().includes(val)
            );
            this.populateViews(filtered);
        });

        // View Toggles
        document.getElementById('btn-view-list').addEventListener('click', (e) => {
            e.currentTarget.classList.add('active');
            document.getElementById('btn-view-kanban').classList.remove('active');
            document.getElementById('receipts-list-view').classList.remove('hidden');
            document.getElementById('receipts-kanban-view').classList.add('hidden');
        });

        document.getElementById('btn-view-kanban').addEventListener('click', (e) => {
            e.currentTarget.classList.add('active');
            document.getElementById('btn-view-list').classList.remove('active');
            document.getElementById('receipts-kanban-view').classList.remove('hidden');
            document.getElementById('receipts-list-view').classList.add('hidden');
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
            this.populateViews(this.receiptsList);
        } catch (e) {
            console.error(e);
            utils.showToast("Error loading receipts", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateViews: function(data) {
        // Populate List
        const tbody = document.getElementById('receipts-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No receipts found.</td></tr>';
        } else {
            data.forEach(r => {
                const tr = document.createElement('tr');
                tr.className = 'clickable';
                tr.onclick = () => this.openForm(r);
                tr.innerHTML = `
                    <td class="font-weight-600">${r.reference || 'Draft'}</td>
                    <td>${r.receiveFrom || '-'}</td>
                    <td>${utils.formatDate(r.scheduleDate)}</td>
                    <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Populate Kanban
        const cols = {
            'Draft': document.querySelector('#col-draft .k-cards'),
            'Ready': document.querySelector('#col-ready .k-cards'),
            'Done': document.querySelector('#col-done .k-cards'),
            'Canceled': document.querySelector('#col-canceled .k-cards')
        };
        
        Object.keys(cols).forEach(k => { if(cols[k]) cols[k].innerHTML = ''; });
        const counts = { 'Draft':0, 'Ready':0, 'Done':0, 'Canceled':0 };

        data.forEach(r => {
            const stat = r.status;
            if(cols[stat]) {
                counts[stat]++;
                const card = document.createElement('div');
                card.className = 'kanban-card';
                card.onclick = () => this.openForm(r);
                card.innerHTML = `
                    <div class="k-ref">${r.reference || 'Draft'}</div>
                    <div class="k-contact">${r.receiveFrom || 'Unknown Contact'}</div>
                    <div class="k-footer">
                        <span>${utils.formatDate(r.scheduleDate)}</span>
                        <span>${(r.lines || []).length} lines</span>
                    </div>
                `;
                cols[stat].appendChild(card);
            }
        });

        // Update counts
        Object.keys(counts).forEach(k => {
            const el = document.querySelector(`#col-${k.toLowerCase()} h3 span`);
            if(el) el.textContent = counts[k];
        });
    },

    openForm: async function(receipt = null) {
        const isEdit = !!receipt;
        const status = isEdit ? receipt.status : 'Draft';
        const isReadOnly = (status === 'Done' || status === 'Canceled');

        // Render Form Skeleton
        this.container.innerHTML = `
            <div class="view-header" style="margin-bottom:var(--spacing-sm); border:none; padding-bottom:0;">
                <div class="view-header-left">
                    <button class="btn btn-secondary" id="btn-back">← Back</button>
                    ${status === 'Draft' ? `<button class="btn btn-primary" id="btn-mark-ready">Mark as Ready</button>` : ''}
                    <h2 class="view-title" style="margin-left:var(--spacing-md)">Receipt</h2>
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
                    <span class="step ${status === 'Ready' ? 'active' : ''}">Ready</span> >
                    <span class="step ${status === 'Done' ? 'active' : ''}">Done</span>
                    ${status === 'Canceled' ? `<span class="step active" style="color:var(--status-canceled)">Canceled</span>` : ''}
                </div>
            </div>

            <div class="form-document" style="border-top-left-radius:0; border-top-right-radius:0;">
                <div class="doc-ref text-muted" style="margin-bottom:var(--spacing-md)">${isEdit ? receipt.reference : 'New'}</div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>Receive From</label>
                        <input type="text" id="r-contact" value="${isEdit ? (receipt.receiveFrom || '') : ''}" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                    <div class="form-group">
                        <label>Schedule Date</label>
                        <input type="date" id="r-date" value="${isEdit ? (receipt.scheduleDate || '') : new Date().toISOString().split('T')[0]}" ${isReadOnly ? 'disabled' : ''}>
                    </div>
                </div>
                
                <div class="form-group" style="max-width:300px;">
                    <label>Responsible</label>
                    <input type="text" value="${isEdit ? receipt.responsible : window.currentUser?.name}" disabled>
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
                        <tbody id="r-lines-tbody">
                            <!-- Lines injected here -->
                        </tbody>
                        ${!isReadOnly ? `
                        <tfoot>
                            <tr>
                                <td colspan="3"><a href="#" id="add-r-line"> + Add New product</a></td>
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

        // Load Products for Dropdown
        let productOptions = [];
        try {
            const pSnap = await window.fbDb.collection('products').get();
            pSnap.forEach(d => productOptions.push({id: d.id, ...d.data()}));
        } catch(e) {}

        const renderLine = (lineData, index) => {
            const tr = document.createElement('tr');
            
            if(isReadOnly) {
                tr.innerHTML = `
                    <td>${lineData.productLabel}</td>
                    <td>${lineData.quantity}</td>
                `;
            } else {
                let opts = `<option value="">Select Product...</option>`;
                productOptions.forEach(p => {
                    const sel = (p.id === lineData.productId) ? 'selected' : '';
                    opts += `<option value="${p.id}" ${sel}>[${p.sku}] ${p.name}</option>`;
                });
                
                const selectId = `rline-prod-${index}`;
                
                tr.innerHTML = `
                    <td class="editable" style="padding:0">
                        <select id="${selectId}" style="border:none; border-radius:0; height:100%; width:100%; box-shadow:none; padding:0.75rem" required>${opts}</select>
                    </td>
                    <td class="editable" style="padding:0">
                        <input type="number" class="rline-qty" value="${lineData.quantity || 1}" min="1" step="1" required style="border:none; border-radius:0; height:100%; padding:0.75rem;">
                    </td>
                    <td style="text-align:right; padding:0 1rem;">
                        <button class="icon-btn text-error btn-remove-line" title="Remove Line">&times;</button>
                    </td>
                `;
                
                // Keep track of label selected
                setTimeout(() => {
                    const selElement = document.getElementById(selectId);
                    if(selElement) {
                        selElement.addEventListener('change', (e) => {
                            const option = e.target.options[e.target.selectedIndex];
                            tr.dataset.label = option.text;
                        });
                        tr.dataset.label = selElement.options[selElement.selectedIndex]?.text || '';
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
        
        if(!isReadOnly) {
            document.getElementById('add-r-line').addEventListener('click', (e) => {
                e.preventDefault();
                tbody.appendChild(renderLine({}, lineCounter++));
            });

            tbody.addEventListener('click', (e) => {
                if(e.target.classList.contains('btn-remove-line')) {
                    e.target.closest('tr').remove();
                }
            });

            // Gather Data Function
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
                    receiveFrom: document.getElementById('r-contact').value.trim(),
                    scheduleDate: document.getElementById('r-date').value,
                    responsible: window.currentUser?.name || "System Admin",
                    lines: newLines
                };
            };

            const saveReceipt = async (newStatus) => {
                utils.showLoader();
                try {
                    const db = window.fbDb;
                    const data = gatherData();
                    data.status = newStatus;
                    
                    if(data.lines.length === 0 && newStatus !== 'Canceled') throw new Error("At least one product line is required.");

                    if(!isEdit) {
                        // Create New
                        const t = await db.runTransaction(async (transaction) => {
                            const counterRef = db.collection('counters').doc('receipts');
                            const counterDoc = await transaction.get(counterRef);
                            let newCount = 1;
                            if(counterDoc.exists) {
                                newCount = (counterDoc.data().count || 0) + 1;
                            }
                            transaction.set(counterRef, { count: newCount }, { merge: true });
                            
                            const refStr = utils.formatReference('IN', newCount);
                            data.reference = refStr;
                            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                            
                            const newRecRef = db.collection('receipts').doc();
                            transaction.set(newRecRef, data);
                            return newRecRef.id;
                        });
                        utils.showToast("Receipt created", "success");
                        this.openForm({id: t, ...data});
                    } else {
                        // Update existing
                        await db.collection('receipts').doc(receipt.id).update(data);
                        utils.showToast("Receipt updated", "success");
                        receipt.status = newStatus;
                        this.openForm(receipt);
                    }
                } catch(e) {
                    utils.showToast(e.message, "error");
                } finally {
                    utils.hideLoader();
                }
            };

            const saveDraftBtn = document.getElementById('btn-save-draft');
            if(saveDraftBtn) saveDraftBtn.addEventListener('click', () => saveReceipt(status));

            const markReadyBtn = document.getElementById('btn-mark-ready');
            if(markReadyBtn) markReadyBtn.addEventListener('click', () => saveReceipt('Ready'));

            const cancelBtn = document.getElementById('btn-cancel');
            if(cancelBtn) cancelBtn.addEventListener('click', async () => {
                const c = await utils.showConfirm("Cancel Receipt", "Are you sure you want to cancel this operation?");
                if(c) saveReceipt('Canceled');
            });

            // VALIDATE (Done Logic)
            const validateBtn = document.getElementById('btn-validate');
            if(validateBtn) {
                validateBtn.addEventListener('click', async () => {
                    const data = gatherData();
                    if(data.lines.length === 0) return utils.showToast("Cannot validate empty receipt", "error");
                    
                    const confirmed = await utils.showConfirm("Validate Receipt", "This will process the incoming stock permanently. Continue?");
                    if(!confirmed) return;

                    utils.showLoader();
                    const db = window.fbDb;
                    
                    try {
                        const batch = db.batch();
                        // 1. Update Receipt Status
                        data.status = 'Done';
                        data.validatedAt = firebase.firestore.FieldValue.serverTimestamp();
                        batch.update(db.collection('receipts').doc(receipt.id), data);
                        
                        // Default warehouse fallback
                        const whId = data.warehouseId || (await db.collection('warehouses').limit(1).get()).docs[0].id;

                        // 2. Process Lines for Stock and Ledger
                        for(const line of data.lines) {
                            // Find Stock Doc
                            const sReq = await db.collection('stock')
                                .where('productId', '==', line.productId)
                                .where('warehouseId', '==', whId).get();
                            
                            if(sReq.empty) {
                                // Create new stock
                                const sRef = db.collection('stock').doc();
                                batch.set(sRef, {
                                    productId: line.productId,
                                    productName: line.productLabel,
                                    warehouseId: whId,
                                    locationId: "",
                                    onHand: line.quantity,
                                    freeToUse: line.quantity,
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            } else {
                                // Update existing stock
                                const sDoc = sReq.docs[0];
                                const currentStock = sDoc.data().onHand || 0;
                                const currentFree = sDoc.data().freeToUse || 0;
                                batch.update(sDoc.ref, {
                                    onHand: currentStock + line.quantity,
                                    freeToUse: currentFree + line.quantity,
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }

                            // Append Ledger
                            const ledgerRef = db.collection('ledger').doc();
                            batch.set(ledgerRef, {
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                type: "Receipt",
                                reference: receipt.reference,
                                productId: line.productId,
                                productName: line.productLabel,
                                contact: data.receiveFrom || 'Unknown',
                                from: data.receiveFrom || 'Supplier',
                                to: 'Warehouse',
                                quantity: line.quantity,
                                qtyChange: line.quantity,
                                status: "Done"
                            });
                        }

                        await batch.commit();
                        utils.showToast("Receipt Validated Successfully", "success");
                        // Refresh view
                        receipt.status = 'Done';
                        this.openForm(receipt);
                        
                    } catch(err) {
                        utils.showToast(err.message, "error");
                        console.error(err);
                    } finally {
                        utils.hideLoader();
                    }
                });
            }
        }

        const printBtn = document.getElementById('btn-print');
        if(printBtn) printBtn.addEventListener('click', () => window.print());
    }
};
