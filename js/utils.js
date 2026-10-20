/**
 * CoreInventory Utilities & Helpers (High-Performance & Cached)
 */

window.utils = window.utils || {};
var utils = window.utils;

// متغير مؤقت لحماية شاشة التحميل من التعليق
let _loaderSafetyTimer = null;

// ==========================================
// 1. نظام الكاش السريع (Memory Cache)
// ==========================================
utils.cache = {
    products: null,
    warehouses: null,
    lastProductsFetch: 0,
    lastWarehousesFetch: 0,
    CACHE_DURATION: 300000 // 5 دقائق صلاحية الكاش
};

// جلب المنتجات من الكاش فوراً أو من فايربيز لو لم تكن محملة
utils.getProducts = async function(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && utils.cache.products && (now - utils.cache.lastProductsFetch < utils.cache.CACHE_DURATION)) {
        return utils.cache.products;
    }
    if (!window.fbDb) return [];
    try {
        const snap = await window.fbDb.collection('products').get();
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        utils.cache.products = list;
        utils.cache.lastProductsFetch = now;
        return list;
    } catch (err) {
        console.error("Cache getProducts error:", err);
        return utils.cache.products || [];
    }
};

// جلب المستودعات من الكاش
utils.getWarehouses = async function(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && utils.cache.warehouses && (now - utils.cache.lastWarehousesFetch < utils.cache.CACHE_DURATION)) {
        return utils.cache.warehouses;
    }
    if (!window.fbDb) return [];
    try {
        const snap = await window.fbDb.collection('warehouses').get();
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        utils.cache.warehouses = list;
        utils.cache.lastWarehousesFetch = now;
        return list;
    } catch (err) {
        console.error("Cache getWarehouses error:", err);
        return utils.cache.warehouses || [];
    }
};

// مسح الكاش يدوياً عند إضافة منتج جديد
utils.invalidateProductsCache = function() {
    utils.cache.products = null;
};

// ==========================================
// 2. دوال التنسيق والتواريخ
// ==========================================
utils.formatDate = function(dateVal) {
    if (!dateVal) return '-';
    if (typeof dateVal === 'object' && dateVal.seconds) {
        return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
    }
    return String(dateVal);
};

utils.formatReference = function(prefix, number) {
    const padded = String(number).padStart(5, '0');
    return `${prefix}${padded}`;
};

// ==========================================
// 3. شاشة التحميل الذكية (مع حماية من التعليق)
// ==========================================
utils.showLoader = function() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('hidden');

    // حماية: إذا علق أي كود أو تأخرت الشبكة، يتم إغلاق اللودر تلقائياً بعد 3.5 ثانية
    clearTimeout(_loaderSafetyTimer);
    _loaderSafetyTimer = setTimeout(() => {
        utils.hideLoader();
    }, 3500);
};

utils.hideLoader = function() {
    clearTimeout(_loaderSafetyTimer);
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
};

// ==========================================
// 4. الإشعارات ورسائل التأكيد
// ==========================================
utils.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

utils.showConfirm = function(title, message) {
    return new Promise((resolve) => {
        const confirmed = window.confirm(`${title}\n\n${message}`);
        resolve(confirmed);
    });
};

// ==========================================
// 5. طباعة الفواتير وأذون الاستلام والصرف A4
// ==========================================
utils.printDocumentSlip = function(doc) {
    if (!doc) return this.showToast("لا توجد بيانات للطباعة", "error");

    const lines = doc.lines || [];
    const isOut = (doc.reference || '').startsWith('OUT') || doc.type === 'delivery';
    const docTitle = isOut ? "إذن صرف بضاعة / فاتورة تسليم" : "إذن استلام وتوريد بضاعة";
    const contactLabel = isOut ? "العميل / جهة الاستلام" : "المورد / جهة التوريد";

    const totalQty = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

    const rowsHtml = lines.map((item, index) => {
        const name = item.productLabel || item.name || 'صنف';
        const qty = item.quantity || 0;
        return `
            <tr>
                <td style="text-align: center; font-weight: bold; width: 40px;">${index + 1}</td>
                <td><strong>${name}</strong></td>
                <td style="text-align: center; font-weight: 800; font-size: 14px; width: 130px;">${qty} وحدة</td>
                <td style="text-align: center; width: 120px;">جاهز للتسليم</td>
            </tr>
        `;
    }).join('');

    const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>طباعة ${doc.reference || 'إذن مخزني'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
            body { background: #fff; color: #0f172a; padding: 24px; font-size: 13px; line-height: 1.6; }
            .slip-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
            .brand-name { font-size: 24px; font-weight: 900; color: #4338ca; }
            .brand-sub { font-size: 12px; color: #64748b; font-weight: 600; }
            .doc-title { font-size: 18px; font-weight: 800; color: #0f172a; }
            .doc-ref-badge { display: inline-block; background: #f1f5f9; border: 1.5px solid #cbd5e1; padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 15px; font-weight: 900; color: #4338ca; margin-top: 6px; }
            .info-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; }
            .info-line { display: flex; margin-bottom: 6px; }
            .info-label { width: 130px; color: #64748b; font-weight: 700; }
            .info-value { font-weight: 700; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; }
            th { background: #f1f5f9; color: #1e293b; font-weight: 800; font-size: 12px; }
            .total-box { display: flex; justify-content: flex-end; margin-bottom: 30px; }
            .total-table { width: 320px; border: 1px solid #cbd5e1; }
            .total-table td { padding: 8px 14px; font-weight: 800; font-size: 14px; }
            .signatures-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; padding-top: 24px; border-top: 1px dashed #cbd5e1; text-align: center; }
            .sig-box { padding: 8px; }
            .sig-title { font-weight: 800; color: #334155; margin-bottom: 45px; }
            .sig-line { border-bottom: 1.5px solid #0f172a; margin: 0 10px; }
            .sig-sub { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 6px; }
            .footer-note { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="slip-header">
            <div>
                <div class="brand-name">CoreInventory 📦</div>
                <div class="brand-sub">إدارة المخازن والمستودعات والخدمات اللوجستية</div>
            </div>
            <div style="text-align: left;">
                <div class="doc-title">${docTitle}</div>
                <div class="doc-ref-badge">${doc.reference || 'مسودة جديدة'}</div>
            </div>
        </div>

        <div class="info-grid">
            <div>
                <div class="info-line">
                    <span class="info-label">${contactLabel}:</span>
                    <span class="info-value">${doc.deliveryAddress || doc.supplier || doc.contact || 'غير محدد'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">المستودع:</span>
                    <span class="info-value">المستودع الرئيسي</span>
                </div>
            </div>
            <div>
                <div class="info-line">
                    <span class="info-label">التاريخ:</span>
                    <span class="info-value">${doc.scheduleDate || new Date().toISOString().split('T')[0]}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">الحالة:</span>
                    <span class="info-value" style="color: #059669;">${doc.status || 'معتمد'}</span>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 40px; text-align: center;">#</th>
                    <th>اسم الصنف ومواصفاته</th>
                    <th style="width: 130px; text-align: center;">الكمية</th>
                    <th style="width: 120px; text-align: center;">الملاحظات</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding: 20px;">لا توجد أصناف مدرجة</td></tr>'}
            </tbody>
        </table>

        <div class="total-box">
            <table class="total-table">
                <tr>
                    <td style="background: #f8fafc;">إجمالي عدد الوحدات:</td>
                    <td style="text-align: left; color: #4338ca;">${totalQty} قطعة / وحدة</td>
                </tr>
            </table>
        </div>

        <div class="signatures-grid">
            <div class="sig-box">
                <div class="sig-title">أمين المستودع</div>
                <div class="sig-line"></div>
                <div class="sig-sub">التوقيع والاسم</div>
            </div>
            <div class="sig-box">
                <div class="sig-title">المشرف / المراجع</div>
                <div class="sig-line"></div>
                <div class="sig-sub">التوقيع والاعتماد</div>
            </div>
            <div class="sig-box">
                <div class="sig-title">المستلم / السائق</div>
                <div class="sig-line"></div>
                <div class="sig-sub">الاسم ورقم الهوية</div>
            </div>
        </div>

        <div class="footer-note">
            تم استخراج هذه الوثيقة آلياً عبر نظام CoreInventory.
        </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) {
        return this.showToast("يرجى السماح بالنوافذ المنبثقة (Popups) للطباعة", "warning");
    }

    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();

    printWindow.onload = function() {
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };
};
