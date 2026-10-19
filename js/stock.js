/**
 * Stock Overview Controller
 */

window.stockController = {
    stockList: [],
    whMap: {},
    prMap: {},

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <h2 class="view-title">Current Stock</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="stock-search" placeholder="Search product or warehouse...">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Warehouse</th>
                            <th>Location</th>
                            <th>On Hand</th>
                            <th>Free to Use</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="stock-tbody">
                        <tr><td colspan="8" class="text-center text-muted">Loading stock data...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Inline Stock Edit Modal -->
            <div id="stock-edit-modal" class="modal-overlay hidden">
                <div class="modal-box" style="max-width: 420px;">
                    <div class="modal-header">
                        <h3 id="stock-edit-title">Adjust Stock</h3>
                        <button class="btn-close" id="stock-edit-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Product</label>
                            <input type="text" id="stock-edit-product-name" disabled>
                        </div>
                        <div class="form-group">
                            <label>Warehouse</label>
                            <input type="text" id="stock-edit-wh-name" disabled>
                        </div>
                        <div class="form-group">
                            <label for="stock-edit-onhand">On Hand Quantity</label>
                            <input type="number" id="stock-edit-onhand" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="stock-edit-free">Free to Use Quantity</label>
                            <input type="number" id="stock-edit-free" min="0" required>
                        </div>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
                            ⚠️ Manual stock edits bypass normal flow. Use Adjustments for full audit trail.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="stock-edit-cancel">Cancel</button>
                        <button class="btn btn-primary" id="stock-edit-save">Save Changes</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('stock-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.stockList.filter(s => 
                (s.productName || '').toLowerCase().includes(val) || 
                (s.productSku || '').toLowerCase().includes(val) ||
                (s.whName || '').toLowerCase().includes(val)
            );
            this.populateTable(filtered);
        });

        // Modal close
        document.getElementById('stock-edit-close').addEventListener('click', () => this.closeModal());
        document.getElementById('stock-edit-cancel').addEventListener('click', () => this.closeModal());
        document.getElementById('stock-edit-save').addEventListener('click', () => this.saveEdit());
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        utils.showLoader();
        try {
            const whSnap = await window.fbDb.collection('warehouses').get();
            this.whMap = {};
            whSnap.forEach(d => this.whMap[d.id] = d.data().name);

            const prSnap = await window.fbDb.collection('products').get();
            this.prMap = {};
            const prReorderMap = {};
            prSnap.forEach(d => {
                this.prMap[d.id] = d.data().sku;
                prReorderMap[d.id] = d.data().reorderLevel || 0;
            });

            const snap = await window.fbDb.collection('stock').get();
            this.stockList = [];
            snap.forEach(doc => {
                const s = doc.data();
                s.id = doc.id;
                s.whName = this.whMap[s.warehouseId] || 'Unknown WH';
                s.productSku = this.prMap[s.productId] || 'N/A';
                s.reorderLvl = prReorderMap[s.productId] || 0;
                
                if(s.onHand !== 0 || s.freeToUse !== 0) {
                    this.stockList.push(s);
                }
            });
            this.populateTable(this.stockList);
        } catch (e) {
            console.error(e);
            utils.showToast("Error loading stock data", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('stock-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No stock available.</td></tr>';
            return;
        }
        
        data.forEach(s => {
            const tr = document.createElement('tr');
            
            let stat = '';
            if(s.onHand <= 0) stat = '<span class="badge badge-canceled">Out of Stock</span>';
            else if(s.onHand <= s.reorderLvl) stat = '<span class="badge badge-ready">Low Stock</span>';
            else stat = '<span class="badge badge-done">In Stock</span>';

            tr.innerHTML = `
                <td class="font-weight-600">${s.productName}</td>
                <td>${s.productSku}</td>
                <td>${s.whName}</td>
                <td>${s.locationId || '-'}</td>
                <td class="font-weight-600">${s.onHand}</td>
                <td>${s.freeToUse}</td>
                <td>${stat}</td>
                <td>
                    <button class="btn btn-secondary btn-edit-stock" data-id="${s.id}" style="padding: 0.3rem 0.75rem; font-size: 0.8rem;">
                        ✏️ Edit
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach edit listeners after rendering
        tbody.querySelectorAll('.btn-edit-stock').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const stockItem = this.stockList.find(s => s.id === id);
                if (stockItem) this.openModal(stockItem);
            });
        });
    },

    currentEditId: null,

    openModal: function(stockItem) {
        this.currentEditId = stockItem.id;
        document.getElementById('stock-edit-product-name').value = stockItem.productName || '';
        document.getElementById('stock-edit-wh-name').value = stockItem.whName || '';
        document.getElementById('stock-edit-onhand').value = stockItem.onHand || 0;
        document.getElementById('stock-edit-free').value = stockItem.freeToUse || 0;
        document.getElementById('stock-edit-title').textContent = `Adjust: ${stockItem.productName}`;
        document.getElementById('stock-edit-modal').classList.remove('hidden');
    },

    closeModal: function() {
        this.currentEditId = null;
        document.getElementById('stock-edit-modal').classList.add('hidden');
    },

    saveEdit: async function() {
        if (!this.currentEditId || !window.fbDb) return;

        const onHand = parseInt(document.getElementById('stock-edit-onhand').value, 10);
        const freeToUse = parseInt(document.getElementById('stock-edit-free').value, 10);

        if (isNaN(onHand) || isNaN(freeToUse) || onHand < 0 || freeToUse < 0) {
            utils.showToast("Please enter valid non-negative quantities.", "error");
            return;
        }

        utils.showLoader();
        try {
            await window.fbDb.collection('stock').doc(this.currentEditId).update({ onHand, freeToUse });
            utils.showToast("Stock updated successfully!", "success");
            this.closeModal();
            this.fetchData(); // Refresh table
        } catch(e) {
            console.error(e);
            utils.showToast("Failed to update stock.", "error");
        } finally {
            utils.hideLoader();
        }
    }
};
