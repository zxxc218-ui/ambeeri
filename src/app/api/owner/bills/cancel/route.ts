import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  // Employee permission check
  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['cancel_bill'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إلغاء الفواتير' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { billId } = body;

    if (!billId) {
      return NextResponse.json({ error: 'معرّف الفاتورة مطلوب' }, { status: 400 });
    }

    // Fetch the bill
    const bill = await prisma.monthlyBill.findFirst({
      where: { id: billId, generatorId: user.generatorId },
      include: { payments: true }
    });

    if (!bill) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية الوصول إليها' }, { status: 404 });
    }

    if (bill.paymentStatus === 'CANCELLED') {
      return NextResponse.json({ error: 'هذه الفاتورة ملغاة بالفعل' }, { status: 400 });
    }

    if (bill.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'لا يمكن إلغاء فاتورة مسددة بالكامل. يجب استرداد المبالغ أولاً.' }, { status: 400 });
    }

    // Employee board restriction
    if (user.role === 'EMPLOYEE' && user.boardId && user.boardId !== 'all' && user.boardId !== bill.boardId) {
      return NextResponse.json({ error: 'لا يمكنك إلغاء فاتورة لبورد خارج صلاحيتك' }, { status: 403 });
    }

    // Cancel the bill
    await prisma.monthlyBill.update({
      where: { id: billId },
      data: {
        paymentStatus: 'CANCELLED',
        remainingAmount: 0,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم إلغاء الفاتورة بنجاح'
    });
  } catch (error) {
    console.error('Cancel bill error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إلغاء الفاتورة' }, { status: 500 });
  }
}
