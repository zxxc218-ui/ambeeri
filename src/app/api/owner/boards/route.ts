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

    const restrictedBoardId = user.boardId && user.boardId !== 'all' ? user.boardId : null;

    const whereClause: any = {};
    if (targetGenId) {
      whereClause.generatorId = targetGenId;
    }
    if (restrictedBoardId) {
      whereClause.id = restrictedBoardId;
    }

    const boards = await prisma.board.findMany({
      where: whereClause,
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
  if (!user || (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول – للمالك أو الأدمن فقط' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, area, address, defaultAmpPrice, notes, generatorId } = body;

    let targetGenId = user.generatorId;
    if (user.role === 'SUPER_ADMIN') {
      targetGenId = generatorId;
    }

    if (!targetGenId) {
      return NextResponse.json({ error: 'معرّف المولدة مطلوب' }, { status: 400 });
    }

    if (!name || !area || !address || defaultAmpPrice === undefined) {
      return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب إدخالها' }, { status: 400 });
    }

    const board = await prisma.board.create({
      data: {
        generatorId: targetGenId,
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
  if (!user || (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول – للمالك أو الأدمن فقط' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, area, address, defaultAmpPrice, notes, status, generatorId } = body;

    if (!id || !name || !area || !address || defaultAmpPrice === undefined) {
      return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب إدخالها' }, { status: 400 });
    }

    // Verify ownership
    const whereClause: any = { id };
    if (user.role !== 'SUPER_ADMIN') {
      whereClause.generatorId = user.generatorId;
    } else if (generatorId) {
      whereClause.generatorId = generatorId;
    }

    const existing = await prisma.board.findFirst({
      where: whereClause
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
  if (!user || (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول – للمالك أو الأدمن فقط' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const generatorId = searchParams.get('generatorId');
    if (!id) {
      return NextResponse.json({ error: 'معرّف البورد مطلوب' }, { status: 400 });
    }

    // Verify ownership
    const whereClause: any = { id };
    if (user.role !== 'SUPER_ADMIN') {
      whereClause.generatorId = user.generatorId;
    } else if (generatorId) {
      whereClause.generatorId = generatorId;
    }

    const existing = await prisma.board.findFirst({
      where: whereClause,
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
