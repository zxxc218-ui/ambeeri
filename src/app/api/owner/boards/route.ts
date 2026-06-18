import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function GET() {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const restrictedBoardId = user.boardId && user.boardId !== 'all' ? user.boardId : null;

    const boards = await prisma.board.findMany({
      where: {
        generatorId: user.generatorId,
        id: restrictedBoardId ? restrictedBoardId : undefined,
      },
      include: {
        _count: {
          select: { subscribers: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ boards });
  } catch (error) {
    console.error('Fetch boards error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب البوردات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || user.role !== 'OWNER' || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول – للمالك فقط' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, area, address, defaultAmpPrice, notes } = body;

    if (!name || !area || !address || defaultAmpPrice === undefined) {
      return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب إدخالها' }, { status: 400 });
    }

    const board = await prisma.board.create({
      data: {
        generatorId: user.generatorId,
        name,
        area,
        address,
        defaultAmpPrice: parseInt(defaultAmpPrice) || 0,
        notes,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({ success: true, board });
  } catch (error) {
    console.error('Create board error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إضافة البورد' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await checkAuth();
  if (!user || user.role !== 'OWNER' || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول – للمالك فقط' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, area, address, defaultAmpPrice, notes, status } = body;

    if (!id || !name || !area || !address || defaultAmpPrice === undefined) {
      return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب إدخالها' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.board.findFirst({
      where: { id, generatorId: user.generatorId }
    });
    if (!existing) {
      return NextResponse.json({ error: 'البورد غير موجود أو لا تملك صلاحية تعديله' }, { status: 404 });
    }

    const board = await prisma.board.update({
      where: { id },
      data: {
        name,
        area,
        address,
        defaultAmpPrice: parseInt(defaultAmpPrice) || 0,
        notes,
        status: status || 'ACTIVE'
      }
    });

    return NextResponse.json({ success: true, board });
  } catch (error) {
    console.error('Update board error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل البورد' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await checkAuth();
  if (!user || user.role !== 'OWNER' || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول – للمالك فقط' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرّف البورد مطلوب' }, { status: 400 });
    }

    // Verify ownership and check count
    const existing = await prisma.board.findFirst({
      where: { id, generatorId: user.generatorId },
      include: {
        _count: {
          select: { subscribers: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'البورد غير موجود' }, { status: 404 });
    }

    if (existing._count.subscribers > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف البورد لوجود مشتركين مرتبطين به. قم بنقل المشتركين أو حذفهم أولاً.' }, { status: 400 });
    }

    await prisma.board.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete board error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف البورد' }, { status: 500 });
  }
}
