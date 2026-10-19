/**
 * Movement History / Ledger Controller
 */

window.moveHistoryController = {
    historyList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <h2 class="view-title">Movement History</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="hist-search" placeholder="Search ref, product, or type...">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Reference</th>
                            <th>Product</th>
                            <th>Type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Qty Change</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="hist-tbody">
                        <tr><td colspan="8" class="text-center text-muted">Loading history...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('hist-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.historyList.filter(h => 
                (h.reference || '').toLowerCase().includes(val) || 
                (h.productName || '').toLowerCase().includes(val) ||
                (h.type || '').toLowerCase().includes(val)
            );
            this.populateTable(filtered);
        });
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        utils.showLoader();
        try {
            const snap = await window.fbDb.collection('ledger').orderBy('timestamp', 'desc').get();
            this.historyList = [];
            snap.forEach(doc => {
                const h = doc.data();
                h.id = doc.id;
                this.historyList.push(h);
            });
            this.populateTable(this.historyList);
        } catch (e) {
            console.error(e);
            utils.showToast("Error loading movement history", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('hist-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No movement history found.</td></tr>';
            return;
        }
        
        data.forEach(h => {
            const tr = document.createElement('tr');
            
            // Color row slightly based on IN/OUT
            if (h.qtyChange > 0) tr.classList.add('row-in');
            else if (h.qtyChange < 0) tr.classList.add('row-out');

            const diffStr = h.qtyChange > 0 ? `+${h.qtyChange}` : h.qtyChange;
            const dateStr = h.timestamp ? utils.formatDate(h.timestamp.toDate()) : '-';

            tr.innerHTML = `
                <td style="white-space:nowrap">${dateStr}</td>
                <td class="font-weight-600">${h.reference}</td>
                <td>${h.productName}</td>
                <td>${h.type}</td>
                <td>${h.from || '-'}</td>
                <td>${h.to || '-'}</td>
                <td style="font-weight:600; color:${h.qtyChange>0?'var(--status-done)':(h.qtyChange<0?'var(--status-canceled)':'inherit')}">${diffStr}</td>
                <td><span class="badge badge-${(h.status||'').toLowerCase()}">${h.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
};
