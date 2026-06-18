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
    let targetGenId = user.generatorId;
    if (user.role === 'SUPER_ADMIN') {
      targetGenId = (generatorId && generatorId !== 'all') ? generatorId : null;
    }

    const whereClause: any = {};
    if (targetGenId) {
      whereClause.generatorId = targetGenId;
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب المصاريف' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['manage_expenses'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إدارة المصاريف' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, amount, date, note, generatorId } = body;

    let targetGenId = user.generatorId;
    if (user.role === 'SUPER_ADMIN') {
      targetGenId = generatorId;
    }

    if (!targetGenId) {
      return NextResponse.json({ error: 'معرّف المولدة مطلوب' }, { status: 400 });
    }

    if (!type || amount === undefined || !date) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        generatorId: targetGenId,
        type,
        amount: parseInt(amount) || 0,
        date: new Date(date),
        note: note || ''
      }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إضافة المصروف' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await checkAuth();
  if (!user || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['manage_expenses'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إدارة المصاريف' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, type, amount, date, note, generatorId } = body;

    if (!id || !type || amount === undefined || !date) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }

    // Verify ownership
    const whereClause: any = { id };
    if (user.role !== 'SUPER_ADMIN') {
      whereClause.generatorId = user.generatorId;
    } else if (generatorId) {
      whereClause.generatorId = generatorId;
    }

    const existing = await prisma.expense.findFirst({
      where: whereClause
    });
    if (!existing) {
      return NextResponse.json({ error: 'المصروف غير موجود أو لا تملك صلاحية تعديله' }, { status: 404 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        type,
        amount: parseInt(amount) || 0,
        date: new Date(date),
        note: note || ''
      }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل المصروف' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await checkAuth();
  if (!user || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['manage_expenses'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إدارة المصاريف' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const generatorId = searchParams.get('generatorId');
    if (!id) {
      return NextResponse.json({ error: 'معرّف المصروف مطلوب' }, { status: 400 });
    }

    // Verify ownership
    const whereClause: any = { id };
    if (user.role !== 'SUPER_ADMIN') {
      whereClause.generatorId = user.generatorId;
    } else if (generatorId) {
      whereClause.generatorId = generatorId;
    }

    const existing = await prisma.expense.findFirst({
      where: whereClause
    });

    if (!existing) {
      return NextResponse.json({ error: 'المصروف غير موجود' }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف المصروف' }, { status: 500 });
  }
}
