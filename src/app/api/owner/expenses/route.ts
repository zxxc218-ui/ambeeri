import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function GET() {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: { generatorId: user.generatorId },
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
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['manage_expenses'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إدارة المصاريف' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, amount, date, note } = body;

    if (!type || amount === undefined || !date) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        generatorId: user.generatorId,
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
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['manage_expenses'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إدارة المصاريف' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, type, amount, date, note } = body;

    if (!id || !type || amount === undefined || !date) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.expense.findFirst({
      where: { id, generatorId: user.generatorId }
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
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['manage_expenses'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إدارة المصاريف' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرّف المصروف مطلوب' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.expense.findFirst({
      where: { id, generatorId: user.generatorId }
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
