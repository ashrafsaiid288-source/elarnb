/**
 * Settings Controller (Warehouses & Locations - Arabic Version)
 */

window.settingsWarehousesController = {
    whList: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        this.fetchData();
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-wh">إضافة مستودع جديد</button>
                    <h2 class="view-title">إدارة المستودعات والمخازن</h2>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>اسم المستودع</th>
                            <th>الكود التعريفي</th>
                            <th>العنوان / الموقع</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="wh-tbody">
                        <tr><td colspan="5" class="text-center text-muted">جاري تحميل المستودعات...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('btn-new-wh').addEventListener('click', () => this.openModal());
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        utils.showLoader();
        try {
            const snap = await window.fbDb.collection('warehouses').get();
            this.whList = [];
            snap.forEach(doc => {
                const w = doc.data();
                w.id = doc.id;
                this.whList.push(w);
            });
            this.populateTable(this.whList);
        } catch (e) {
            console.error(e);
            utils.showToast("خطأ أثناء تحميل بيانات المستودعات", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('wh-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لا توجد مستودعات مسجلة.</td></tr>';
            return;
        }

        data.forEach(w => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-weight-600">${w.name}</td>
                <td><strong>${w.shortCode}</strong></td>
                <td>${w.address || '-'}</td>
                <td><span class="badge badge-${w.isActive ? 'done' : 'canceled'}">${w.isActive ? 'نشط' : 'غير نشط'}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm edit-wh" data-id="${w.id}">تعديل</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.edit-wh').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const wh = this.whList.find(x => x.id === id);
                if(wh) this.openModal(wh);
            });
        });
    },

    openModal: function(warehouse = null) {
        const isEdit = !!warehouse;
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        modal.innerHTML = `
            <div class="modal-header">
                <div>${isEdit ? 'تعديل بيانات المستودع' : 'إضافة مستودع جديد'}</div>
                <button class="icon-btn" id="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="wh-form">
                    <div class="form-group">
                        <label>اسم المستودع <span class="text-error">*</span></label>
                        <input type="text" id="w-name" value="${isEdit ? warehouse.name : ''}" placeholder="مثال: المستودع الرئيسي" required>
                    </div>
                    <div class="form-group">
                        <label>الكود المختصر <span class="text-error">*</span></label>
                        <input type="text" id="w-code" value="${isEdit ? warehouse.shortCode : ''}" required maxlength="5" style="text-transform:uppercase" placeholder="مثال: WH1">
                    </div>
                    <div class="form-group">
                        <label>العنوان / المكان</label>
                        <textarea id="w-address" rows="3" placeholder="العنوان التفصيلي للمستودع">${isEdit ? (warehouse.address || '') : ''}</textarea>
                    </div>
                    <div class="form-group" style="flex-direction:row; align-items:center;">
                        <input type="checkbox" id="w-active" ${(!isEdit || warehouse.isActive) ? 'checked' : ''}>
                        <label for="w-active" style="margin:0 8px 0 0;">المستودع نشط ويعمل حالياً</label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                ${isEdit ? '<button class="btn btn-danger" style="margin-left:auto" id="btn-del-wh">حذف المستودع</button>' : ''}
                <button class="btn btn-secondary" id="modal-cancel">إلغاء</button>
                <button class="btn btn-primary" id="modal-save">حفظ البيانات</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.getElementById('modal-container').appendChild(overlay);
        
        const closeMod = () => document.getElementById('modal-container').removeChild(overlay);
        document.getElementById('modal-close').addEventListener('click', closeMod);
        document.getElementById('modal-cancel').addEventListener('click', closeMod);
        
        document.getElementById('modal-save').addEventListener('click', async () => {
            if(!document.getElementById('wh-form').checkValidity()) {
                document.getElementById('wh-form').reportValidity();
                return;
            }
            
            utils.showLoader();
            const db = window.fbDb;
            
            try {
                const saveObj = {
                    name: document.getElementById('w-name').value.trim(),
                    shortCode: document.getElementById('w-code').value.trim().toUpperCase(),
                    address: document.getElementById('w-address').value.trim(),
                    isActive: document.getElementById('w-active').checked
                };
                
                if(isEdit) {
                    await db.collection('warehouses').doc(warehouse.id).update(saveObj);
                    utils.showToast("تم تحديث بيانات المستودع بنجاح");
                } else {
                    saveObj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('warehouses').add(saveObj);
                    utils.showToast("تمت إضافة المستودع بنجاح", "success");
                }
                closeMod();
                this.fetchData();
            } catch(e) {
                console.error(e);
                utils.showToast(e.message, "error");
            } finally {
                utils.hideLoader();
            }
        });

        if(isEdit) {
            document.getElementById('btn-del-wh').addEventListener('click', async () => {
                const stock = await window.fbDb.collection('stock').where('warehouseId', '==', warehouse.id).limit(1).get();
                if(!stock.empty) return utils.showToast("لا يمكن حذف المستودع: يحتوي على بضائع ومخزون مسجل.", "error");

                if(await utils.showConfirm("حذف المستودع", "هل أنت متأكد من رغبتك في حذف هذا المستودع نهائياً؟")) {
                    utils.showLoader();
                    await window.fbDb.collection('warehouses').doc(warehouse.id).delete();
                    utils.hideLoader();
                    utils.showToast("تم حذف المستودع بنجاح");
                    closeMod();
                    this.fetchData();
                }
            });
        }
    }
};

window.settingsLocationsController = {
    locList: [],
    warehouses: [],

    init: async function(container) {
        this.container = container;
        this.renderList();
        await this.fetchWarehouses();
        this.fetchData();
    },

    renderList: function() {
        this.container.innerHTML = `
            <div class="view-header">
                <div class="view-header-left">
                    <button class="btn btn-primary" id="btn-new-loc">إضافة موقع تخزين جديد</button>
                    <h2 class="view-title">مواقع وأرفف التخزين</h2>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>اسم الموقع / الرف</th>
                            <th>الكود المختصر</th>
                            <th>المستودع التابع له</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="loc-tbody">
                        <tr><td colspan="4" class="text-center text-muted">جاري تحميل مواقع التخزين...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('btn-new-loc').addEventListener('click', () => this.openModal());
    },

    fetchWarehouses: async function() {
        if (!window.fbDb) return;
        try {
            const snap = await window.fbDb.collection('warehouses').get();
            this.warehouses = [];
            snap.forEach(doc => this.warehouses.push({id: doc.id, name: doc.data().name}));
        } catch (e) { console.error(e); }
    },

    fetchData: async function() {
        if (!window.fbDb) return;
        utils.showLoader();
        try {
            const snap = await window.fbDb.collection('locations').get();
            this.locList = [];
            snap.forEach(doc => {
                const l = doc.data();
                l.id = doc.id;
                
                const wh = this.warehouses.find(w => w.id === l.warehouseId);
                l.whName = wh ? wh.name : 'غير محدد';
                
                this.locList.push(l);
            });
            this.populateTable(this.locList);
        } catch (e) {
            console.error(e);
            utils.showToast("خطأ أثناء تحميل مواقع التخزين", "error");
        } finally {
            utils.hideLoader();
        }
    },

    populateTable: function(data) {
        const tbody = document.getElementById('loc-tbody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">لا توجد مواقع تخزين مسجلة.</td></tr>';
            return;
        }

        data.forEach(l => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="font-weight-600">${l.name}</td>
                <td><strong>${l.shortCode}</strong></td>
                <td>${l.whName}</td>
                <td>
                    <button class="btn btn-secondary btn-sm edit-loc" data-id="${l.id}">تعديل</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.edit-loc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const loc = this.locList.find(x => x.id === id);
                if(loc) this.openModal(loc);
            });
        });
    },

    openModal: function(location = null) {
        const isEdit = !!location;
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';

        let whOptions = '<option value="">اختر المستودع...</option>';
        this.warehouses.forEach(w => {
            const sel = (isEdit && location.warehouseId === w.id) ? 'selected' : '';
            whOptions += `<option value="${w.id}" ${sel}>${w.name}</option>`;
        });
        
        modal.innerHTML = `
            <div class="modal-header">
                <div>${isEdit ? 'تعديل موقع التخزين' : 'إضافة موقع تخزين جديد'}</div>
                <button class="icon-btn" id="modal-close-loc">&times;</button>
            </div>
            <div class="modal-body">
                <form id="loc-form">
                    <div class="form-group">
                        <label>اسم الموقع أو الرف <span class="text-error">*</span></label>
                        <input type="text" id="l-name" value="${isEdit ? location.name : ''}" placeholder="مثال: رف أ - 10" required>
                    </div>
                    <div class="form-group">
                        <label>الكود المختصر <span class="text-error">*</span></label>
                        <input type="text" id="l-code" value="${isEdit ? location.shortCode : ''}" required maxlength="6" style="text-transform:uppercase" placeholder="مثال: LOC-A">
                    </div>
                    <div class="form-group">
                        <label>المستودع الرئيسي التابع له <span class="text-error">*</span></label>
                        <select id="l-wh" required>${whOptions}</select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                ${isEdit ? '<button class="btn btn-danger" style="margin-left:auto" id="btn-del-loc">حذف الموقع</button>' : ''}
                <button class="btn btn-secondary" id="modal-cancel-loc">إلغاء</button>
                <button class="btn btn-primary" id="modal-save-loc">حفظ البيانات</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.getElementById('modal-container').appendChild(overlay);
        
        const closeMod = () => document.getElementById('modal-container').removeChild(overlay);
        document.getElementById('modal-close-loc').addEventListener('click', closeMod);
        document.getElementById('modal-cancel-loc').addEventListener('click', closeMod);
        
        document.getElementById('modal-save-loc').addEventListener('click', async () => {
            if(!document.getElementById('loc-form').checkValidity()) {
                document.getElementById('loc-form').reportValidity();
                return;
            }
            
            utils.showLoader();
            const db = window.fbDb;
            
            try {
                const saveObj = {
                    name: document.getElementById('l-name').value.trim(),
                    shortCode: document.getElementById('l-code').value.trim().toUpperCase(),
                    warehouseId: document.getElementById('l-wh').value
                };
                
                if(isEdit) {
                    await db.collection('locations').doc(location.id).update(saveObj);
                    utils.showToast("تم تحديث موقع التخزين بنجاح");
                } else {
                    saveObj.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('locations').add(saveObj);
                    utils.showToast("تمت إضافة موقع التخزين بنجاح", "success");
                }
                closeMod();
                this.fetchData();
            } catch(e) {
                console.error(e);
                utils.showToast(e.message, "error");
            } finally {
                utils.hideLoader();
            }
        });

        if(isEdit) {
            document.getElementById('btn-del-loc').addEventListener('click', async () => {
                if(await utils.showConfirm("حذف الموقع", "هل أنت متأكد من رغبتك في حذف هذا الموقع؟")) {
                    utils.showLoader();
                    await window.fbDb.collection('locations').doc(location.id).delete();
                    utils.hideLoader();
                    utils.showToast("تم حذف موقع التخزين بنجاح");
                    closeMod();
                    this.fetchData();
                }
            });
        }
    }
};
