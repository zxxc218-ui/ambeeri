"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { printReceiptBluetooth } from '@/lib/bluetoothPrinter';
import { ArrowRight, Home, User, Receipt, Printer, FileText, Wallet, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const WhatsAppIcon = ({ size = 20, className = "" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.436 0 9.851-4.388 9.854-9.779.001-2.611-1.015-5.07-2.861-6.92C16.365 2.054 13.91 1.036 11.993 1.036c-5.452 0-9.887 4.39-9.89 9.782-.001 2.014.533 3.987 1.547 5.734l-1.019 3.729 3.846-1.006zm9.367-5.61c-.263-.13-1.55-.762-1.788-.85-.238-.087-.412-.13-.587.13-.175.26-.677.85-.828 1.02-.15.172-.301.192-.564.062-.263-.13-1.11-.407-2.113-1.3-.78-.694-1.306-1.55-1.459-1.812-.153-.262-.016-.403.115-.533.118-.118.263-.309.394-.463.131-.154.175-.262.263-.437.087-.175.044-.328-.022-.459-.065-.13-.587-1.412-.804-1.933-.211-.508-.425-.438-.587-.446-.15-.007-.322-.007-.493-.007-.17 0-.449.064-.683.316-.234.252-.894.873-.894 2.129 0 1.256.914 2.47 1.039 2.64 1.256 1.706 2.76 2.5 4.5 3.1 1.74.6 1.74.4 2.44.3.7-.1 1.55-.63 1.77-1.24.22-.61.22-1.13.15-1.24-.07-.1-.26-.17-.53-.3z"/>
  </svg>
);

function formatIraqiPhoneNumber(phone: string): string | null {
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

export default function SubscriberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [subscriber, setSubscriber] = useState<any>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  // Collect payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentAmpPrice, setPaymentAmpPrice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [whatsappWarning, setWhatsappWarning] = useState<{message: string, url: string} | null>(null);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);
  const [printingBluetooth, setPrintingBluetooth] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [pdfReceiptData, setPdfReceiptData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchSessionAndDetail();
    }
  }, [id]);

  // Dynamically update payment amount when Amp price is modified in the modal
  useEffect(() => {
    if (selectedBill && paymentAmpPrice) {
      const parsedAmpPrice = parseInt(paymentAmpPrice) || 0;
      const newMonthAmount = selectedBill.amps * parsedAmpPrice;
      const newTotalCost = newMonthAmount + selectedBill.oldDebt;
      const newRemaining = newTotalCost - selectedBill.paidAmount;
      setPaymentAmount(Math.max(0, newRemaining).toString());
    }
  }, [paymentAmpPrice, selectedBill]);

  const fetchSessionAndDetail = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      await fetchDetail();
    } catch (err) {
      console.error(err);
      router.push('/login');
    }
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/owner/subscribers/detail?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriber(data.subscriber);
        setTotalPaid(data.totalPaid || 0);
      } else {
        alert('حدث خطأ في تحميل بيانات المشترك');
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCancelBill = async (billId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذه الفاتورة؟ لا يمكن التراجع عن هذه العملية.')) return;
    try {
      const res = await fetch('/api/owner/bills/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'فشل إلغاء الفاتورة');
      } else {
        fetchDetail();
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالشبكة');
    }
  };

  const handleDownloadPDF = async (paymentData: any) => {
    if (!paymentData) return;
    setDownloadingPDF(true);
    try {
      const element = document.getElementById('receipt-pdf-template');
      if (!element) {
        alert('حدث خطأ أثناء العثور على قالب الوصل');
        setDownloadingPDF(false);
        return;
      }
      
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 3, canvas.height / 3]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3);
      const filename = `receipt-${paymentData.invoiceNumber || paymentData.receiptNumber || 'print'}.pdf`;
      pdf.save(filename);
      
      // Log print action
      await fetch('/api/owner/print-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: paymentData.billId,
          paymentId: paymentData.paymentId,
          printerType: 'PDF_DOWNLOAD',
          status: 'SUCCESS'
        })
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('حدث خطأ أثناء تحميل ملف الـ PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setDownloadingPDF(false);
    }
  };
  const handleWhatsappShare = async (paymentData: any) => {
    if (!paymentData) return;
    
    const rawPhone = paymentData.whatsappPhone || paymentData.phone || '';
    const formattedPhone = formatIraqiPhoneNumber(rawPhone);
    if (!formattedPhone) {
      alert('رقم هاتف المشترك غير صحيح، يرجى تعديله من صفحة المشتركين');
      return;
    }

    const receiptUrl = `${window.location.origin}/api/receipts/${paymentData.paymentId}/pdf`;
    const generatorName = paymentData.generatorName || subscriber?.generator?.name || 'أمبيري';
    const subscriberName = paymentData.subscriberName;
    const monthStr = `${paymentData.month} / ${paymentData.year}`;
    const amountPaid = (paymentData.amount || 0).toLocaleString('ar-IQ');
    const remainingAmount = (paymentData.remainingAmount || 0).toLocaleString('ar-IQ');
    const receiptNumber = paymentData.receiptNumber || '—';

    const message = `مرحباً، تم تسديد اشتراك مولدة ${generatorName}
المشترك: ${subscriberName}
الشهر: ${monthStr}
المبلغ المسدد: ${amountPaid} د.ع
المتبقي: ${remainingAmount} د.ع
رقم الوصل: ${receiptNumber}
رابط الوصل: ${receiptUrl}`;

    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMsg}`, '_blank', 'noopener,noreferrer');
  };

  const openReceipt = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/owner/receipts?paymentId=${paymentId}&format=json`);
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'حدث خطأ أثناء تحميل بيانات الوصل');
        return;
      }
      const data = await res.json();
      const p = data.payment;
      if (!p) {
        alert('بيانات الوصل غير متوفرة');
        return;
      }

      // Convert to receiptData format
      const receiptData = {
        paymentId: p.id,
        billId: p.billId,
        receiptNumber: p.receiptNumber || p.id,
        invoiceNumber: p.bill?.invoiceNumber || '',
        date: p.date,
        amount: p.amount,
        remainingAmount: p.bill?.remainingAmount || 0,
        subscriberName: subscriber?.name || '',
        phone: subscriber?.phone || '',
        boardName: subscriber?.board?.name || '',
        month: p.bill?.month || '',
        year: p.bill?.year || '',
        employeeName: user?.name || '',
        generatorName: subscriber?.generator?.name || '',
        generatorOwner: subscriber?.generator?.ownerName || '',
        generatorPhone: subscriber?.generator?.phone || '',
        generatorArea: subscriber?.generator?.area || '',
        generatorLogo: subscriber?.generator?.logoUrl || '',
        note: p.note || '',
        amps: subscriber?.amps?.toString() || p.bill?.amps?.toString() || '0',
        ampPrice: p.bill?.ampPrice || 0,
        oldDebt: p.bill?.oldDebt || 0
      };

      setPdfReceiptData(receiptData);

      // Wait 300ms for React to render the template in the DOM, then download
      setTimeout(async () => {
        await handleDownloadPDF(receiptData);
        setPdfReceiptData(null);
      }, 300);
    } catch (err) {
      console.error(err);
      alert('فشل الاتصال بالسيرفر لتنزيل الوصل');
    }
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/owner/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: selectedBill.id,
          amount: paymentAmount,
          note: paymentNote,
          ampPrice: paymentAmpPrice
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'حدث خطأ ما');
      } else {
        setShowPaymentModal(false);

        // Save success data for printer modal
        setPaymentSuccessData({
          paymentId: data.payment.id,
          billId: selectedBill.id,
          receiptNumber: data.payment.receiptNumber,
          invoiceNumber: selectedBill.invoiceNumber,
          date: data.payment.date,
          amount: data.payment.amount,
          remainingAmount: selectedBill.remainingAmount - data.payment.amount <= 0 ? 0 : selectedBill.remainingAmount - data.payment.amount,
          subscriberName: subscriber.name || '',
          phone: subscriber.phone || '',
          boardName: subscriber.board?.name || '',
          month: selectedBill.month,
          year: selectedBill.year,
          employeeName: user.name,
          generatorName: subscriber.generator?.name || user.genName || '',
          generatorOwner: subscriber.generator?.ownerName || '',
          generatorPhone: subscriber.generator?.phone || '',
          generatorArea: subscriber.generator?.area || '',
          generatorLogo: subscriber.generator?.logoUrl || '',
          note: data.payment.note,
          amps: selectedBill.amps?.toString() || subscriber.amps?.toString() || '0',
          ampPrice: paymentAmpPrice || selectedBill.ampPrice || subscriber.ampPrice || 0,
          oldDebt: selectedBill.oldDebt || 0,
          whatsappMessage: data.whatsappMessage,
          whatsappPhone: data.whatsappPhone,
          warning: data.warning
        });

        setSelectedBill(null);
        setPaymentAmount('');
        setPaymentNote('');
        setPaymentAmpPrice('');
        fetchDetail();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('فشل الاتصال بالسيرفر');
    }
  };

  const handleManualReminder = (bill: any) => {
    const phone = subscriber?.phone || '';
    const formatted = formatIraqiPhoneNumber(phone);
    if (!formatted) {
      alert('رقم هاتف المشترك غير صحيح، يرجى تعديله من صفحة المشتركين');
      return;
    }
    
    const name = subscriber?.name || '';
    const genName = subscriber?.generator?.name || 'أمبيري';
    const monthStr = `${bill.month} / ${bill.year}`;
    const amountStr = (bill.remainingAmount || 0).toLocaleString('ar-IQ');
    
    const msg = `مرحباً ${name}، نود تذكيركم بوجود مبلغ اشتراك مولدة غير مسدد.
المولدة: ${genName}
الشهر: ${monthStr}
المبلغ المطلوب: ${amountStr} د.ع
يرجى التسديد، مع الشكر.`;
    
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  if (loading || !subscriber) {
    return <div className="loading-state" style={{ color: '#fff', textAlign: 'center', marginTop: '100px' }}>جاري تحميل بيانات المشترك...</div>;
  }

  // Calculate active debt sum
  const activeDebt = subscriber.monthlyBills
    ? subscriber.monthlyBills
        .filter((b: any) => b.paymentStatus !== 'PAID')
        .reduce((sum: number, b: any) => sum + b.remainingAmount, 0) + subscriber.oldDebt
    : subscriber.oldDebt;

  return (
    <div className="phone-simulator">
      {/* App Header Bar with Back Button */}
      <header className="app-header">
        <div className="header-top-row">
          <div className="app-brand" onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRight style={{ width: '20px', height: '20px' }} />
            <span className="brand-name-ar">تفاصيل المشترك</span>
          </div>
          <button className="header-btn" title="الرجوع للوحة التحكم" onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Home style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        <div className="owner-ribbon">
          <div className="owner-ribbon-avatar">
            {subscriber.name.charAt(0)}
          </div>
          <div className="owner-ribbon-details">
            <h4>{subscriber.name}</h4>
            <p>{subscriber.phone}</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-content-area" style={{ paddingBottom: '30px' }}>
        {/* Personal details card */}
        <div className="form-card" style={{ marginBottom: '16px' }}>
          <div className="form-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User style={{ color: 'var(--primary)', width: '20px', height: '20px' }} /> البيانات الأساسية للمشترك
          </div>
          <div className="report-item">
            <span>البورد التابع له:</span>
            <span className="font-bold">{subscriber.board?.name || 'غير محدد'}</span>
          </div>
          <div className="report-item">
            <span>العنوان:</span>
            <span>{subscriber.address}</span>
          </div>
          <div className="report-item">
            <span>عدد الأمبيرات:</span>
            <span className="font-bold">{subscriber.amps} أمبير</span>
          </div>
          <div className="report-item">
            <span>سعر الأمبير الخاص:</span>
            <span>{(subscriber.ampPrice).toLocaleString('ar-IQ')} د.ع</span>
          </div>
          <div className="report-item">
            <span>الديون السابقة (عند التأسيس):</span>
            <span>{(subscriber.oldDebt).toLocaleString('ar-IQ')} د.ع</span>
          </div>
          <div className="report-item" style={{ borderTop: '2px solid var(--border)', paddingTop: '8px', marginTop: '6px', fontSize: '.9rem' }}>
            <span>إجمالي الديون الحالية:</span>
            <span className="font-bold text-danger">{(activeDebt).toLocaleString('ar-IQ')} د.ع</span>
          </div>
        </div>

        {/* Total Paid Card */}
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '2px solid #10b981', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '.72rem', color: '#059669', fontWeight: '600', marginBottom: '2px' }}>💰 إجمالي ما دفعه هذا الزبون (كل الوقت)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#047857' }}>{(totalPaid).toLocaleString('ar-IQ')} د.ع</div>
          </div>
          <div style={{ fontSize: '2rem' }}>🏆</div>
        </div>

        {/* Action Button: WhatsApp */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => {
              const formatted = formatIraqiPhoneNumber(subscriber.phone || '');
              if (!formatted) {
                alert('رقم الهاتف غير صحيح، يرجى إدخاله بصيغة عراقية صحيحة');
                return;
              }
              window.open(`https://wa.me/${formatted}`, '_blank', 'noopener,noreferrer');
            }}
            className="btn btn-whatsapp btn-block"
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#25d366', color: '#fff', border: 'none', cursor: 'pointer', width: '100%', padding: '10px 0', borderRadius: '8px' }}
          >
            تواصل عبر واتساب <WhatsAppIcon size={20} />
          </button>
        </div>

        {/* Billing History Section */}
        <div className="section-header">
          <h2>سجل الفواتير والمدفوعات 🧾</h2>
        </div>

        <div className="month-payment-list">
          {subscriber.monthlyBills?.length === 0 ? (
            <div className="empty-state">
              <Receipt style={{ width: '48px', height: '48px', color: 'var(--text-light)', marginBottom: '8px' }} />
              <h3>لا يوجد فواتير صادرة</h3>
              <p>لم يتم إصدار أي فاتورة شهرية لهذا المشترك بعد.</p>
            </div>
          ) : (
            subscriber.monthlyBills?.map((b: any) => {
              const isCancelled = b.paymentStatus === 'CANCELLED';
              return (
              <div key={b.id} className="month-pay-card" style={{ borderLeft: isCancelled ? '4px solid #9ca3af' : (b.remainingAmount > 0 ? '4px solid var(--danger)' : '4px solid var(--success)'), opacity: isCancelled ? 0.6 : 1 }}>
                <div className="month-pay-header">
                  <div>
                    <h4>فاتورة شهر: {b.month} / {b.year}</h4>
                    <p style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
                      الأمبيرات: {b.amps} أمبير • سعر الأمبير: {(b.ampPrice).toLocaleString('ar-IQ')} د.ع
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className={`badge-status ${
                      b.paymentStatus === 'PAID' ? 'badge-paid' :
                      b.paymentStatus === 'PARTIAL' ? 'badge-partial' :
                      b.paymentStatus === 'CANCELLED' ? 'badge-stopped' : 'badge-unpaid'
                    }`}>
                      {b.paymentStatus === 'PAID' ? 'تم الدفع كامل' :
                       b.paymentStatus === 'PARTIAL' ? 'دفع جزئي' :
                       b.paymentStatus === 'CANCELLED' ? 'ملغاة' : 'غير دافع'}
                    </span>
                    <span className={`badge-status ${
                      b.reminderStatus === 'SENT' ? 'badge-active' :
                      b.reminderStatus === 'FAILED' ? 'badge-debt' :
                      b.reminderStatus === 'PENDING' ? 'badge-partial' : 'badge-stopped'
                    }`} style={{ fontSize: '.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <WhatsAppIcon size={12} /> {
                        b.reminderStatus === 'SENT' ? 'تم التذكير' :
                        b.reminderStatus === 'FAILED' ? 'فشل التذكير' :
                        b.reminderStatus === 'PENDING' ? 'تذكير معلق (يدوي)' : 'لم يرسل'
                      }
                    </span>
                  </div>
                </div>

                <div className="month-pay-details">
                  <div className="mpd-item">
                    <span className="mpd-label">أجرة الشهر</span>
                    <span className="mpd-value">{(b.monthAmount).toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                  <div className="mpd-item">
                    <span className="mpd-label">ديون سابقة</span>
                    <span className="mpd-value">{(b.oldDebt).toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                  <div className="mpd-item">
                    <span className="mpd-label">متبقي كلي</span>
                    <span className="mpd-value" style={{ color: b.remainingAmount > 0 ? 'var(--danger)' : 'inherit' }}>
                      {(b.remainingAmount).toLocaleString('ar-IQ')} د.ع
                    </span>
                  </div>
                </div>

                {/* Receipts list for this bill */}
                {b.payments && b.payments.length > 0 && (
                  <div style={{ marginTop: '10px', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '.7rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      وصل المقبوضات:
                    </div>
                    {b.payments.map((p: any) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.72rem', padding: '4px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span>
                          💵 تم استلام: <strong>{(p.amount).toLocaleString('ar-IQ')} د.ع</strong> {p.note ? `(${p.note})` : ''}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--text-light)' }}>
                            {new Date(p.date).toLocaleDateString('ar-IQ')}
                          </span>
                          {(user.role === 'OWNER' || (user.permissions && user.permissions.reprint_receipt)) && (
                            <button
                              type="button"
                              onClick={() => openReceipt(p.id)}
                              style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '.65rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="طباعة الوصل"
                            >
                              <Printer style={{ width: '12px', height: '12px' }} /> وصل
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isCancelled && b.remainingAmount > 0 && user && (user.role === 'OWNER' || (user.permissions && user.permissions['collect_payment'])) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="btn btn-whatsapp btn-sm" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: '#25d366', 
                        color: '#fff', 
                        border: 'none', 
                        cursor: 'pointer' 
                      }}
                      onClick={() => handleManualReminder(b)}
                    >
                      تذكير واتساب <WhatsAppIcon size={14} />
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setSelectedBill(b);
                      setPaymentAmount(b.remainingAmount.toString());
                      setPaymentAmpPrice(b.ampPrice.toString());
                      setShowPaymentModal(true);
                    }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Wallet style={{ width: '14px', height: '14px' }} /> تسديد دفعة
                    </button>
                  </div>
                )}

                {/* Cancel bill button - shown for non-cancelled, non-paid bills */}
                {!isCancelled && b.paymentStatus !== 'PAID' && user && (user.role === 'OWNER' || (user.permissions && user.permissions['cancel_bill'])) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: 'transparent', border: '1px solid #dc2626', color: '#dc2626', fontSize: '.72rem' }}
                      onClick={() => handleCancelBill(b.id)}
                    >
                      🚫 إلغاء الفاتورة
                    </button>
                  </div>
                )}

                {isCancelled && (
                  <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '.75rem', color: '#9ca3af', padding: '6px', background: '#f9fafb', borderRadius: '6px' }}>
                    ❌ تم إلغاء هذه الفاتورة
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      </main>

      {/* Collect Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-handle"></div>
            <div className="modal-header">
              <h3>تسجيل دفعة وجباية</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <form onSubmit={handleCollectPayment}>
              <div className="modal-body">
                <div style={{ marginBottom: '12px', fontSize: '.85rem' }}>
                  <div>المشترك: <strong>{subscriber.name}</strong></div>
                  <div>فاتورة شهر: <strong>{selectedBill.month} / {selectedBill.year}</strong></div>
                  <div>المبلغ المتبقي: <strong className="text-danger">{(selectedBill.remainingAmount).toLocaleString('ar-IQ')} د.ع</strong></div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>مبلغ التسديد المستلم (د.ع)</label>
                    <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>سعر الأمبير لهذه الفاتورة (د.ع)</label>
                    <input type="number" value={paymentAmpPrice} onChange={(e) => setPaymentAmpPrice(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>ملاحظة عن الدفعة</label>
                  <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="مثال: دفع جزئي كاش، دفع كاش كامل" />
                </div>

                {errorMsg && <div className="login-error show">{errorMsg}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-success" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Save style={{ width: '14px', height: '14px' }} /> تأكيد الجباية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden PDF template for receipt generation */}
      {(paymentSuccessData || pdfReceiptData) && (
        <div 
          id="receipt-pdf-template" 
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '400px',
            padding: '24px',
            backgroundColor: '#ffffff',
            color: '#1f2937',
            fontFamily: "'Cairo', sans-serif",
            direction: 'rtl',
            textAlign: 'right',
            boxSizing: 'border-box',
            borderRadius: '12px',
            border: '2px solid #10b981',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}
        >
          {(() => {
            const activeReceipt = pdfReceiptData || paymentSuccessData;
            if (!activeReceipt) return null;
            return (
              <>
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #10b981', paddingBottom: '12px', marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img 
                    src={activeReceipt.generatorLogo || subscriber?.generator?.logoUrl || '/ambeeri-logo.png'} 
                    alt="الشعار" 
                    style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e5e7eb' }} 
                  />
                  <h4 style={{ margin: 0, color: '#374151', fontSize: '15px', fontWeight: 'bold' }}>{activeReceipt.generatorName || subscriber?.generator?.name || 'نظام إدارة المولدة'}</h4>
                  
                  {/* Owner Info Block */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px', fontSize: '12px', color: '#4b5563', width: '100%' }}>
                    {(activeReceipt.generatorOwner || subscriber?.generator?.ownerName) && (
                      <div>صاحب المولدة: <strong>{activeReceipt.generatorOwner || subscriber?.generator?.ownerName}</strong></div>
                    )}
                    {(activeReceipt.generatorPhone || subscriber?.generator?.phone) && (
                      <div>رقم الهاتف: <strong>{activeReceipt.generatorPhone || subscriber?.generator?.phone}</strong></div>
                    )}
                    {(activeReceipt.generatorArea || subscriber?.generator?.area) && (
                      <div>العنوان: <strong>{activeReceipt.generatorArea || subscriber?.generator?.area}</strong></div>
                    )}
                  </div>

                  <h1 style={{ margin: '14px 0 0 0', color: '#10b981', fontSize: '26px', fontWeight: '800', letterSpacing: '0.5px' }}>وصل تسديد</h1>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#374151' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>رقم الفاتورة:</span>
                    <span style={{ fontWeight: 'bold' }}>{activeReceipt.invoiceNumber || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>رقم الوصل:</span>
                    <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{activeReceipt.receiptNumber || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>تاريخ التسديد:</span>
                    <span>{activeReceipt.date ? new Date(activeReceipt.date).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>اسم المشترك:</span>
                    <span style={{ fontWeight: 'bold', color: '#111827' }}>{activeReceipt.subscriberName || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>البورد:</span>
                    <span>{activeReceipt.boardName || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>الشهر المسدد:</span>
                    <span style={{ fontWeight: 'bold' }}>{activeReceipt.month} / {activeReceipt.year}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>عدد الأمبيرات:</span>
                    <span style={{ fontWeight: 'bold' }}>{activeReceipt.amps || '—'} أمبير</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>سعر الأمبير:</span>
                    <span>{(activeReceipt.ampPrice || 0).toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>الديون السابقة:</span>
                    <span style={{ fontWeight: 'bold', color: activeReceipt.oldDebt > 0 ? '#ef4444' : 'inherit' }}>{(activeReceipt.oldDebt || 0).toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px', fontWeight: 'bold', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                    <span style={{ color: '#111827' }}>المبلغ الكلي المطلوب:</span>
                    <span style={{ color: '#111827' }}>{((activeReceipt.monthAmount || (activeReceipt.amps * activeReceipt.ampPrice) || 0) + (activeReceipt.oldDebt || 0)).toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                </div>

                {/* Amount Box */}
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', margin: '18px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#15803d', marginBottom: '4px', fontWeight: 'bold' }}>المبلغ المسدد</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#166534' }}>
                    {activeReceipt.amount ? (activeReceipt.amount).toLocaleString('ar-IQ') : '0'} د.ع
                  </div>
                </div>

                {/* Remaining Amount & Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#374151' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>حالة الدفع:</span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: activeReceipt.remainingAmount <= 0 ? '#15803d' : (activeReceipt.amount > 0 ? '#d97706' : '#ef4444') 
                    }}>
                      {activeReceipt.remainingAmount <= 0 ? 'تم تسديد الحساب بالكامل' : (activeReceipt.amount > 0 ? 'تسديد جزئي' : 'غير مسدد')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', paddingBottom: '4px' }}>
                    <span style={{ color: '#6b7280' }}>المتبقي الكلي:</span>
                    <span style={{ fontWeight: 'bold', color: activeReceipt.remainingAmount > 0 ? '#ef4444' : '#15803d' }}>
                      {(activeReceipt.remainingAmount).toLocaleString('ar-IQ')} د.ع
                    </span>
                  </div>
                  {activeReceipt.note && (
                    <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '8px', marginTop: '6px' }}>
                      <span style={{ color: '#6b7280', display: 'block', fontSize: '11px', marginBottom: '2px' }}>ملاحظة:</span>
                      <span style={{ fontSize: '12px', fontStyle: 'italic', color: '#4b5563', display: 'block', background: '#f9fafb', padding: '8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        {activeReceipt.note}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer message */}
                <div style={{ textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '20px', fontSize: '11px', color: '#9ca3af' }}>
                  شكراً لكم على تسديدكم.
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Payment Success & Printing Modal */}
      {paymentSuccessData && (
        <div className="modal show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', width: '95%', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border-dark)', color: 'var(--text-main)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: '10px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                <CheckCircle2 style={{ width: '22px', height: '22px' }} /> تم تسجيل التسديد بنجاح
              </h3>
              <button className="modal-close" onClick={() => setPaymentSuccessData(null)}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: '16px 0', fontSize: '.9rem' }}>
              <div style={{ background: 'var(--background)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-dark)', marginBottom: '16px', color: 'var(--text-main)' }}>
                <div style={{ marginBottom: '6px' }}>المشترك: <strong>{paymentSuccessData.subscriberName}</strong></div>
                <div style={{ marginBottom: '6px' }}>المبلغ المسدد: <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{paymentSuccessData.amount?.toLocaleString('ar-IQ')} د.ع</strong></div>
                {paymentSuccessData.remainingAmount > 0 ? (
                  <div style={{ marginBottom: '6px' }}>المتبقي: <strong style={{ color: 'var(--danger)' }}>{paymentSuccessData.remainingAmount?.toLocaleString('ar-IQ')} د.ع</strong></div>
                ) : (
                  <div style={{ color: '#047857', fontWeight: 'bold' }}>تم تسديد الحساب بالكامل</div>
                )}
                {paymentSuccessData.receiptNumber && (
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>رقم الوصل: <code style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{paymentSuccessData.receiptNumber}</code></div>
                )}
              </div>
              
              {paymentSuccessData.warning && (
                <div style={{ background: 'var(--warning-light)', padding: '10px', borderRadius: '8px', border: '1px solid var(--warning)', color: 'var(--warning)', fontSize: '.8rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle style={{ width: '16px', height: '16px' }} />
                  <span>{paymentSuccessData.warning}</span>
                </div>
              )}
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-dark)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => window.open(`/api/receipts/${paymentSuccessData.paymentId}/pdf`, '_blank')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '.85rem' }}
                >
                  <FileText size={16} /> عرض الوصل PDF
                </button>
                
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  disabled={downloadingPDF}
                  onClick={() => handleDownloadPDF(paymentSuccessData)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '.85rem' }}
                >
                  <FileText size={16} /> {downloadingPDF ? 'جاري...' : 'تحميل الوصل'}
                </button>
                
                <button 
                  type="button" 
                  className="btn btn-whatsapp"
                  onClick={() => handleWhatsappShare(paymentSuccessData)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: '#25d366', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '.85rem' }}
                >
                  <WhatsAppIcon size={16} /> إرسال واتساب
                </button>

                {(!user || !user.role || user.role === 'OWNER' || (user.permissions && user.permissions.print_receipt)) && (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    disabled={printingBluetooth}
                    onClick={async () => {
                      setPrintingBluetooth(true);
                      const res = await printReceiptBluetooth(paymentSuccessData);
                      setPrintingBluetooth(false);
                      
                      // Log print action
                      await fetch('/api/owner/print-logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          billId: paymentSuccessData.billId,
                          paymentId: paymentSuccessData.paymentId,
                          printerType: 'BLUETOOTH',
                          status: res.success ? 'SUCCESS' : 'FAILED',
                          errorMessage: res.error || null
                        })
                      });
                      
                      if (res.success) {
                        alert('تمت عملية الطباعة بنجاح!');
                      } else {
                        alert(`الطباعة عبر البلوتوث غير مدعومة على هذا الجهاز أو فشل الاتصال. ${res.error}\nيمكنك طباعة الوصل من المتصفح.`);
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', fontSize: '.85rem' }}
                  >
                    <Printer size={16} /> {printingBluetooth ? 'جاري...' : 'طباعة الوصل'}
                  </button>
                )}
              </div>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPaymentSuccessData(null)}
                style={{ width: '100%', marginTop: '4px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Warning Modal */}
      {whatsappWarning && (
        <div className="modal show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', background: '#1e293b', border: '1px solid #3d4f68', color: '#fff', borderRadius: '12px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #3d4f68', paddingBottom: '10px' }}>
              <h3 style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle style={{ width: '20px', height: '20px' }} /> تنبيه إرسال واتساب
              </h3>
              <button className="modal-close" onClick={() => setWhatsappWarning(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0', fontSize: '.9rem', textAlign: 'center' }}>
              <p>{whatsappWarning.message}</p>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #3d4f68', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setWhatsappWarning(null)}>إغلاق</button>
              <a 
                href={whatsappWarning.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-whatsapp" 
                onClick={() => setWhatsappWarning(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', background: '#25d366', color: '#fff' }}
              >
                إرسال واتساب يدوياً <WhatsAppIcon size={16} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
