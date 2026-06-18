import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { signJWT } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        generator: true,
        permissions: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    if (user.status === 'DISABLED') {
      return NextResponse.json({ error: 'تم إيقاف هذا الحساب. يرجى التواصل مع الإدارة.' }, { status: 403 });
    }

    const passMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passMatch) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    // Check if generator is stopped (except for SUPER_ADMIN)
    if (user.role !== 'SUPER_ADMIN' && user.generator) {
      if (user.generator.status === 'DISABLED') {
        return NextResponse.json({ error: 'تم إيقاف حساب المولدة التابع له. يرجى التواصل مع الإدارة.' }, { status: 403 });
      }
    }

    // Prepare token payload
    const permissionsMap: Record<string, boolean> = {};
    user.permissions.forEach(p => {
      permissionsMap[p.permissionKey] = p.value;
    });

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      generatorId: user.generatorId,
      boardId: user.boardId || 'all',
      genName: user.generator ? user.generator.name : null,
      permissions: permissionsMap
    };

    const token = await signJWT(payload, '7d');

    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return NextResponse.json({ success: true, token, user: { name: user.name, username: user.username, role: user.role } });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول' }, { status: 500 });
  }
}
