import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  const { receiptId } = await params;

  if (!receiptId) {
    return new NextResponse('معرّف الوصل مطلوب', { status: 400 });
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { id: receiptId },
      include: {
        subscriber: {
          select: { name: true, phone: true, address: true, amps: true }
        },
        board: {
          select: { name: true, area: true }
        },
        bill: {
          select: { month: true, year: true, monthAmount: true, oldDebt: true, remainingAmount: true, paidAmount: true, invoiceNumber: true, ampPrice: true }
        },
        generator: {
          select: { name: true, ownerName: true, phone: true, area: true, logoUrl: true }
        }
      }
    });

    if (!payment) {
      return new NextResponse('الوصل غير موجود', { status: 404 });
    }

    const receiptDate = new Date(payment.date).toLocaleDateString('ar-IQ', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const logoUrl = payment.generator?.logoUrl || '/ambeeri-logo.png';
    const totalAmount = (payment.bill?.monthAmount || 0) + (payment.bill?.oldDebt || 0);

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <title>وصل تسديد - ${payment.subscriber?.name || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f1f5f9;
      direction: rtl;
      padding: 10px;
      color: #1e293b;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    
    .receipt-container {
      width: 100%;
      max-width: 480px;
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      position: relative;
    }

    .header-section {
      text-align: center;
      border-bottom: 2px solid #10b981;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .generator-logo {
      width: 90px;
      height: 90px;
      object-fit: contain;
      border-radius: 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }

    .generator-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }

    .generator-info-list {
      font-size: 0.82rem;
      color: #475569;
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .receipt-title {
      font-size: 1.8rem;
      font-weight: 800;
      color: #10b981;
      margin-top: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 10px;
      margin-top: 18px;
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      padding: 2px 0;
    }

    .info-label {
      color: #64748b;
    }

    .info-value {
      font-weight: 600;
      color: #0f172a;
    }

    .amount-box {
      background: linear-gradient(135deg, #f0fdf4, #d1fae5);
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 16px;
      margin: 20px 0;
      text-align: center;
    }

    .amount-title {
      font-size: 0.85rem;
      color: #065f46;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .amount-val {
      font-size: 2.2rem;
      font-weight: 800;
      color: #065f46;
    }

    .currency {
      font-size: 1rem;
      font-weight: 700;
      color: #065f46;
      margin-right: 4px;
    }

    .note-container {
      background: #f8fafc;
      border-right: 4px solid #0284c7;
      border-radius: 4px;
      padding: 10px 14px;
      margin-top: 14px;
      font-size: 0.85rem;
      color: #0369a1;
      line-height: 1.4;
    }

    .footer-msg {
      text-align: center;
      margin-top: 24px;
      font-size: 0.9rem;
      color: #64748b;
      font-weight: 600;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }

    .receipt-uuid {
      font-family: monospace;
      font-size: 0.65rem;
      color: #94a3b8;
      margin-top: 6px;
      text-align: center;
    }

    .btn-row {
      display: flex;
      gap: 12px;
      width: 100%;
      max-width: 480px;
      margin-top: 16px;
    }

    .action-btn {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Cairo', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      transition: all 0.2s;
    }

    .btn-download {
      background: #1e293b;
      color: #ffffff;
    }

    .btn-print {
      background: #10b981;
      color: #ffffff;
    }

    .action-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

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
    }
    .loading-overlay.show { display: flex; }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media print {
      body { background: #fff; padding: 0; }
      .receipt-container { box-shadow: none; border: none; max-width: 100%; }
      .btn-row, .loading-overlay { display: none !important; }
    }
  </style>
</head>
<body>

<div class="loading-overlay" id="loadingOverlay">
  <div class="spinner"></div>
  <div style="font-family: 'Cairo', sans-serif;">جاري تجهيز ملف PDF...</div>
</div>

<div class="receipt-container">
  <div class="header-section">
    <img class="generator-logo" src="${logoUrl}" alt="الشعار" onerror="this.src='/ambeeri-logo.png'" />
    <div class="generator-name">${payment.generator?.name || 'مولدة أمبيري'}</div>
    <div class="generator-info-list">
      <div>صاحب المولدة: <strong>${payment.generator?.ownerName || '—'}</strong></div>
      <div>رقم الهاتف: <strong>${payment.generator?.phone || '—'}</strong></div>
      <div>العنوان: <strong>${payment.generator?.area || '—'}</strong></div>
    </div>
  </div>

  <div class="section-title">👤 بيانات المشترك</div>
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">اسم المشترك:</span>
      <span class="info-value">${payment.subscriber?.name || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">رقم الهاتف:</span>
      <span class="info-value">${payment.subscriber?.phone || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">البورد / لوحة التوزيع:</span>
      <span class="info-value">${payment.board?.name || '—'} — ${payment.board?.area || ''}</span>
    </div>
    <div class="info-row">
      <span class="info-label">العنوان:</span>
      <span class="info-value">${payment.subscriber?.address || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">عدد الأمبيرات:</span>
      <span class="info-value">${payment.subscriber?.amps || 0} أمبير</span>
    </div>
  </div>

  <div class="section-title">📅 تفاصيل الفاتورة والمدفوعات</div>
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">رقم الفاتورة:</span>
      <span class="info-value">${payment.bill?.invoiceNumber || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">رقم الوصل:</span>
      <span class="info-value">${payment.receiptNumber || '—'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">تاريخ التسديد:</span>
      <span class="info-value">${receiptDate}</span>
    </div>
    <div class="info-row">
      <span class="info-label">الشهر المسدد:</span>
      <span class="info-value">${payment.bill?.month} / ${payment.bill?.year}</span>
    </div>
    <div class="info-row">
      <span class="info-label">سعر الأمبير:</span>
      <span class="info-value">${(payment.ampPriceAtPayment || payment.bill?.ampPrice || 0).toLocaleString('ar-IQ')} د.ع</span>
    </div>
    <div class="info-row">
      <span class="info-label">أجرة الشهر الحالي:</span>
      <span class="info-value">${(payment.bill?.monthAmount || 0).toLocaleString('ar-IQ')} د.ع</span>
    </div>
    <div class="info-row">
      <span class="info-label">الديون السابقة:</span>
      <span class="info-value">${(payment.bill?.oldDebt || 0).toLocaleString('ar-IQ')} د.ع</span>
    </div>
    <div class="info-row" style="border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 4px;">
      <span class="info-label" style="font-weight: 700; color: #0f172a;">المبلغ الكلي المطلوب:</span>
      <span class="info-value" style="font-weight: 700; color: #0f172a;">${totalAmount.toLocaleString('ar-IQ')} د.ع</span>
    </div>
  </div>

  <div class="amount-box">
    <div class="amount-title">المبلغ المسدد</div>
    <div class="amount-val">${(payment.amount || 0).toLocaleString('ar-IQ')}<span class="currency">د.ع</span></div>
  </div>

  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">حالة الدفع:</span>
      <span class="info-value" style="color: ${payment.bill?.remainingAmount <= 0 ? '#10b981' : '#f59e0b'}">
        ${payment.bill?.remainingAmount <= 0 ? 'تم تسديد الحساب بالكامل' : 'تسديد جزئي'}
      </span>
    </div>
    <div class="info-row">
      <span class="info-label">المتبقي الكلي:</span>
      <span class="info-value" style="color: ${payment.bill?.remainingAmount > 0 ? '#ef4444' : '#10b981'}">
        ${(payment.bill?.remainingAmount || 0).toLocaleString('ar-IQ')} د.ع
      </span>
    </div>
  </div>

  ${payment.note ? `<div class="note-container">📝 ملاحظة: ${payment.note}</div>` : ''}

  <div class="footer-msg">شكراً لكم على تسديدكم</div>
  <div class="receipt-uuid">معرّف الوصل الرقمي: ${payment.id}</div>
</div>

<div class="btn-row">
  <button class="action-btn btn-download" onclick="downloadPDF()">حفظ الوصل PDF</button>
  <button class="action-btn btn-print" onclick="window.print()">طباعة الوصل</button>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script>
  function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
  }
  function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
  }

  function downloadPDF() {
    const element = document.querySelector('.receipt-container');
    const filename = 'receipt-${payment.receiptNumber || payment.id}.pdf';
    
    showLoading();
    
    const opt = {
      margin: 0.2,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
      hideLoading();
    }).catch(err => {
      console.error(err);
      hideLoading();
      alert('حدث خطأ أثناء تحميل الملف');
    });
  }
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
    console.error('Receipt PDF route error:', error);
    return new NextResponse('حدث خطأ أثناء جلب الوصل', { status: 500 });
  }
}
