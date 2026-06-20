import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await checkAuth();
  if (!user || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json({ error: 'معرّف الدفعة مطلوب' }, { status: 400 });
  }

  try {
    const whereClause: any = { id: paymentId };
    if (user.role !== 'SUPER_ADMIN') {
      whereClause.generatorId = user.generatorId;
    }

    const payment = await prisma.payment.findFirst({
      where: whereClause,
      include: {
        subscriber: {
          select: { name: true, phone: true, address: true, amps: true }
        },
        board: {
          select: { name: true, area: true }
        },
        bill: {
          select: { month: true, year: true, monthAmount: true, oldDebt: true, remainingAmount: true, paidAmount: true, invoiceNumber: true }
        },
        generator: {
          select: { name: true, ownerName: true, phone: true, area: true, logoUrl: true }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'الدفعة غير موجودة' }, { status: 404 });
    }

    if (searchParams.get('format') === 'json') {
      return NextResponse.json({ payment });
    }

    // Generate HTML receipt
    const receiptDate = new Date(payment.date).toLocaleDateString('ar-IQ', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const logoUrl = payment.generator?.logoUrl || '/ambeeri-logo.png';

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <title>وصل تسديد - ${payment.subscriber?.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f5f5f5;
      direction: rtl;
      padding: 20px;
      color: #1a1a2e;
    }
    .receipt {
      max-width: 420px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .receipt-header {
      background: #e6f9ea;
      color: #10b981;
      padding: 20px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .ambeeri-branding {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      margin-bottom: 8px;
    }
    .ambeeri-logo {
      width: 45px;
      height: 45px;
      object-fit: contain;
    }
    .ambeeri-text {
      font-size: 10px;
      font-weight: 800;
      color: #10b981;
      letter-spacing: 0.5px;
      font-family: 'Cairo', sans-serif;
    }
    .generator-logo {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 50%;
      margin: 4px auto;
      border: 1px solid #e2e8f0;
      display: block;
    }
    .receipt-header .gen-name {
      font-size: 1rem;
      font-weight: 700;
      color: #333;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .receipt-title {
      font-size: 27px;
      font-weight: 700;
      color: #10b981;
      margin: 8px 0;
    }
    .owner-card {
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 10px 12px;
      margin: 8px auto;
      max-width: 340px;
      text-align: right;
    }
    .owner-card .label {
      font-weight: 600;
      color: #333;
    }
    .owner-card .value {
      color: #000;
    }
    .receipt-badge {
      background: rgba(255,255,255,0.2);
      color: #fff;
      display: inline-block;
      padding: 3px 14px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      margin-top: 8px;
      border: 1px solid rgba(255,255,255,0.5);
      letter-spacing: 1px;
    }
    .section {
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;
    }
    .section-title {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      font-size: 0.88rem;
    }
    .info-row .label {
      color: #6b7280;
    }
    .info-row .value {
      font-weight: 600;
      color: #1a1a2e;
    }
    .amount-box {
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      margin: 16px 20px;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
      border: 2px solid #10b981;
    }
    .amount-box .amount-label {
      font-size: 0.8rem;
      color: #059669;
      margin-bottom: 6px;
    }
    .amount-box .amount-value {
      font-size: 2rem;
      font-weight: 800;
      color: #047857;
    }
    .amount-box .amount-currency {
      font-size: 0.9rem;
      color: #059669;
    }
    .remaining-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      background: #fef9c3;
      border-top: 1px dashed #fbbf24;
      font-size: 0.85rem;
    }
    .remaining-row .label { color: #92400e; }
    .remaining-row .value { font-weight: 700; color: #92400e; }
    .footer {
      padding: 14px 20px;
      text-align: center;
      font-size: 0.75rem;
      color: #9ca3af;
      background: #fafafa;
    }
    .receipt-id {
      font-family: monospace;
      font-size: 0.65rem;
      color: #d1d5db;
      margin-top: 4px;
    }
    .note-box {
      background: #f0f9ff;
      border-right: 3px solid #0ea5e9;
      padding: 8px 12px;
      margin: 0 20px 12px;
      border-radius: 4px;
      font-size: 0.82rem;
      color: #0369a1;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; }
      .no-print { display: none !important; }
    }
    .print-btn {
      display: block;
      width: calc(100% - 40px);
      margin: 16px 20px;
      padding: 12px;
      background: #1e3a5f;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
    }
    .btn-row {
      display: flex;
      gap: 10px;
      padding: 16px 20px 0;
    }
    .btn-row button {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      cursor: pointer;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn-pdf {
      background: #1e3a5f;
      color: #fff;
    }
    .btn-whatsapp {
      background: #25D366;
      color: #fff;
    }
    .btn-whatsapp:active { background: #1da851; }
    .btn-pdf:active { background: #15294a; }
    .loading-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      color: #fff;
      font-family: 'Cairo', sans-serif;
      font-size: 1.1rem;
    }
    .loading-overlay.show { display: flex; }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: #25D366;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>

<div class="loading-overlay" id="loadingOverlay">
  <div class="spinner"></div>
  <div id="loadingText">جاري تجهيز الملف...</div>
</div>

<div class="receipt">
    <div class="receipt-header">
      <!-- Ambeeri branding -->
      <div class="ambeeri-branding">
        <img class="ambeeri-logo" src="/ambeeri-logo.png" alt="Ambeeri" />
        <span class="ambeeri-text">أمبيري | Ambeeri</span>
      </div>

      <!-- Generator logo (only if not fallback) -->
      ${logoUrl && logoUrl !== '/ambeeri-logo.png' ? `
      <img class="generator-logo" src="${logoUrl}" alt="الشعار" />
      ` : ''}

      <div class="gen-name">${payment.generator?.name || ''}</div>
      <div class="owner-card">
        <div><span class="label">صاحب المولدة:</span> ${payment.generator?.ownerName || ''}</div>
        <div><span class="label">رقم الهاتف:</span> ${payment.generator?.phone || ''}</div>
        <div><span class="label">العنوان:</span> ${payment.generator?.area || ''}</div>
      </div>

      <span class="receipt-badge">✓ وصل رسمي</span>
    </div>

  <div class="section">
    <div class="section-title">📋 بيانات المشترك</div>
    <div class="info-row">
      <span class="label">الاسم:</span>
      <span class="value">${payment.subscriber?.name || ''}</span>
    </div>
    <div class="info-row">
      <span class="label">الهاتف:</span>
      <span class="value">${payment.subscriber?.phone || ''}</span>
    </div>
    <div class="info-row">
      <span class="label">البورد:</span>
      <span class="value">${payment.board?.name || ''} — ${payment.board?.area || ''}</span>
    </div>
    <div class="info-row">
      <span class="label">العنوان:</span>
      <span class="value">${payment.subscriber?.address || ''}</span>
    </div>
    <div class="info-row">
      <span class="label">الأمبيرات:</span>
      <span class="value">${payment.subscriber?.amps || ''} أمبير</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📅 تفاصيل الفاتورة</div>
    <div class="info-row">
      <span class="label">الشهر / السنة:</span>
      <span class="value">${payment.bill?.month} / ${payment.bill?.year}</span>
    </div>
    <div class="info-row">
      <span class="label">أجرة الشهر:</span>
      <span class="value">${(payment.bill?.monthAmount || 0).toLocaleString('ar-IQ')} د.ع</span>
    </div>
    <div class="info-row">
      <span class="label">ديون سابقة:</span>
      <span class="value">${(payment.bill?.oldDebt || 0).toLocaleString('ar-IQ')} د.ع</span>
    </div>
    <div class="info-row" style="border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 4px; font-weight: bold;">
      <span class="label">المبلغ الكلي المطلوب:</span>
      <span class="value">${((payment.bill?.monthAmount || 0) + (payment.bill?.oldDebt || 0)).toLocaleString('ar-IQ')} د.ع</span>
    </div>
    <div class="info-row">
      <span class="label">تاريخ الدفع:</span>
      <span class="value">${receiptDate}</span>
    </div>
  </div>

  <div class="amount-box">
    <div class="amount-label">💵 إجمالي المبلغ المسدد</div>
    <div class="amount-value">${(payment.bill?.paidAmount || payment.amount).toLocaleString('ar-IQ')}</div>
    <div class="amount-currency">دينار عراقي</div>
  </div>

  ${payment.note ? `<div class="note-box">📝 ملاحظة: ${payment.note}</div>` : ''}

  <div class="section" style="border-bottom: none; padding-top: 0;">
    ${payment.bill?.paidAmount && payment.bill.paidAmount !== payment.amount ? `
    <div class="info-row" style="color: #0284c7;">
      <span class="label">مبلغ هذه الدفعة:</span>
      <span class="value" style="font-weight: bold;">${payment.amount.toLocaleString('ar-IQ')} د.ع</span>
    </div>
    ` : ''}
    <div class="info-row" style="color: #166534; font-weight: bold;">
      <span class="label">إجمالي المسدد:</span>
      <span class="value">${(payment.bill?.paidAmount || payment.amount).toLocaleString('ar-IQ')} د.ع</span>
    </div>
    <div class="info-row">
      <span class="label">حالة الدفع:</span>
      <span class="value" style="color: ${payment.bill?.remainingAmount <= 0 ? '#10b981' : '#f59e0b'}; font-weight: bold;">
        ${payment.bill?.remainingAmount <= 0 ? 'تم تسديد الحساب بالكامل' : 'تسديد جزئي'}
      </span>
    </div>
    <div class="info-row">
      <span class="label">المتبقي الكلي:</span>
      <span class="value" style="color: ${payment.bill?.remainingAmount > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;">
        ${(payment.bill?.remainingAmount || 0).toLocaleString('ar-IQ')} د.ع
      </span>
    </div>
  </div>

  <div class="btn-row no-print">
    <button class="btn-pdf" onclick="generatePDF()">💾 حفظ PDF</button>
    <button class="btn-whatsapp" onclick="sendWhatsApp()">📲 واتساب</button>
  </div>

  <div class="footer">
    شكراً لتسديدكم في الوقت المحدد
    <div class="receipt-id">رقم الدفعة: ${payment.id}</div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
  // Ensure Cairo Arabic font is loaded before PDF creation
  const loadCairoFont = async () => {
    const font = new FontFace(
      'Cairo',
      'url(https://fonts.gstatic.com/s/cairo/v13/SlGVmH9qA4XUjXK2cG0D.ttf) format("truetype")'
    );
    await font.load();
    document.fonts.add(font);
  };

  const subscriberPhone = '${payment.subscriber?.phone || ''}';
  const subscriberName = '${payment.subscriber?.name || ''}';
  const pdfFileName = 'receipt_${payment.receiptNumber || payment.id}.pdf';

  function showLoading(text) {
    document.getElementById('loadingText').textContent = text || 'جاري تجهيز الملف...';
    document.getElementById('loadingOverlay').classList.add('show');
  }
  function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
  }

  function getPdfOptions() {
    return {
      margin: 0,
      filename: pdfFileName,
      image: { type: 'png', quality: 1.0 },
      html2canvas: { scale: 4, useCORS: true, letterRendering: true, allowTaint: true },
      jsPDF: { unit: 'in', format: 'a5', orientation: 'portrait' }
    };
  }

  async function generatePDF() {
    await loadCairoFont();
    const element = document.querySelector('.receipt');
    const btns = document.querySelector('.btn-row');
    btns.style.display = 'none';
    showLoading('جاري إنشاء ملف PDF...');
    html2pdf().set(getPdfOptions()).from(element).save().then(() => {
      btns.style.display = 'flex';
      hideLoading();
    }).catch(() => {
      btns.style.display = 'flex';
      hideLoading();
      alert('حدث خطأ أثناء إنشاء الملف');
    });
  }

  function formatIraqiPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.trim().replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+964')) {
      cleaned = '964' + cleaned.slice(4);
    } else if (cleaned.startsWith('00964')) {
      cleaned = '964' + cleaned.slice(5);
    } else if (cleaned.startsWith('0')) {
      cleaned = '964' + cleaned.slice(1);
    } else if (!cleaned.startsWith('964') && cleaned.replace(/\D/g, '').length === 10) {
      cleaned = '964' + cleaned.replace(/\D/g, '');
    }
    cleaned = cleaned.replace(/\D/g, '');
    if (/^964\d{10}$/.test(cleaned)) {
      return cleaned;
    }
    return null;
  }

  async function sendWhatsApp() {
    const rawPhone = '${payment.subscriber?.phone || ''}';
    const formattedPhone = formatIraqiPhoneNumber(rawPhone);
    if (!formattedPhone) {
      alert('رقم هاتف المشترك غير صحيح، يرجى تعديله من صفحة المشتركين');
      return;
    }

    const generatorName = '${payment.generator?.name || 'أمبيري'}';
    const subscriberName = '${payment.subscriber?.name || ''}';
    const monthStr = '${payment.bill?.month} / ${payment.bill?.year}';
    const amountPaid = '${(payment.bill?.paidAmount || payment.amount || 0).toLocaleString('ar-IQ')}';
    const remainingAmount = '${(payment.bill?.remainingAmount || 0).toLocaleString('ar-IQ')}';
    const receiptNumber = '${payment.receiptNumber || '—'}';
    const receiptUrl = 'https://ambeeri.vercel.app/api/receipts/${payment.id}/pdf';

    const message = 'مرحباً، تم تسديد اشتراك مولدة ' + generatorName + '\n' +
      'المشترك: ' + subscriberName + '\n' +
      'الشهر: ' + monthStr + '\n' +
      'المبلغ المسدد: ' + amountPaid + ' د.ع\n' +
      'المتبقي: ' + remainingAmount + ' د.ع\n' +
      'رقم الوصل: ' + receiptNumber + '\n' +
      'رابط الوصل: ' + receiptUrl;

    const encodedMsg = encodeURIComponent(message);
    const url = 'https://wa.me/' + formattedPhone + '?text=' + encodedMsg;
    window.open(url, '_blank');
  }

  // Auto trigger PDF download when page loads
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
      await generatePDF();
    }, 800);
  });
</script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Receipt error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الوصل' }, { status: 500 });
  }
}
