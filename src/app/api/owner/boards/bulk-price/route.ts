import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function PUT(request: Request) {
  const user = await checkAuth();
  if (!user || user.role !== 'OWNER' || !user.generatorId) {
    return NextResponse.json({ error: 'عفواً غير مصرح بالدخول أو غير مالك للمولدة' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { defaultAmpPrice } = body;

    if (defaultAmpPrice === undefined || isNaN(parseInt(defaultAmpPrice))) {
      return NextResponse.json({ error: 'السعر المدخل غير صالح' }, { status: 400 });
    }

    const price = parseInt(defaultAmpPrice);

    // Update all boards belonging to this generator
    const updateResult = await prisma.board.updateMany({
      where: {
        generatorId: user.generatorId
      },
      data: {
        defaultAmpPrice: price
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `تم تحديث سعر الأمبير لـ ${updateResult.count} بورد بنجاح.`,
      count: updateResult.count
    });
  } catch (error) {
    console.error('Bulk update board price error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث الأسعار' }, { status: 500 });
  }
}
