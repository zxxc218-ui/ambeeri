import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { sendWhatsappMessage } from '@/lib/whatsapp';

export async function GET(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subscriberId = searchParams.get('subscriberId');
  const boardId = searchParams.get('boardId');

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

    if (subscriberId) {
      whereClause.subscriberId = subscriberId;
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        subscriber: {
          select: { name: true }
        },
        bill: {
          select: { month: true, year: true }
        },
        board: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Fetch payments error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الدفعات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  // Employee permission check
  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['collect_payment'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية جباية أو إضافة دفعات' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { billId, amount, note, ampPrice, amps } = body;

    if (!billId || amount === undefined || amount <= 0) {
      return NextResponse.json({ error: 'مُعرّف الفاتورة وقيمة المبلغ مطلوبة ويجب أن تكون أكبر من صفر' }, { status: 400 });
    }

    // Verify bill ownership
    const bill = await prisma.monthlyBill.findFirst({
      where: { id: billId, generatorId: user.generatorId },
      include: { subscriber: true }
    });

    if (!bill) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية الوصول لها' }, { status: 404 });
    }

    // Double check employee board restriction
    if (user.role === 'EMPLOYEE' && user.boardId && user.boardId !== 'all' && user.boardId !== bill.boardId) {
      return NextResponse.json({ error: 'لا يمكنك إضافة دفعة لبورد خارج صلاحيتك' }, { status: 403 });
    }

    // Process payment in a transaction
    const payment = await prisma.$transaction(async (tx) => {
      const finalAmps = amps ? parseInt(amps) : bill.amps;
      const finalAmpPrice = ampPrice ? parseInt(ampPrice) : bill.ampPrice;
      const newMonthAmount = finalAmps * finalAmpPrice;
      
      const newPaidAmount = bill.paidAmount + parseInt(amount);
      const totalCost = newMonthAmount + bill.oldDebt;
      let newRemainingAmount = totalCost - newPaidAmount;
      
      let status: 'PAID' | 'PARTIAL' | 'UNPAID' = 'PARTIAL';
      if (newRemainingAmount <= 0) {
        status = 'PAID';
        newRemainingAmount = 0;
      }

      // Update bill
      await tx.monthlyBill.update({
        where: { id: billId },
        data: {
          amps: finalAmps,
          ampPrice: finalAmpPrice,
          monthAmount: newMonthAmount,
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          paymentStatus: status,
          lastPaymentDate: new Date()
        }
      });

      // Update subscriber's default subscription amps
      await tx.subscriber.update({
        where: { id: bill.subscriberId },
        data: {
          amps: finalAmps
        }
      });

      // Generate receiptNumber sequence
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const yearMonthKey = `${year}${month}`;
      const startOfMonth = new Date(year, d.getMonth(), 1);
      const endOfMonth = new Date(year, d.getMonth() + 1, 0, 23, 59, 59, 999);

      const existingCount = await tx.payment.count({
        where: {
          generatorId: user.generatorId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });
      const seqIndex = existingCount + 1;
      const seqStr = String(seqIndex).padStart(4, '0');
      const recNum = `${yearMonthKey}${seqStr}`;

      // Create payment
      return await tx.payment.create({
        data: {
          receiptNumber: recNum,
          generatorId: user.generatorId,
          boardId: bill.boardId,
          subscriberId: bill.subscriberId,
          billId: bill.id,
          amount: parseInt(amount),
          ampPriceAtPayment: finalAmpPrice,
          note: note || '',
          date: new Date()
        }
      });
    });

    // Send WhatsApp notification
    let warning = null;
    let isMissingCredentials = false;
    let whatsappMessage = '';
    let whatsappPhone = '';

    if (bill.subscriber) {
      whatsappPhone = bill.subscriber.phone;
      whatsappMessage = `عزيزي المشترك ${bill.subscriber.name}، تم استلام دفعة بقيمة ${(parseInt(amount)).toLocaleString('ar-IQ')} د.ع لفاتورة شهر ${bill.month} / ${bill.year}. شكراً لتسديدكم.`;

      const sendResult = await sendWhatsappMessage(whatsappPhone, whatsappMessage);

      // Log notification in database
      const notificationStatus = sendResult.success ? 'SENT' : (sendResult.isMissingCredentials ? 'PENDING' : 'FAILED');
      
      await prisma.whatsappNotification.create({
        data: {
          generatorId: user.generatorId,
          subscriberId: bill.subscriberId,
          billId: bill.id,
          toPhone: whatsappPhone,
          message: whatsappMessage,
          type: 'PAYMENT_CONFIRMATION',
          status: notificationStatus,
          errorMessage: sendResult.success ? null : sendResult.error
        }
      });

      if (sendResult.isMissingCredentials) {
        warning = 'مفاتيح واتساب غير مضبوطة، تم حفظ التسديد بدون إرسال الإشعار.';
        isMissingCredentials = true;
      }
    }

    return NextResponse.json({ 
      success: true, 
      payment, 
      warning, 
      isMissingCredentials,
      whatsappMessage,
      whatsappPhone
    });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إضافة الدفعة' }, { status: 500 });
  }
}
