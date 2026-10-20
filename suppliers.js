/**
 * Suppliers Controller (شاشة تكويد وإدارة الموردين)
 */

window.suppliersController = {
    suppliersList: [],
    filteredList: [],

    init: async function(container) {
        this.container = container;
        this.renderLayout();
        await this.fetchData();
        this.attachSearchEvents();
    },

    renderLayout: function() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
                <div class="view-header-left" style="display:flex; align-items:center; gap:12px;">
                    <button class="btn btn-primary" onclick="suppliersController.openSupplierModal()" style="display:inline-flex; align-items:center; gap:6px; font-weight:700; padding:0.6rem 1.2rem; border-radius:8px; background:var(--primary); color:#fff; border:none; cursor:pointer;">
                        <span>👤</span>
                        <span>+ إضافة مورد جديد</span>
                    </button>
                    <h2 class="view-title" style="margin:0; font-size:1.5rem; font-weight:800;">دليل الموردين وورش التوريد</h2>
                </div>
                <div class="view-header-right">
                    <div class="search-container" style="display:flex; align-items:center; background:var(--surface-hover); border:1px solid var(--border); border-radius:8px; padding:0.4rem 0.8rem;">
                        <input type="text" id="supplier-search" placeholder="بحث بالاسم، الكود، أو رقم الهاتف..." style="border:none; background:transparent; outline:none; width:240px; font-size:0.9rem;">
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 1rem; color: var(--text-muted); font-size: 0.88rem;" id="suppliers-count-label">
                جاري تحميل الموردين...
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>كود المورد</th>
                            <th>اسم المورد / الورشة</th>
                            <th>رقم الهاتف / واتساب</th>
                            <th>العنوان / المنطقة</th>
                            <th>نوع البضاعة / ملاحظات</th>
                            <th style="text-align:center;">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="suppliers-tbody">
                        <tr><td colspan="6" class="text-center text-muted" style="padding:2rem;">جاري تحميل بيانات الموردين...</td></tr>
                    </tbody>
                </table>
            </div>

            <div id="supplier-modal-container"></div>
        `;
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        if (window.utils && utils.showLoader) utils.showLoader();

        try {
            const snap = await window.fbDb.collection('suppliers').orderBy('createdAt', 'desc').get();
            this.suppliersList = [];

            snap.forEach(doc => {
                const s = doc.data();
                s.id = doc.id;
                this.suppliersList.push(s);
            });

            this.filteredList = [...this.suppliersList];
            this.renderTableRows();

        } catch (e) {
            console.error("Error fetching suppliers:", e);
            if (window.utils && utils.showToast) utils.showToast("خطأ أثناء تحميل الموردين", "error");
        } finally {
            if (window.utils && utils.hideLoader) utils.hideLoader();
        }
    },

    renderTableRows: function() {
        const tbody = document.getElementById('suppliers-tbody');
        const countLabel = document.getElementById('suppliers-count-label');
        if (!tbody) return;

        if (countLabel) {
            countLabel.textContent = `إجمالي الموردين المسجلين: ${this.filteredList.length} مورد`;
        }

        if (this.filteredList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:2.5rem;">لم يتم العثور على أي مورد مسجل. اضغط على "+ إضافة مورد جديد" لتكويد أول مورد.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.filteredList.map(s => {
            const cleanPhone = (s.phone || '').replace(/[^0-9]/g, '');
            const whatsappLink = cleanPhone ? `https://wa.me/2${cleanPhone}` : '#';

            return `
                <tr>
                    <td>
                        <span style="font-family:monospace; font-weight:700; background:var(--surface-hover); padding:3px 8px; border-radius:4px; border:1px solid var(--border);">
                            ${s.code || '-'}
                        </span>
                    </td>
                    <td><strong style="font-size:0.95rem;">${s.name}</strong></td>
                    <td>
                        ${s.phone ? `
                            <a href="${whatsappLink}" target="_blank" style="text-decoration:none; color:#16a34a; font-weight:700; font-family:monospace; display:inline-flex; align-items:center; gap:4px;">
                                <span>📱</span> ${s.phone}
                            </a>
                        ` : '<span class="text-muted">-</span>'}
                    </td>
                    <td>${s.address || '<span class="text-muted">-</span>'}</td>
                    <td><span style="color:var(--text-muted); font-size:0.85rem;">${s.notes || '-'}</span></td>
                    <td style="text-align:center;">
                        <button class="btn btn-sm btn-secondary" onclick="suppliersController.openSupplierModal('${s.id}')" style="cursor:pointer; padding:4px 10px; border-radius:6px;" title="تعديل">✏️ تعديل</button>
                        <button class="btn btn-sm btn-danger" onclick="suppliersController.deleteSupplier('${s.id}', '${s.name}')" style="cursor:pointer; padding:4px 10px; border-radius:6px; background:#dc2626; color:#fff; border:none; margin-right:4px;" title="حذف">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openSupplierModal: function(supplierId = null) {
        const modalContainer = document.getElementById('supplier-modal-container');
        if (!modalContainer) return;

        const isEdit = !!supplierId;
        const supplier = isEdit ? this.suppliersList.find(s => s.id === supplierId) : null;
        const autoCode = 'SUP-' + Math.floor(100 + Math.random() * 900);

        modalContainer.innerHTML = `
            <div class="modal-backdrop" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.55); z-index:9999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(3px);">
                <div class="modal-card" style="background:#fff; border-radius:14px; width:95%; max-width:500px; padding:1.5rem; box-shadow:0 15px 40px rgba(0,0,0,0.2); direction:rtl; text-align:right;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:0.8rem; margin-bottom:1.2rem;">
                        <h3 style="margin:0; font-size:1.2rem; font-weight:800; display:flex; align-items:center; gap:8px;">
                            <span>👤</span> ${isEdit ? 'تعديل بيانات المورد' : 'تكويد مورد جديد'}
                        </h3>
                        <button onclick="suppliersController.closeModal()" style="border:none; background:none; font-size:1.2rem; cursor:pointer; color:#888;">✕</button>
                    </div>

                    <form id="supplier-form" onsubmit="event.preventDefault(); suppliersController.saveSupplier('${supplierId || ''}');">
                        <div style="display:flex; gap:10px; margin-bottom:1rem;">
                            <div style="flex:1;">
                                <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">كود المورد: <span style="color:red;">*</span></label>
                                <input type="text" id="sup-code" value="${isEdit ? supplier.code : autoCode}" required style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd; font-family:monospace; font-weight:700;">
                            </div>
                            <div style="flex:2;">
                                <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">اسم المورد / الورشة: <span style="color:red;">*</span></label>
                                <input type="text" id="sup-name" value="${isEdit ? supplier.name : ''}" placeholder="مثال: ورشة النور للاستانلس" required style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd;">
                            </div>
                        </div>

                        <div style="display:flex; gap:10px; margin-bottom:1rem;">
                            <div style="flex:1;">
                                <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">رقم الهاتف / واتساب:</label>
                                <input type="tel" id="sup-phone" value="${isEdit ? (supplier.phone || '') : ''}" placeholder="01xxxxxxxxx" dir="ltr" style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd;">
                            </div>
                            <div style="flex:1;">
                                <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">العنوان / المنطقة:</label>
                                <input type="text" id="sup-address" value="${isEdit ? (supplier.address || '') : ''}" placeholder="مثال: خان الخليلي / طنطا" style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd;">
                            </div>
                        </div>

                        <div style="margin-bottom:1.4rem;">
                            <label style="display:block; font-size:0.85rem; font-weight:700; margin-bottom:0.35rem;">نوع البضاعة / ملاحظات إضافية:</label>
                            <input type="text" id="sup-notes" value="${isEdit ? (supplier.notes || '') : ''}" placeholder="مثال: مورد سلاسل وانسيالات ليزر 316L" style="width:100%; padding:0.65rem; border-radius:8px; border:1.5px solid #ddd;">
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid #eee; padding-top:1rem;">
                            <button type="button" onclick="suppliersController.closeModal()" style="padding:0.65rem 1.2rem; border-radius:8px; border:1px solid #ccc; background:#f7f7f7; cursor:pointer;">إلغاء</button>
                            <button type="submit" id="btn-save-supplier" style="padding:0.65rem 1.4rem; border-radius:8px; border:none; background:#16a34a; color:#fff; font-weight:700; cursor:pointer;">
                                ${isEdit ? 'حفظ التعديلات' : 'تأكيد وحفظ المورد'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    saveSupplier: async function(supplierId) {
        const code = document.getElementById('sup-code').value.trim();
        const name = document.getElementById('sup-name').value.trim();
        const phone = document.getElementById('sup-phone').value.trim();
        const address = document.getElementById('sup-address').value.trim();
        const notes = document.getElementById('sup-notes').value.trim();

        if (!code || !name) {
            if (window.utils && utils.showToast) utils.showToast("يرجى ملء كود واسم المورد", "error");
            return;
        }

        const btn = document.getElementById('btn-save-supplier');
        if (btn) { btn.disabled = true; btn.textContent = "جاري الحفظ..."; }

        try {
            const data = {
                code,
                name,
                phone,
                address,
                notes,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (supplierId) {
                await window.fbDb.collection('suppliers').doc(supplierId).update(data);
                if (window.utils && utils.showToast) utils.showToast("تم تحديث بيانات المورد بنجاح", "success");
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await window.fbDb.collection('suppliers').add(data);
                if (window.utils && utils.showToast) utils.showToast(`تم تكويد المورد (${name}) بنجاح`, "success");
            }

            this.closeModal();
            await this.fetchData();

        } catch (err) {
            console.error("Error saving supplier:", err);
            if (window.utils && utils.showToast) utils.showToast("حدث خطأ أثناء حفظ المورد", "error");
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    deleteSupplier: async function(supplierId, supplierName) {
        const confirmed = window.utils && utils.showConfirm 
            ? await utils.showConfirm("حذف مورد", `هل أنت متأكد من رغبتك في حذف المورد "${supplierName}"؟`)
            : confirm(`هل أنت متأكد من حذف "${supplierName}"؟`);

        if (!confirmed) return;

        try {
            await window.fbDb.collection('suppliers').doc(supplierId).delete();
            if (window.utils && utils.showToast) utils.showToast("تم حذف المورد بنجاح", "success");
            await this.fetchData();
        } catch (e) {
            console.error(e);
            if (window.utils && utils.showToast) utils.showToast("تعذر حذف المورد", "error");
        }
    },

    closeModal: function() {
        const modalContainer = document.getElementById('supplier-modal-container');
        if (modalContainer) modalContainer.innerHTML = '';
    },

    attachSearchEvents: function() {
        const searchInput = document.getElementById('supplier-search');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            this.filteredList = this.suppliersList.filter(s => 
                (s.name || '').toLowerCase().includes(val) ||
                (s.code || '').toLowerCase().includes(val) ||
                (s.phone || '').toLowerCase().includes(val) ||
                (s.address || '').toLowerCase().includes(val)
            );
            this.renderTableRows();
        });
    }
};
