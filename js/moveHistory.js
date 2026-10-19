/**
 * Movement History / Ledger Controller (Arabic Version)
 */

window.moveHistoryController = {
    historyList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    translateType: function(type) {
        switch (type) {
            case 'Receipt': return 'إذن استلام (وارد)';
            case 'Delivery': return 'إذن صرف (منصرف)';
            case 'Transfer': return 'تحويل داخلي';
            case 'Adjustment': return 'تسوية مخزنية';
            default: return type || '-';
        }
    },

    translateStatus: function(status) {
        switch (status) {
            case 'Draft': return 'مسودة';
            case 'Waiting': return 'قيد الانتظار';
            case 'Ready': return 'جاهز';
            case 'Done': return 'مكتمل';
            case 'Canceled': return 'ملغي';
            default: return status || '-';
        }
    },

    translateLocation: function(loc) {
        if (!loc) return '-';
        if (loc === 'Warehouse' || loc === 'Main Warehouse') return 'المستودع الرئيسي';
        if (loc === 'Vendors' || loc === 'Suppliers') return 'الموردين';
        if (loc === 'Customers') return 'العملاء';
        return loc;
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <h2 class="view-title">سجل حركات المخزن</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container">
                        <input type="text" id="hist-search" placeholder="بحث برقم الإذن، اسم المنتج، أو نوع الحركة...">
                    </div>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>رقم المرجع / الإذن</th>
                            <th>المنتج / الصنف</th>
                            <th>نوع العملية</th>
                            <th>من</th>
                            <th>إلى</th>
                            <th>التغيير في الكمية</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody id="hist-tbody">
                        <tr><td colspan="8" class="text-center text-muted">جاري تحميل سجل الحركات...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('hist-search').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = this.historyList.filter(h => 
                (h.reference || '').toLowerCase().includes(val) || 
                (h.productName || '').toLowerCase().includes(val) ||
                (h.type || '').toLowerCase().includes(val) ||
                (this.translateType(h.type) || '').toLowerCase().includes(val) ||
                (this.translateStatus(h.status) || '').toLowerCase().includes(val)
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
            utils.showToast("خطأ أثناء تحميل سجل الحركات", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('hist-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">لا توجد حركات مخزنية مسجلة.</td></tr>';
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
                <td class="font-weight-600">${h.reference || '-'}</td>
                <td><strong>${h.productName || '-'}</strong></td>
                <td>${this.translateType(h.type)}</td>
                <td>${this.translateLocation(h.from)}</td>
                <td>${this.translateLocation(h.to)}</td>
                <td dir="ltr" style="text-align:right; font-weight:600; color:${h.qtyChange > 0 ? 'var(--status-done)' : (h.qtyChange < 0 ? 'var(--status-canceled)' : 'inherit')}">${diffStr}</td>
                <td><span class="badge badge-${(h.status || '').toLowerCase()}">${this.translateStatus(h.status)}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
};
