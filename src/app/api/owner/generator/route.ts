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

  try {
    let targetId = user.generatorId;
    if (user.role === 'SUPER_ADMIN') {
      targetId = (generatorId && generatorId !== 'all') ? generatorId : null;
    }

    if (!targetId) {
      const firstGen = await prisma.generator.findFirst({
        select: {
          id: true,
          name: true,
          ownerName: true,
          phone: true,
          area: true,
          logoUrl: true
        }
      });
      return NextResponse.json({ generator: firstGen });
    }

    const generator = await prisma.generator.findUnique({
      where: { id: targetId },
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
  if (!user || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'عفواً، للمالك أو الأدمن فقط صلاحية تعديل بيانات المولدة' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, ownerName, phone, area, logoUrl } = body;

    let targetId = user.generatorId;
    if (user.role === 'SUPER_ADMIN') {
      targetId = id || body.generatorId;
    }

    if (!targetId) {
      return NextResponse.json({ error: 'معرّف المولدة مطلوب' }, { status: 400 });
    }

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
      where: { id: targetId },
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
