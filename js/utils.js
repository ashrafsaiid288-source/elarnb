/**
 * دالة طباعة الفاتورة وإذن الصرف/الاستلام بنسق A4 رسمي
 */
utils.printDocumentSlip = function(doc) {
    if (!doc) return utils.showToast("لا توجد بيانات للطباعة", "error");

    const lines = doc.lines || [];
    const isOut = (doc.reference || '').startsWith('OUT') || doc.type === 'delivery';
    const docTitle = isOut ? "إذن صرف بضاعة / فاتورة تسليم" : "إذن استلام وتوريد بضاعة";
    const contactLabel = isOut ? "العميل / جهة الاستلام" : "المورد / جهة التوريد";

    // حساب إجمالي الكميات
    const totalQty = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

    // صفوف جدول الأصناف
    const rowsHtml = lines.map((item, index) => {
        const sku = item.sku || item.productSku || '-';
        const name = item.productLabel || item.productName || item.name || 'صنف';
        const qty = item.quantity || 0;
        const uom = item.uom || 'قطعة';
        const price = item.price ? `${Number(item.price).toFixed(2)} ج.م` : '-';
        const total = item.price ? `${(Number(item.price) * qty).toFixed(2)} ج.م` : '-';

        return `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td style="font-family: monospace; font-weight: bold;">${sku}</td>
                <td><strong>${name}</strong></td>
                <td style="text-align: center; font-weight: bold;">${qty} ${uom}</td>
                <td style="text-align: center;">${price}</td>
                <td style="text-align: center; font-weight: bold;">${total}</td>
            </tr>
        `;
    }).join('');

    // قالب الفاتورة الرسمي
    const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>طباعة ${doc.reference || 'إذن مخزني'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
            @page {
                size: A4 portrait;
                margin: 12mm 15mm;
            }
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: 'Cairo', -apple-system, sans-serif;
            }
            body {
                background: #fff;
                color: #0f172a;
                padding: 20px;
                font-size: 13px;
                line-height: 1.5;
            }
            .slip-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .brand-name {
                font-size: 24px;
                font-weight: 900;
                color: #1e1b4b;
                letter-spacing: -0.5px;
            }
            .brand-sub {
                font-size: 12px;
                color: #475569;
            }
            .doc-title-box {
                text-align: left;
            }
            .doc-title {
                font-size: 18px;
                font-weight: 800;
                color: #4338ca;
            }
            .doc-ref-badge {
                display: inline-block;
                background: #f1f5f9;
                border: 1px solid #cbd5e1;
                padding: 4px 10px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 14px;
                font-weight: bold;
                margin-top: 5px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 12px 16px;
                margin-bottom: 20px;
            }
            .info-line {
                display: flex;
                margin-bottom: 4px;
            }
            .info-label {
                width: 120px;
                color: #64748b;
                font-weight: 600;
            }
            .info-value {
                font-weight: 700;
                color: #0f172a;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            th, td {
                border: 1px solid #cbd5e1;
                padding: 8px 10px;
                text-align: right;
            }
            th {
                background: #f1f5f9;
                color: #1e293b;
                font-weight: 800;
                font-size: 12px;
            }
            .total-box {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 30px;
            }
            .total-table {
                width: 300px;
                border: 1px solid #cbd5e1;
            }
            .total-table td {
                padding: 6px 12px;
                font-weight: 700;
            }
            .signatures-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 20px;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px dashed #cbd5e1;
                text-align: center;
            }
            .sig-box {
                padding: 10px;
            }
            .sig-title {
                font-weight: 700;
                color: #334155;
                margin-bottom: 40px;
            }
            .sig-line {
                border-bottom: 1px solid #000;
                margin-top: 30px;
            }
            .footer-note {
                text-align: center;
                font-size: 11px;
                color: #94a3b8;
                margin-top: 25px;
            }
        </style>
    </head>
    <body>
        <div class="slip-header">
            <div>
                <div class="brand-name">CoreInventory 📦</div>
                <div class="brand-sub">إدارة المخازن والمستودعات والخدمات اللوجستية</div>
            </div>
            <div class="doc-title-box">
                <div class="doc-title">${docTitle}</div>
                <div class="doc-ref-badge">${doc.reference || 'N/A'}</div>
            </div>
        </div>

        <div class="info-grid">
            <div>
                <div class="info-line">
                    <span class="info-label">${contactLabel}:</span>
                    <span class="info-value">${doc.contact || 'عميل عام'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">المستودع المصدر:</span>
                    <span class="info-value">${doc.warehouseName || doc.warehouseId || 'المستودع الرئيسي'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">العنوان / الملاحظة:</span>
                    <span class="info-value">${doc.address || doc.notes || 'لا يوجد'}</span>
                </div>
            </div>
            <div>
                <div class="info-line">
                    <span class="info-label">تاريخ الإصدار:</span>
                    <span class="info-value">${doc.scheduleDate || new Date().toISOString().split('T')[0]}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">حالة الإذن:</span>
                    <span class="info-value" style="color:#059669;">${doc.status === 'Done' ? 'منفذ ومكتمل' : 'معتمد للتسليم'}</span>
                </div>
                <div class="info-line">
                    <span class="info-label">رقم العملية:</span>
                    <span class="info-value">#${(doc.id || '').substring(0, 8).toUpperCase()}</span>
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 40px; text-align: center;">#</th>
                    <th style="width: 120px;">كود الصنف (SKU)</th>
                    <th>اسم الصنف ومواصفاته</th>
                    <th style="width: 100px; text-align: center;">الكمية</th>
                    <th style="width: 90px; text-align: center;">السعر</th>
                    <th style="width: 110px; text-align: center;">الإجمالي</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml || '<tr><td colspan="6" style="text-align:center;">لا توجد أصناف مدرجة</td></tr>'}
            </tbody>
        </table>

        <div class="total-box">
            <table class="total-table">
                <tr>
                    <td>إجمالي عدد القطع:</td>
                    <td style="text-align: left; color:#4338ca;">${totalQty} وحدة</td>
                </tr>
            </table>
        </div>

        <div class="signatures-grid">
            <div class="sig-box">
                <div class="sig-title">أمين المستودع</div>
                <div class="sig-line"></div>
                <div style="font-size:11px; color:#64748b; margin-top:5px;">التوقيع والاسم</div>
            </div>
            <div class="sig-box">
                <div class="sig-title">المشرف / المراجع</div>
                <div class="sig-line"></div>
                <div style="font-size:11px; color:#64748b; margin-top:5px;">التوقيع والاعتماد</div>
            </div>
            <div class="sig-box">
                <div class="sig-title">المستلم / السائق</div>
                <div class="sig-line"></div>
                <div style="font-size:11px; color:#64748b; margin-top:5px;">الاسم ورقم الهوية</div>
            </div>
        </div>

        <div class="footer-note">
            تم استخراج هذه الوثيقة آلياً عبر نظام CoreInventory - يُرجى الاحتفاظ بنسخة الإذن للمراجعة المخزنية.
        </div>
    </body>
    </html>
    `;

    // فتح نافذة الطباعة المنعزلة وتشغيل أمر الطباعة
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
        return utils.showToast("يرجى السماح بالنوافذ المنبثقة (Popups) لإتمام الطباعة", "warning");
    }

    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();

    // تشغيل أمر الطباعة بمجرد اكتمال تحميل الخطوط
    printWindow.onload = function() {
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };
};
