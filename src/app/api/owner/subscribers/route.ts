import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('boardId');

  try {
    const restrictedBoardId = user.boardId && user.boardId !== 'all' ? user.boardId : null;

    // Build filter
    const whereClause: any = {
      generatorId: user.generatorId,
    };

    if (restrictedBoardId) {
      whereClause.boardId = restrictedBoardId;
    } else if (boardId && boardId !== 'all') {
      whereClause.boardId = boardId;
    }

    const subscribers = await prisma.subscriber.findMany({
      where: whereClause,
      include: {
        board: {
          select: { name: true }
        },
        monthlyBills: {
          select: {
            id: true,
            month: true,
            year: true,
            monthAmount: true,
            oldDebt: true,
            paidAmount: true,
            remainingAmount: true,
            paymentStatus: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error('Fetch subscribers error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب المشتركين' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  // Employee permission check
  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['add_subscriber'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إضافة مشترك جديد' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, phone, address, amps, ampPrice, oldDebt, boardId } = body;

    if (!name || !phone || !address || amps === undefined || ampPrice === undefined || !boardId) {
      return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب إدخالها' }, { status: 400 });
    }

    // Double check employee board restriction
    if (user.role === 'EMPLOYEE' && user.boardId && user.boardId !== 'all' && user.boardId !== boardId) {
      return NextResponse.json({ error: 'لا يمكنك إضافة مشترك لبورد خارج صلاحيتك' }, { status: 403 });
    }

    const subscriber = await prisma.subscriber.create({
      data: {
        generatorId: user.generatorId,
        boardId,
        name,
        phone,
        address,
        amps: parseInt(amps) || 0,
        ampPrice: parseInt(ampPrice) || 0,
        oldDebt: parseInt(oldDebt) || 0,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({ success: true, subscriber });
  } catch (error) {
    console.error('Create subscriber error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إضافة المشترك' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  // Employee permission check
  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['edit_subscriber'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية تعديل المشتركين' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, phone, address, amps, ampPrice, oldDebt, boardId, status } = body;

    if (!id || !name || !phone || !address || amps === undefined || ampPrice === undefined || !boardId) {
      return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب إدخالها' }, { status: 400 });
    }

    // Verify ownership and employee board restriction
    const existing = await prisma.subscriber.findFirst({
      where: { id, generatorId: user.generatorId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'المشترك غير موجود أو لا تملك صلاحية تعديله' }, { status: 404 });
    }

    if (user.role === 'EMPLOYEE') {
      if (user.boardId && user.boardId !== 'all' && (user.boardId !== boardId || user.boardId !== existing.boardId)) {
        return NextResponse.json({ error: 'لا تملك صلاحية تعديل مشتركين في هذا البورد' }, { status: 403 });
      }
    }

    const subscriber = await prisma.subscriber.update({
      where: { id },
      data: {
        boardId,
        name,
        phone,
        address,
        amps: parseInt(amps) || 0,
        ampPrice: parseInt(ampPrice) || 0,
        oldDebt: parseInt(oldDebt) || 0,
        status: status || 'ACTIVE'
      }
    });

    return NextResponse.json({ success: true, subscriber });
  } catch (error) {
    console.error('Update subscriber error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل المشترك' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  // Employee permission check
  if (user.role === 'EMPLOYEE' && (!user.permissions || !user.permissions['delete_subscriber'])) {
    return NextResponse.json({ error: 'ليس لديك صلاحية حذف المشتركين' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرّف المشترك مطلوب' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.subscriber.findFirst({
      where: { id, generatorId: user.generatorId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'المشترك غير موجود' }, { status: 404 });
    }

    if (user.role === 'EMPLOYEE' && user.boardId && user.boardId !== 'all' && user.boardId !== existing.boardId) {
      return NextResponse.json({ error: 'لا تملك صلاحية حذف مشتركين في هذا البورد' }, { status: 403 });
    }

    await prisma.subscriber.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف المشترك' }, { status: 500 });
  }
}
