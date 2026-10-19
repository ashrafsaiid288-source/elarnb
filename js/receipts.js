/**
 * User Profile Controller (Arabic Version)
 */

window.profileController = {
    init: async function(container) {
        this.container = container;
        
        const u = window.currentUser || { name: 'المسؤول', email: '', role: 'مدير النظام' };

        this.container.innerHTML = `
            <div class="view-header">
                <h2 class="view-title">الملف الشخصي والإعدادات</h2>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: var(--spacing-xl); align-items: start;">
                
                <!-- العمود الأيمن: بطاقة الملف الشخصي -->
                <div style="background: var(--surface); padding: var(--spacing-xl); border-radius: var(--border-radius); border: 1px solid var(--border); box-shadow: var(--shadow-sm); text-align: center;">
                    <div style="width: 100px; height: 100px; border-radius: 50%; background: #F3F4F6; color: var(--text-muted); display:flex; align-items:center; justify-content:center; margin: 0 auto 1.5rem auto; border: 2px solid var(--primary);">
                        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                    
                    <h3 style="font-size: 1.5rem; margin-bottom: 0.25rem;">${u.name}</h3>
                    <p class="text-muted" style="margin-bottom: 1rem;">${u.email}</p>
                    <span class="badge badge-waiting" style="font-size: 0.8rem; padding: 0.25rem 0.75rem">${this.translateRole(u.role)}</span>
                    
                    <hr style="border:0; border-top:1px dashed var(--border); margin: 2rem 0;">
                    
                    <div style="text-align: right; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 2rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem">
                            <span>حالة الحساب</span> <strong class="text-success">نشط</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem">
                            <span>عضو منذ</span> <strong>2024</strong>
                        </div>
                    </div>

                    <button class="btn btn-danger btn-block" id="btn-logout-profile">تسجيل الخروج من النظام</button>
                </div>

                <!-- العمود الأيسر: النماذج والتفضيلات -->
                <div>
                    <div style="background: var(--surface); padding: var(--spacing-xl); border-radius: var(--border-radius); border: 1px solid var(--border); box-shadow: var(--shadow-sm); margin-bottom: var(--spacing-xl);">
                        <h3 style="margin-bottom: 1.5rem; display:flex; align-items:center; gap: 0.5rem;">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            البيانات الشخصية
                        </h3>
                        <form id="profile-form">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>الاسم بالكامل</label>
                                    <input type="text" id="prof-name" value="${u.name}" required>
                                </div>
                                <div class="form-group">
                                    <label>البريد الإلكتروني</label>
                                    <input type="email" value="${u.email}" disabled title="لا يمكن تعديل البريد الإلكتروني من هنا">
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary" style="margin-top: 1rem;">حفظ التعديلات</button>
                        </form>
                    </div>

                    <div style="background: var(--surface); padding: var(--spacing-xl); border-radius: var(--border-radius); border: 1px solid var(--border); box-shadow: var(--shadow-sm);">
                        <h3 style="margin-bottom: 1.5rem; display:flex; align-items:center; gap: 0.5rem;">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            تفضيلات التطبيق
                        </h3>
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 1rem 0; border-bottom: 1px solid var(--border);">
                            <div>
                                <h4 style="margin:0">إشعارات البريد الإلكتروني</h4>
                                <p class="text-muted" style="font-size:0.875rem; margin:0">استلام تقارير يومية بملخص حركة المخزون</p>
                            </div>
                            <input type="checkbox" checked style="width: auto;">
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 1rem 0;">
                            <div>
                                <h4 style="margin:0">الوضع الداكن (Dark Mode)</h4>
                                <p class="text-muted" style="font-size:0.875rem; margin:0">تبديل واجهة النظام إلى النمط الليلي</p>
                            </div>
                            <input type="checkbox" id="toggle-dark-mode" style="width: auto;" ${document.body.classList.contains('dark-mode') ? 'checked' : ''}>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update Profile Event
        document.getElementById('profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nName = document.getElementById('prof-name').value.trim();
            if(!nName) return;

            utils.showLoader();
            try {
                const user = window.fbAuth.currentUser;
                if(user) {
                    await window.fbDb.collection('users').doc(user.uid).update({
                        name: nName
                    });
                    
                    window.currentUser.name = nName;
                    utils.showToast("تم تحديث الملف الشخصي بنجاح", "success");
                    this.init(this.container); // re-render
                }
            } catch(err) {
                utils.showToast(err.message, "error");
            } finally {
                utils.hideLoader();
            }
        });

        // Custom Logout Button event for this screen
        document.getElementById('btn-logout-profile').addEventListener('click', async () => {
            if (await utils.showConfirm("تسجيل الخروج", "هل أنت متأكد من رغبتك في تسجيل الخروج من CoreInventory؟")) {
                if (window.fbAuth) {
                    await window.fbAuth.signOut();
                    utils.showToast("تم تسجيل الخروج بنجاح");
                }
            }
        });

        // Dark Mode Toggle Event
        document.getElementById('toggle-dark-mode').addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('coreInventoryTheme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('coreInventoryTheme', 'light');
            }
        });
    },

    translateRole: function(role) {
        switch (role) {
            case 'Admin': return 'مدير النظام';
            case 'Inventory Manager': return 'مدير مخازن';
            case 'User': return 'مستخدم';
            default: return role || 'مستخدم';
        }
    }
};
