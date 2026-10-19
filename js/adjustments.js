/**
 * Adjustments Controller (Inventory Adustments)
 */

window.adjustmentsController = {
    adjustmentsList: [],
    
    // Will hold current warehouse stock map
    currentStockMap: {},

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-adj">NEW</button>
                    <h2 class="view-title">Adjustments</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="adj-search" placeholder="Search ref or reason...">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Warehouse</th>
                            <th>Reason</th>
                            <th>Lines</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody id="adj-tbody">
                        <tr><td colspan="6" class="text-center text-muted">Loading adjustments...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('btn-new-adj').addEventListener('click', () => this.openForm());
        
        document.getElementById('adj-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.adjustmentsList.filter(a => 
                (a.reference || '').toLowerCase().includes(val) || 
                (a.reason || '').toLowerCase().includes(val)
            );
            this.populateTable(filtered);
        });
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        utils.showLoader();
        try {
            const whSnap = await window.fbDb.collection('warehouses').get();
            const whMap = {};
            whSnap.forEach(d => whMap[d.id] = d.data().name);

            const snap = await window.fbDb.collection('adjustments').orderBy('createdAt', 'desc').get();
            this.adjustmentsList = [];
            snap.forEach(doc => {
                const a = doc.data();
                a.id = doc.id;
                a.whName = whMap[a.warehouseId] || 'Unknown';
                this.adjustmentsList.push(a);
            });
            this.populateTable(this.adjustmentsList);
        } catch (e) {
            console.error(e);
            utils.showToast("Error loading adjustments", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('adj-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No adjustments found.</td></tr>';
            return;
        }
        
        data.forEach(a => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => this.openForm(a);
            tr.innerHTML = `
                <td class="font-weight-600">${a.reference || 'Draft'}</td>
                <td>${a.whName}</td>
                <td>${a.reason}</td>
                <td>${(a.lines || []).length}</td>
                <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
                <td>${utils.formatDate(a.createdAt ? a.createdAt.toDate() : new Date().toISOString())}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    openForm: async function(adj = null) {
        const isEdit = !!adj;
        const status = isEdit ? adj.status : 'Draft';
        const isReadOnly = (status === 'Done'); // Only Draft or Done

        let whOptions = '<option value="">Select Warehouse...</option>';
        try {
            const wSnap = await window.fbDb.collection('warehouses').get();
            wSnap.forEach(doc => {
                whOptions += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
        } catch(e) {}

        this.container.innerHTML = `
            <div class="view-header" style="margin-bottom:var(--spacing-sm); border:none; padding-bottom:0;">
                <div class="view-header-left">
                    <button class="btn btn-secondary" id="btn-back">← Back</button>
                    <h2 class="view-title" style="margin-left:var(--spacing-md)">Adjustment</h2>
                </div>
            </div>
            
            <div class="doc-header" style="background:var(--surface); padding:var(--spacing-md); border:1px solid var(--border); border-bottom:none; border-radius:var(--border-radius) var(--border-radius) 0 0; margin-bottom:0; display:flex; align-items:center;">
                <div style="flex:1;">
                    ${status === 'Draft' ? `<button class="btn btn-success" id="btn-apply-adj" style="background:var(--status-done); color:white; border:none; padding:0.5rem 1rem; border-radius:4px; margin-right:8px;">Apply Adjustment</button>` : ''}
                    ${status === 'Draft' ? `<button class="btn btn-secondary" id="btn-cancel">Cancel</button>` : ''}
                </div>
                
                <div class="status-pipeline">
                    <span class="step ${status === 'Draft' ? 'active' : ''}">Draft</span> >
                    <span class="step ${status === 'Done' ? 'active' : ''}">Done</span>
                </div>
            </div>

            <div class="form-document" style="border-top-left-radius:0; border-top-right-radius:0;">
                <div class="doc-ref text-muted" style="margin-bottom:var(--spacing-md)">${isEdit ? adj.reference : 'New'}</div>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label>Warehouse</label>
                        <select id="a-wh" ${isReadOnly ? 'disabled' : ''}>${whOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>Reason</label>
                        <select id="a-reason" ${isReadOnly ? 'disabled' : ''}>
                            <option value="Count Correction" ${isEdit && adj.reason==='Count Correction'?'selected':''}>Count Correction</option>
                            <option value="Damaged" ${isEdit && adj.reason==='Damaged'?'selected':''}>Damaged</option>
                            <option value="Other" ${isEdit && adj.reason==='Other'?'selected':''}>Other</option>
                        </select>
                    </div>
                </div>

                <div class="table-container lines-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>System Qty</th>
                                <th>Counted Qty</th>
                                <th>Difference</th>
                            </tr>
                        </thead>
                        <tbody id="a-lines-tbody"></tbody>
                        ${!isReadOnly ? `
                        <tfoot>
                            <tr>
                                <td colspan="4"><a href="#" id="add-a-line"> + Add New product</a></td>
                            </tr>
                        </tfoot>` : ''}
                    </table>
                </div>
            </div>
        `;

        if(isEdit) document.getElementById('a-wh').value = adj.warehouseId;

        // Fetch products for dropdown
        let productOptions = [];
        try {
            const pSnap = await window.fbDb.collection('products').get();
            pSnap.forEach(d => productOptions.push({id: d.id, ...d.data()}));
        } catch(e) {}

        const tbody = document.getElementById('a-lines-tbody');

        const calcDiff = (tr) => {
            const sys = parseInt(tr.dataset.sysQty) || 0;
            const cntInp = tr.querySelector('.aline-count');
            const cnt = parseInt(cntInp?.value) || 0;
            const diff = cnt - sys;
            
            const diffSpan = tr.querySelector('.diff-val');
            if(diffSpan) {
                diffSpan.textContent = diff > 0 ? `+${diff}` : diff;
                diffSpan.style.color = diff > 0 ? 'var(--status-done)' : (diff < 0 ? 'var(--status-canceled)' : 'var(--text-muted)');
            }
        };

        const renderLine = (lineData, index) => {
            const tr = document.createElement('tr');
            const sysQty = lineData.systemQty || 0;
            const cntQty = lineData.countedQty === undefined ? sysQty : lineData.countedQty;
            const diff = cntQty - sysQty;
            
            tr.dataset.sysQty = sysQty;
            
            const dpHTML = `<span class="diff-val" style="font-weight:600; color:${diff > 0 ? 'var(--status-done)' : (diff < 0 ? 'var(--status-canceled)' : 'inherit')}">${diff > 0 ? '+'+diff : diff}</span>`;

            if(isReadOnly) {
                tr.innerHTML = `
                    <td>${lineData.productLabel}</td>
                    <td>${sysQty}</td>
                    <td>${cntQty}</td>
                    <td>${dpHTML}</td>
                `;
            } else {
                let opts = `<option value="">Select Product...</option>`;
                productOptions.forEach(p => {
                    const sel = (p.id === lineData.productId) ? 'selected' : '';
                    opts += `<option value="${p.id}" ${sel}>[${p.sku}] ${p.name}</option>`;
                });
                const selectId = `aline-prod-${index}`;
                
                tr.innerHTML = `
                    <td class="editable" style="padding:0">
                        <select id="${selectId}" style="border:none; height:100%; width:100%; padding:0.75rem" required>${opts}</select>
                    </td>
                    <td class="sys-val" style="padding-left:1rem">${sysQty}</td>
                    <td class="editable" style="padding:0">
                        <input type="number" class="aline-count" value="${cntQty}" min="0" required style="border:none; height:100%; padding:0.75rem;">
                    </td>
                    <td style="padding-left:1rem">${dpHTML}</td>
                `;
                
                setTimeout(() => {
                    const el = document.getElementById(selectId);
                    const countEl = tr.querySelector('.aline-count');

                    // If prod changes, try to fetch system qty
                    el.addEventListener('change', async (e) => {
                        tr.dataset.label = e.target.options[e.target.selectedIndex].text;
                        const pId = e.target.value;
                        const wId = document.getElementById('a-wh').value;
                        if(pId && wId) {
                            try {
                                const sq = await window.fbDb.collection('stock').where('productId','==',pId).where('warehouseId','==',wId).get();
                                const sqv = sq.empty ? 0 : (sq.docs[0].data().onHand || 0);
                                tr.dataset.sysQty = sqv;
                                tr.querySelector('.sys-val').textContent = sqv;
                                countEl.value = sqv;
                                calcDiff(tr);
                            } catch(err){}
                        }
                    });

                    countEl.addEventListener('input', () => calcDiff(tr));
                }, 0);
            }
            return tr;
        };

        const lines = isEdit ? (adj.lines || []) : [];
        let lineCounter = 0;
        lines.forEach(l => tbody.appendChild(renderLine(l, lineCounter++)));

        document.getElementById('btn-back').addEventListener('click', () => this.init(this.container));
        
        if(!isReadOnly) {
            document.getElementById('add-a-line').addEventListener('click', (e) => {
                e.preventDefault();
                tbody.appendChild(renderLine({}, lineCounter++));
            });

            document.getElementById('btn-cancel').addEventListener('click', () => this.init(this.container));

            // APPLY ADJUSTMENT LOGIC
            const btnApply = document.getElementById('btn-apply-adj');
            if(btnApply) {
                btnApply.addEventListener('click', async () => {
                    const trs = tbody.querySelectorAll('tr');
                    const newLines = [];
                    trs.forEach(tr => {
                        const sel = tr.querySelector('select');
                        const cntInp = tr.querySelector('.aline-count');
                        if(sel && sel.value && cntInp) {
                            const sq = parseInt(tr.dataset.sysQty) || 0;
                            const cq = parseInt(cntInp.value) || 0;
                            newLines.push({
                                productId: sel.value,
                                productLabel: tr.dataset.label || sel.options[sel.selectedIndex].text,
                                systemQty: sq,
                                countedQty: cq,
                                difference: cq - sq
                            });
                        }
                    });

                    const wId = document.getElementById('a-wh').value;
                    if(!wId) return utils.showToast("Please select a warehouse", "error");
                    if(newLines.length === 0) return utils.showToast("No products added", "error");

                    const confirmed = await utils.showConfirm("Apply Adjustment", "This will replace current stock counts permanently. Continue?");
                    if(!confirmed) return;

                    utils.showLoader();
                    const db = window.fbDb;
                    
                    try {
                        let docId = isEdit ? adj.id : null;
                        let aRefStr = isEdit ? adj.reference : null;

                        const batch = db.batch();

                        // 1. Generate Ref if New
                        if(!docId) {
                            const cRef = db.collection('counters').doc('adjustments');
                            const cDoc = await cRef.get();
                            const c = cDoc.exists ? (cDoc.data().count || 0) + 1 : 1;
                            batch.set(cRef, { count: c }, { merge: true });
                            aRefStr = utils.formatReference('ADJ', c);
                            docId = db.collection('adjustments').doc().id;
                        }

                        // 2. Adjust Stock ABSOLUTELY & Append to Ledger
                        for(const line of newLines) {
                            if(line.difference === 0) continue; // no change

                            // Apply Absolute change to stock
                            const sReq = await db.collection('stock').where('productId', '==', line.productId).where('warehouseId', '==', wId).get();
                            if(sReq.empty) {
                                batch.set(db.collection('stock').doc(), {
                                    productId: line.productId, productName: line.productLabel, warehouseId: wId, locationId: "",
                                    onHand: line.countedQty, freeToUse: line.countedQty, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            } else {
                                const sDoc = sReq.docs[0];
                                // We are REPLACING the value, not summing
                                batch.update(sDoc.ref, {
                                    onHand: line.countedQty,
                                    freeToUse: (sDoc.data().freeToUse || 0) + line.difference, // adjust freeToUse relative to diff
                                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }

                            // Append Ledger
                            batch.set(db.collection('ledger').doc(), {
                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                type: "Adjustment",
                                reference: aRefStr,
                                productId: line.productId,
                                productName: line.productLabel,
                                contact: "Inventory Count",
                                from: "Warehouse", to: "Warehouse",
                                quantity: Math.abs(line.difference),
                                qtyChange: line.difference,
                                status: "Done"
                            });
                        }

                        // 3. Save Adjustment Doc
                        const adjData = {
                            reference: aRefStr,
                            warehouseId: wId,
                            reason: document.getElementById('a-reason').value,
                            lines: newLines,
                            status: 'Done',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };

                        batch.set(db.collection('adjustments').doc(docId), adjData, { merge: true });
                        
                        await batch.commit();
                        utils.showToast("Stock Adjustment Applied", "success");
                        this.openForm({id: docId, ...adjData});

                    } catch(err) {
                        utils.showToast(err.message, "error");
                    } finally {
                        utils.hideLoader();
                    }
                });
            }
        }
    }
};
