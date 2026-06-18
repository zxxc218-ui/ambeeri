import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const boardId = searchParams.get('boardId');
  const status = searchParams.get('status');

  try {
    const restrictedBoardId = user.boardId && user.boardId !== 'all' ? user.boardId : null;

    const whereClause: any = {
      generatorId: user.generatorId,
    };

    if (restrictedBoardId) {
      whereClause.boardId = restrictedBoardId;
    } else if (boardId && boardId !== 'all') {
      whereClause.boardId = boardId;
    }

    if (month) whereClause.month = month;
    if (year) whereClause.year = year;
    if (status && ['PAID', 'UNPAID', 'PARTIAL'].includes(status)) {
      whereClause.paymentStatus = status;
    }

    const bills = await prisma.monthlyBill.findMany({
      where: whereClause,
      include: {
        subscriber: {
          select: { name: true, phone: true, address: true }
        },
        board: {
          select: { name: true }
        },
        payments: {
          select: { amount: true, date: true, note: true, ampPriceAtPayment: true },
          orderBy: { date: 'asc' }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { subscriber: { name: 'asc' } }
      ]
    });

    // Map reminder status to Arabic
    const reminderStatusAr = (s: string) => {
      if (s === 'SENT') return 'تم التذكير';
      if (s === 'FAILED') return 'فشل التذكير';
      if (s === 'PENDING') return 'تذكير معلق (يدوي)';
      return 'لم يرسل';
    };

    // Map payment status to Arabic
    const paymentStatusAr = (s: string) => {
      if (s === 'PAID') return 'تم الدفع كامل';
      if (s === 'PARTIAL') return 'دفع جزئي';
      if (s === 'LATE') return 'متأخر';
      return 'غير دافع';
    };

    // Build rows
    const rows = bills.map((b, index) => {
      const paymentsText = b.payments.length > 0
        ? b.payments.map(p =>
            `${p.amount.toLocaleString()} د.ع (${new Date(p.date).toLocaleDateString('ar-IQ')})${p.note ? ' - ' + p.note : ''}`
          ).join(' | ')
        : 'لا يوجد';

      return {
        '#': index + 1,
        'اسم المشترك': b.subscriber?.name || '',
        'رقم الهاتف': b.subscriber?.phone || '',
        'العنوان': b.subscriber?.address || '',
        'البورد': b.board?.name || '',
        'الشهر': b.month,
        'السنة': b.year,
        'عدد الأمبيرات': b.amps,
        'سعر الأمبير (د.ع)': b.ampPrice,
        'أجرة الشهر (د.ع)': b.monthAmount,
        'الديون السابقة (د.ع)': b.oldDebt,
        'إجمالي المستحق (د.ع)': b.monthAmount + b.oldDebt,
        'المبلغ المسدّد (د.ع)': b.paidAmount,
        'المبلغ المتبقي (د.ع)': b.remainingAmount,
        'حالة الدفع': paymentStatusAr(b.paymentStatus),
        'حالة واتساب التذكير': reminderStatusAr(b.reminderStatus),
        'تاريخ آخر دفعة': b.lastPaymentDate
          ? new Date(b.lastPaymentDate).toLocaleDateString('ar-IQ')
          : 'لا يوجد',
        'تفاصيل الدفعات': paymentsText,
        'تاريخ إنشاء الفاتورة': new Date(b.createdAt).toLocaleDateString('ar-IQ'),
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 25 },  // اسم المشترك
      { wch: 18 },  // رقم الهاتف
      { wch: 25 },  // العنوان
      { wch: 18 },  // البورد
      { wch: 8 },   // الشهر
      { wch: 8 },   // السنة
      { wch: 14 },  // عدد الأمبيرات
      { wch: 18 },  // سعر الأمبير
      { wch: 18 },  // أجرة الشهر
      { wch: 20 },  // الديون السابقة
      { wch: 20 },  // إجمالي المستحق
      { wch: 18 },  // المبلغ المسدّد
      { wch: 18 },  // المبلغ المتبقي
      { wch: 18 },  // حالة الدفع
      { wch: 22 },  // حالة واتساب
      { wch: 20 },  // تاريخ آخر دفعة
      { wch: 50 },  // تفاصيل الدفعات
      { wch: 22 },  // تاريخ إنشاء الفاتورة
    ];

    const sheetName = month && year
      ? `فواتير ${month}-${year}`
      : 'كل الفواتير';

    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const fileName = month && year
      ? `bills_${year}_${month}.xlsx`
      : `bills_all.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Export bills error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تصدير الفواتير' }, { status: 500 });
  }
}
