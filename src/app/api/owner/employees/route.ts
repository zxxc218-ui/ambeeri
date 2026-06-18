import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await checkAuth();
  if (!user || (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const generatorId = searchParams.get('generatorId');

  try {
    let targetGenId = user.generatorId;
    if (user.role === 'SUPER_ADMIN') {
      targetGenId = (generatorId && generatorId !== 'all') ? generatorId : null;
    }

    const whereClause: any = { role: 'EMPLOYEE' };
    if (targetGenId) {
      whereClause.generatorId = targetGenId;
    }

    const employees = await prisma.user.findMany({
      where: whereClause,
      include: {
        board: {
          select: { id: true, name: true }
        },
        permissions: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Fetch employees error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الموظفين' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, username, password, boardId, permissions, generatorId } = body;

    let targetGenId = user.generatorId;
    if (user.role === 'SUPER_ADMIN') {
      targetGenId = generatorId;
    }

    if (!targetGenId) {
      return NextResponse.json({ error: 'معرّف المولدة مطلوب' }, { status: 400 });
    }

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' }, { status: 400 });
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username }
    });
    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم موجود مسبقاً' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const employee = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          generatorId: targetGenId,
          boardId: boardId && boardId !== 'all' ? boardId : null,
          name,
          username,
          passwordHash,
          role: 'EMPLOYEE',
          status: 'ACTIVE'
        }
      });

      if (permissions && typeof permissions === 'object') {
        const permissionData = Object.entries(permissions).map(([key, val]) => ({
          userId: newUser.id,
          permissionKey: key,
          value: !!val
        }));

        if (permissionData.length > 0) {
          await tx.permission.createMany({
            data: permissionData
          });
        }
      }

      return newUser;
    });

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إضافة الموظف' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await checkAuth();
  if (!user || (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') || (!user.generatorId && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, username, password, boardId, permissions, status, generatorId } = body;

    if (!id || !name || !username) {
      return NextResponse.json({ error: 'الاسم واسم المستخدم مطلوبان' }, { status: 400 });
    }

    // Verify ownership
    const whereClause: any = { id, role: 'EMPLOYEE' };
    if (user.role !== 'SUPER_ADMIN') {
      whereClause.generatorId = user.generatorId;
    } else if (generatorId) {
      whereClause.generatorId = generatorId;
    }

    const existing = await prisma.user.findFirst({
      where: whereClause
    });
    if (!existing) {
      return NextResponse.json({ error: 'الموظف غير موجود أو لا تملك صلاحية تعديله' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        name,
        username,
        boardId: boardId && boardId !== 'all' ? boardId : null,
        status: status || 'ACTIVE'
      };

      if (password && password.trim() !== '') {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      await tx.user.update({
        where: { id },
        data: updateData
      });

      // Update permissions: delete all and recreate
      await tx.permission.deleteMany({
        where: { userId: id }
      });

      if (permissions && typeof permissions === 'object') {
        const permissionData = Object.entries(permissions).map(([key, val]) => ({
          userId: id,
          permissionKey: key,
          value: !!val
        }));

        if (permissionData.length > 0) {
          await tx.permission.createMany({
            data: permissionData
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل الموظف' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  return NextResponse.json({ error: 'عفواً، لا يمكن حذف الموظف نهائياً. يرجى إيقاف تفعيل الحساب بدلاً من الحذف.' }, { status: 400 });
}
