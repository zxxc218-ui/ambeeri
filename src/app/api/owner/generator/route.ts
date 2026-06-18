import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function GET() {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const generator = await prisma.generator.findUnique({
      where: { id: user.generatorId },
      select: {
        id: true,
        name: true,
        ownerName: true,
        phone: true,
        area: true,
        logoUrl: true
      }
    });

    if (!generator) {
      return NextResponse.json({ error: 'المولدة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ generator });
  } catch (error) {
    console.error('Fetch generator error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب بيانات المولدة' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  if (user.role !== 'OWNER') {
    return NextResponse.json({ error: 'عفواً، للمالك فقط صلاحية تعديل بيانات المولدة' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, ownerName, phone, area, logoUrl } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم المولدة مطلوب' }, { status: 400 });
    }
    if (!ownerName || !ownerName.trim()) {
      return NextResponse.json({ error: 'اسم صاحب المولدة مطلوب' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'رقم هاتف صاحب المولدة مطلوب' }, { status: 400 });
    }
    if (!area || !area.trim()) {
      return NextResponse.json({ error: 'عنوان المولدة مطلوب' }, { status: 400 });
    }

    const updated = await prisma.generator.update({
      where: { id: user.generatorId },
      data: {
        name: name.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        area: area.trim(),
        logoUrl: logoUrl ? logoUrl.trim() : null
      }
    });

    return NextResponse.json({ success: true, generator: updated });
  } catch (error) {
    console.error('Update generator error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث بيانات المولدة' }, { status: 500 });
  }
}
