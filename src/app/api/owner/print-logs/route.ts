import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'عفواً غير مصرح بالدخول' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { billId, paymentId, printerType, status, errorMessage } = body;

    if (!billId || !paymentId || !printerType || !status) {
      return NextResponse.json({ error: 'البيانات المرسلة غير مكتملة' }, { status: 400 });
    }

    const log = await prisma.printLog.create({
      data: {
        generatorId: user.generatorId,
        billId,
        paymentId,
        userId: user.userId,
        printerType,
        status,
        errorMessage: errorMessage || null
      }
    });

    // If printing was successful, update printedAt and printedByUserId in Payment table
    if (status === 'SUCCESS') {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          printedAt: new Date(),
          printedByUserId: user.userId
        }
      });
    }

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Create print log error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ سجل الطباعة' }, { status: 500 });
  }
}
