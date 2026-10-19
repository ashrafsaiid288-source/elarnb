/**
 * Products Controller (List + Create/Edit Modal)
 */

window.productsController = {
    productsList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-product">NEW</button>
                    <h2 class="view-title">Products</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="product-search" placeholder="Search by name or SKU...">
                    </div>
                </div>
            </div>
            
            <div class="table-container" id="products-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>UOM</th>
                            <th>On Hand</th>
                            <th>Reorder Level</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="products-tbody">
                        <tr><td colspan="7" class="text-center text-muted">Loading products...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        // Listeners
        document.getElementById('btn-new-product').addEventListener('click', () => this.openModal());
        
        document.getElementById('product-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.productsList.filter(p => 
                p.name.toLowerCase().includes(val) || 
                p.sku.toLowerCase().includes(val)
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
            utils.showToast("Error loading products", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('products-tbody');
        tbody.innerHTML = '';
        
        if(data.length === 0) {
            utils.showEmptyState('products-table-container', 'No products found.', 'Create Product', () => this.openModal());
            return;
        }
        
        data.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'clickable';
            tr.onclick = () => this.openModal(p);
            
            let statusBadge = '';
            if (p.onHand === 0) {
                statusBadge = '<span class="badge badge-canceled">Out of Stock</span>';
            } else if (p.onHand <= p.reorderLevel) {
                statusBadge = '<span class="badge badge-ready">Low Stock</span>';
            } else {
                statusBadge = '<span class="badge badge-done">In Stock</span>';
            }
            
            tr.innerHTML = `
                <td class="font-weight-600">${p.name}</td>
                <td>${p.sku}</td>
                <td>${p.category}</td>
                <td>${p.uom}</td>
                <td>${p.onHand}</td>
                <td>${p.reorderLevel}</td>
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
                whOptions += `<option value="${doc.id}">${w.name} (${w.shortCode})</option>`;
            });
        }
        
        // Modal DOM
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        modal.innerHTML = `
            <div class="modal-header">
                <div>${isEdit ? 'Edit Product' : 'Create Product'}</div>
                <button class="icon-btn" id="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="product-form">
                    <div class="form-group">
                        <label>Product Name <span class="text-error">*</span></label>
                        <input type="text" id="p-name" value="${isEdit ? product.name : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>SKU (Auto-generated if blank)</label>
                        <input type="text" id="p-sku" value="${isEdit ? product.sku : ''}">
                    </div>
                    
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: 0;">
                        <div class="form-group">
                            <label>Category <span class="text-error">*</span></label>
                            <input type="text" id="p-category" value="${isEdit ? product.category : 'Finished Goods'}" required list="category-list">
                            <datalist id="category-list">
                                <option value="Raw Materials">
                                <option value="Finished Goods">
                                <option value="Packaging">
                                <option value="Consumables">
                            </datalist>
                        </div>
                        <div class="form-group">
                            <label>Unit of Measure <span class="text-error">*</span></label>
                            <select id="p-uom">
                                <option value="pcs" ${isEdit && product.uom==='pcs'?'selected':''}>pcs</option>
                                <option value="kg" ${isEdit && product.uom==='kg'?'selected':''}>kg</option>
                                <option value="ltr" ${isEdit && product.uom==='ltr'?'selected':''}>ltr</option>
                                <option value="m" ${isEdit && product.uom==='m'?'selected':''}>meter</option>
                                <option value="box" ${isEdit && product.uom==='box'?'selected':''}>box</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: 0;">
                        <div class="form-group">
                            <label>Per Unit Cost</label>
                            <input type="number" id="p-cost" value="${isEdit ? product.perUnitCost : 0}" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Reorder Level</label>
                            <input type="number" id="p-reorder" value="${isEdit ? product.reorderLevel : 0}">
                        </div>
                    </div>

                    ${!isEdit ? `
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--border);">
                        <div class="form-group">
                            <label>Initial Stock On Hand</label>
                            <input type="number" id="p-init-stock" value="0" min="0">
                        </div>
                        <div class="form-group">
                            <label>Warehouse (For initial stock)</label>
                            <select id="p-wh">${whOptions}</select>
                        </div>
                    </div>
                    ` : ''}
                </form>
            </div>
            <div class="modal-footer">
                ${isEdit ? '<button class="btn btn-danger" style="margin-right:auto" id="btn-del-product">Delete</button>' : ''}
                <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button class="btn btn-primary" id="modal-save">Save</button>
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
                        throw new Error(`SKU ${saveObj.sku} is already in use.`);
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
                            reference: "INIT-STOCK",
                            productId: newRef.id,
                            productName: saveObj.name,
                            contact: "Initial Import",
                            from: "System",
                            to: "Warehouse",
                            quantity: iStock,
                            qtyChange: iStock,
                            status: "Done"
                        });
                    }
                }
                
                await batch.commit();
                utils.showToast(isEdit ? "Product updated" : "Product created", "success");
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
                    utils.showToast("Cannot delete product with existing stock.", "error");
                    return;
                }
                const c = await utils.showConfirm("Delete Product", `Are you sure you want to delete ${product.name}?`);
                if(c) {
                    utils.showLoader();
                    await window.fbDb.collection('products').doc(product.id).delete();
                    utils.hideLoader();
                    utils.showToast("Product deleted");
                    closeMod();
                    this.fetchData();
                }
            });
        }
    }
};
