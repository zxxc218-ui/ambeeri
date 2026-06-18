import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await checkAuth();
  if (!user || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const generatorId = searchParams.get('generatorId');
  const boardId = searchParams.get('boardId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  try {
    let targetGenId = user.generatorId;
    if (user.role === 'SUPER_ADMIN') {
      targetGenId = (generatorId && generatorId !== 'all') ? generatorId : null;
    }

    const restrictedBoardId = user.boardId && user.boardId !== 'all' ? user.boardId : null;
    const targetBoardId = restrictedBoardId || (boardId && boardId !== 'all' ? boardId : null);

    // Filter subscribers
    const subFilter: any = {
      status: 'ACTIVE'
    };
    if (targetGenId) {
      subFilter.generatorId = targetGenId;
    }
    if (targetBoardId) {
      subFilter.boardId = targetBoardId;
    }

    const subscribersCount = await prisma.subscriber.count({ where: subFilter });
    const subscribers = await prisma.subscriber.findMany({
      where: subFilter,
      select: { amps: true }
    });
    const totalAmps = subscribers.reduce((sum, s) => sum + s.amps, 0);

    // Bill filters
    const billFilter: any = {};
    if (targetGenId) {
      billFilter.generatorId = targetGenId;
    }
    if (targetBoardId) {
      billFilter.boardId = targetBoardId;
    }
    if (month) {
      billFilter.month = month;
    }
    if (year) {
      billFilter.year = year;
    }

    const bills = await prisma.monthlyBill.findMany({
      where: billFilter,
      select: {
        monthAmount: true,
        oldDebt: true,
        paidAmount: true,
        remainingAmount: true
      }
    });

    const expectedRevenue = bills.reduce((sum, b) => sum + b.monthAmount, 0);
    const totalOldDebt = bills.reduce((sum, b) => sum + b.oldDebt, 0);
    const collectedAmount = bills.reduce((sum, b) => sum + b.paidAmount, 0);
    const remainingAmount = bills.reduce((sum, b) => sum + b.remainingAmount, 0);

    // Expense filters
    const expenseFilter: any = {};
    if (targetGenId) {
      expenseFilter.generatorId = targetGenId;
    }
    
    if (month && year) {
      const monthInt = parseInt(month);
      const yearInt = parseInt(year);
      const startDate = new Date(yearInt, monthInt - 1, 1);
      const endDate = new Date(yearInt, monthInt, 0, 23, 59, 59);
      expenseFilter.date = {
        gte: startDate,
        lte: endDate
      };
    }

    const expenses = await prisma.expense.findMany({
      where: expenseFilter,
      select: { amount: true }
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Count of boards
    const boardFilter: any = {};
    if (targetGenId) {
      boardFilter.generatorId = targetGenId;
    }
    if (restrictedBoardId) {
      boardFilter.id = restrictedBoardId;
    }
    const boardsCount = await prisma.board.count({
      where: boardFilter
    });

    // Overall Stats calculations
    const overallPaymentFilter: any = {};
    if (targetGenId) {
      overallPaymentFilter.generatorId = targetGenId;
    }
    const totalPaymentsSum = await prisma.payment.aggregate({
      where: overallPaymentFilter,
      _sum: { amount: true }
    });
    const overallCollected = totalPaymentsSum._sum.amount || 0;

    const overallDebtFilter: any = {};
    if (targetGenId) {
      overallDebtFilter.generatorId = targetGenId;
    }
    const totalDebtSum = await prisma.monthlyBill.aggregate({
      where: overallDebtFilter,
      _sum: { remainingAmount: true }
    });
    const overallRemainingDebt = totalDebtSum._sum.remainingAmount || 0;

    const overallExpenseFilter: any = {};
    if (targetGenId) {
      overallExpenseFilter.generatorId = targetGenId;
    }
    const totalExpensesSum = await prisma.expense.aggregate({
      where: overallExpenseFilter,
      _sum: { amount: true }
    });
    const overallExpenses = totalExpensesSum._sum.amount || 0;

    return NextResponse.json({
      stats: {
        subscribersCount,
        totalAmps,
        boardsCount,
        expectedRevenue,
        totalOldDebt,
        collectedAmount,
        remainingAmount,
        totalExpenses,
        netProfit: collectedAmount - totalExpenses,
        overall: {
          collected: overallCollected,
          debt: overallRemainingDebt,
          expenses: overallExpenses
        }
      }
    });
  } catch (error) {
    console.error('Fetch reports error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب التقارير' }, { status: 500 });
  }
}
