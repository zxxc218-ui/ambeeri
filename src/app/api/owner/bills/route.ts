import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subscriberId = searchParams.get('subscriberId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const boardId = searchParams.get('boardId');
  const status = searchParams.get('status'); // all, PAID, UNPAID, PARTIAL, LATE

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
    if (month && month !== 'all') {
      whereClause.month = month;
    }
    if (year && year !== 'all') {
      whereClause.year = year;
    }

    // If status is a direct database status, we can filter here
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
          select: { id: true, amount: true, date: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    let filteredBills = bills;

    // Filter LATE status in-memory to handle dueDay logic
    if (status === 'LATE') {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const currentDay = new Date().getDate();

      const generator = await prisma.generator.findUnique({
        where: { id: user.generatorId },
        select: { paymentDueDay: true }
      });
      const dueDay = generator?.paymentDueDay || 10;

      filteredBills = bills.filter(b => {
        if (b.paymentStatus === 'PAID') return false;
        if (b.paymentStatus === 'LATE') return true;

        const billYr = parseInt(b.year);
        const billMth = parseInt(b.month);

        if (billYr < currentYear) return true;
        if (billYr === currentYear && billMth < currentMonth) return true;
        if (billYr === currentYear && billMth === currentMonth && currentDay > dueDay) return true;

        return false;
      });
    }

    return NextResponse.json({ bills: filteredBills });
  } catch (error) {
    console.error('Fetch bills error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الفواتير' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  // Employee permission check
  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['generate_bills'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية بدء شهر جديد وتوليد الفواتير' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { month, year, boardId, ampPrice } = body;

    if (!month || !year) {
      return NextResponse.json({ error: 'الشهر والسنة مطلوبان' }, { status: 400 });
    }

    const restrictedBoardId = user.boardId && user.boardId !== 'all' ? user.boardId : null;
    const targetBoardId = restrictedBoardId || boardId;

    // Fetch active subscribers
    const subscribers = await prisma.subscriber.findMany({
      where: {
        generatorId: user.generatorId,
        status: 'ACTIVE',
        boardId: targetBoardId ? targetBoardId : undefined
      }
    });

    if (subscribers.length === 0) {
      return NextResponse.json({ error: 'لا يوجد مشتركون نشطون لتوليد فواتير لهم' }, { status: 400 });
    }

    let createdCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      // Get current count of bills for this generator, month, and year to start sequence
      const existingCount = await tx.monthlyBill.count({
        where: {
          generatorId: user.generatorId,
          month,
          year
        }
      });
      let seqIndex = existingCount;

      for (const sub of subscribers) {
        // Check if bill already exists
        const exists = await tx.monthlyBill.findUnique({
          where: {
            subscriberId_month_year: {
              subscriberId: sub.id,
              month,
              year
            }
          }
        });

        if (exists) {
          skippedCount++;
          continue;
        }

        // Calculate old debt: sum remainingAmount of all previous bills
        const unpaidBills = await tx.monthlyBill.findMany({
          where: {
            subscriberId: sub.id,
            paymentStatus: { in: ['UNPAID', 'PARTIAL', 'LATE'] }
          }
        });

        const totalUnpaidFromBills = unpaidBills.reduce((sum, b) => sum + b.remainingAmount, 0);
        const totalOldDebt = sub.oldDebt + totalUnpaidFromBills;

        const finalAmpPrice = ampPrice ? parseInt(ampPrice) : sub.ampPrice;
        const monthAmount = sub.amps * finalAmpPrice;
        const remainingAmount = monthAmount + totalOldDebt;

        seqIndex++;
        const seqStr = String(seqIndex).padStart(4, '0');
        const invoiceNum = `${year}${month}${seqStr}`;

        await tx.monthlyBill.create({
          data: {
            invoiceNumber: invoiceNum,
            generatorId: user.generatorId,
            boardId: sub.boardId,
            subscriberId: sub.id,
            month,
            year,
            amps: sub.amps,
            ampPrice: finalAmpPrice,
            monthAmount,
            oldDebt: totalOldDebt,
            remainingAmount,
            paidAmount: 0,
            paymentStatus: 'UNPAID'
          }
        });

        createdCount++;
      }
    });

    return NextResponse.json({
      success: true,
      message: `تم توليد الفواتير بنجاح. المضافة: ${createdCount}، المتخطاة: ${skippedCount}`
    });
  } catch (error) {
    console.error('Generate bills error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء توليد الفواتير' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  // Employee permission check
  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['generate_bills'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية تعديل الفواتير' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { billId, amps, ampPrice, oldDebt, paidAmount, paymentStatus } = body;

    if (!billId) {
      return NextResponse.json({ error: 'معرّف الفاتورة مطلوب' }, { status: 400 });
    }

    const bill = await prisma.monthlyBill.findFirst({
      where: { id: billId, generatorId: user.generatorId }
    });

    if (!bill) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    const updatedAmps = amps !== undefined ? parseInt(amps) : bill.amps;
    const updatedAmpPrice = ampPrice !== undefined ? parseInt(ampPrice) : bill.ampPrice;
    const updatedMonthAmount = updatedAmps * updatedAmpPrice;
    const updatedOldDebt = oldDebt !== undefined ? parseInt(oldDebt) : bill.oldDebt;
    const updatedPaidAmount = paidAmount !== undefined ? parseInt(paidAmount) : bill.paidAmount;

    let updatedRemainingAmount = (updatedMonthAmount + updatedOldDebt) - updatedPaidAmount;
    if (updatedRemainingAmount < 0) updatedRemainingAmount = 0;

    let finalStatus = paymentStatus || bill.paymentStatus;
    if (paymentStatus === undefined) {
      if (updatedRemainingAmount === 0) {
        finalStatus = 'PAID';
      } else if (updatedPaidAmount > 0) {
        finalStatus = 'PARTIAL';
      } else {
        finalStatus = 'UNPAID';
      }
    } else if (paymentStatus === 'CANCELLED') {
      updatedRemainingAmount = 0;
    }

    const updatedBill = await prisma.monthlyBill.update({
      where: { id: billId },
      data: {
        amps: updatedAmps,
        ampPrice: updatedAmpPrice,
        monthAmount: updatedMonthAmount,
        oldDebt: updatedOldDebt,
        paidAmount: updatedPaidAmount,
        remainingAmount: updatedRemainingAmount,
        paymentStatus: finalStatus
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم تعديل الفاتورة بنجاح',
      bill: updatedBill
    });
  } catch (error) {
    console.error('Update bill error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل الفاتورة' }, { status: 500 });
  }
}
