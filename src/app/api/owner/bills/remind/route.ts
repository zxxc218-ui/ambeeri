import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { sendWhatsappMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  // Check permissions: Owner or Employee with collect_payment permission
  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['collect_payment'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إرسال التذكيرات' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { billId } = body;

    if (!billId) {
      return NextResponse.json({ error: 'مُعرّف الفاتورة مطلوب' }, { status: 400 });
    }

    // Fetch bill and subscriber details
    const bill = await prisma.monthlyBill.findFirst({
      where: { id: billId, generatorId: user.generatorId },
      include: {
        subscriber: true
      }
    });

    if (!bill) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية الوصول لها' }, { status: 404 });
    }

    if (bill.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'هذه الفاتورة مسددة بالكامل بالفعل' }, { status: 400 });
    }

    // Determine message text
    let message = '';
    if (bill.paymentStatus === 'UNPAID') {
      message = `عزيزي المشترك، نود تذكيرك بأن فاتورة اشتراك المولدة لشهر ${bill.month} / ${bill.year} لم يتم تسديدها لحد الآن. يرجى التسديد بأقرب وقت، مع الشكر.`;
    } else {
      message = `عزيزي المشترك، نود تذكيرك بأن فاتورة اشتراك المولدة لشهر ${bill.month} / ${bill.year} غير مسددة بالكامل لحد الآن. يرجى إكمال التسديد، مع الشكر.`;
    }

    // Send WhatsApp message
    const sendResult = await sendWhatsappMessage(bill.subscriber.phone, message);

    const status = sendResult.success ? 'SENT' : (sendResult.isMissingCredentials ? 'PENDING' : 'FAILED');

    // Update database in transaction
    await prisma.$transaction(async (tx) => {
      // Update bill reminder status
      await tx.monthlyBill.update({
        where: { id: billId },
        data: {
          reminderStatus: status === 'SENT' ? 'SENT' : (status === 'PENDING' ? 'PENDING' : 'FAILED'),
          reminderSentAt: new Date()
        }
      });

      // Log notification
      await tx.whatsappNotification.create({
        data: {
          generatorId: user.generatorId,
          subscriberId: bill.subscriberId,
          billId: bill.id,
          toPhone: bill.subscriber.phone,
          message: message,
          type: 'UNPAID_REMINDER',
          status: status,
          errorMessage: sendResult.success ? null : sendResult.error
        }
      });
    });

    if (sendResult.isMissingCredentials) {
      return NextResponse.json({ 
        success: true, 
        warning: 'مفاتيح واتساب غير مضبوطة، تم حفظ التسديد بدون إرسال الإشعار.',
        isMissingCredentials: true,
        whatsappMessage: message,
        whatsappPhone: bill.subscriber.phone
      });
    }

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error || 'فشل إرسال التنبيه عبر واتساب' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'تم إرسال التنبيه وتحديث الحالة بنجاح' });
  } catch (error: any) {
    console.error('Manual reminder error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء إرسال التذكير' }, { status: 500 });
  }
}
