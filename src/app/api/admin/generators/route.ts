import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

// Helper to check SUPER_ADMIN role
async function checkAdmin(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split('; ')
    .find(row => row.startsWith('auth_token='))
    ?.split('=')[1];
  if (!token) return null;
  const decoded = await verifyJWT(token);
  if (!decoded || decoded.role !== 'SUPER_ADMIN') return null;
  return decoded;
}

export async function GET(request: Request) {
  const admin = await checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const generators = await prisma.generator.findMany({
      include: {
        users: {
          where: { role: 'OWNER' },
          select: { id: true, name: true, username: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ generators });
  } catch (error) {
    console.error('Fetch generators error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب المولدات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      ownerName,
      phone,
      area,
      subscriptionType,
      subscriptionStart,
      subscriptionEnd,
      paymentDueDay,
      username,
      password
    } = body;

    if (!name || !ownerName || !phone || !area || !subscriptionType || !subscriptionStart || !subscriptionEnd || !username || !password) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });
    if (existingUser) {
      return NextResponse.json({ error: 'اسم المستخدم لمالك المولدة موجود مسبقاً' }, { status: 400 });
    }

    // Hash owner password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create Generator and Owner User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const generator = await tx.generator.create({
        data: {
          name,
          ownerName,
          phone,
          area,
          subscriptionType,
          subscriptionStart: new Date(subscriptionStart),
          subscriptionEnd: new Date(subscriptionEnd),
          paymentDueDay: parseInt(paymentDueDay) || 10,
          status: 'ACTIVE'
        }
      });

      const user = await tx.user.create({
        data: {
          name: ownerName,
          username,
          passwordHash,
          role: 'OWNER',
          generatorId: generator.id,
          status: 'ACTIVE'
        }
      });

      return { generator, user };
    });

    return NextResponse.json({ success: true, generator: result.generator });
  } catch (error: any) {
    console.error('Create generator error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء المولدة والمالك' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      name,
      ownerName,
      phone,
      area,
      subscriptionType,
      subscriptionStart,
      subscriptionEnd,
      paymentDueDay,
      status,
      password // Optional password change
    } = body;

    if (!id || !name || !ownerName || !phone || !area || !subscriptionType || !subscriptionStart || !subscriptionEnd) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Update generator details
      await tx.generator.update({
        where: { id },
        data: {
          name,
          ownerName,
          phone,
          area,
          subscriptionType,
          subscriptionStart: new Date(subscriptionStart),
          subscriptionEnd: new Date(subscriptionEnd),
          paymentDueDay: parseInt(paymentDueDay) || 10,
          status: status || 'ACTIVE'
        }
      });

      // Update owner status and name
      const owner = await tx.user.findFirst({
        where: { generatorId: id, role: 'OWNER' }
      });

      if (owner) {
        const updateData: any = {
          name: ownerName,
          status: status || 'ACTIVE'
        };
        if (password && password.trim() !== '') {
          updateData.passwordHash = await bcrypt.hash(password, 10);
        }
        await tx.user.update({
          where: { id: owner.id },
          data: updateData
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update generator error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث المولدة والمالك' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'مُعرّف المولدة مطلوب' }, { status: 400 });
    }

    await prisma.generator.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete generator error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف المولدة' }, { status: 500 });
  }
}
