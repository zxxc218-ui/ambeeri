import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'معرّف المشترك مطلوب' }, { status: 400 });
  }

  try {
    const subscriber = await prisma.subscriber.findFirst({
      where: { id, generatorId: user.generatorId },
      include: {
        board: {
          select: { name: true }
        },
        monthlyBills: {
          include: {
            payments: {
              orderBy: { date: 'desc' }
            }
          },
          orderBy: [
            { year: 'desc' },
            { month: 'desc' }
          ]
        }
      }
    });

    if (!subscriber) {
      return NextResponse.json({ error: 'المشترك غير موجود' }, { status: 404 });
    }

    if (user.role === 'EMPLOYEE' && user.boardId && user.boardId !== 'all' && user.boardId !== subscriber.boardId) {
      return NextResponse.json({ error: 'غير مصرح لك بالوصول لبيانات هذا المشترك' }, { status: 403 });
    }

    // Calculate total paid by this subscriber (all time)
    const totalPaidAgg = await prisma.payment.aggregate({
      where: { subscriberId: id, generatorId: user.generatorId },
      _sum: { amount: true }
    });
    const totalPaid = totalPaidAgg._sum.amount || 0;

    return NextResponse.json({ subscriber, totalPaid });
  } catch (error) {
    console.error('Fetch subscriber detail error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب تفاصيل المشترك' }, { status: 500 });
  }
}
