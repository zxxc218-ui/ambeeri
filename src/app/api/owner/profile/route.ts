import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request) {
  const user = await checkAuth();
  if (!user) {
    return NextResponse.json({ error: 'عفواً غير مصرح بالدخول' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, username, password } = body;

    const updateData: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (username && username.trim() && username.trim() !== user.username) {
      const cleanUsername = username.trim();
      // Check if username is already taken
      const existingUser = await prisma.user.findFirst({
        where: { username: cleanUsername }
      });
      if (existingUser) {
        return NextResponse.json({ error: 'اسم المستخدم هذا مستخدم بالفعل' }, { status: 400 });
      }
      updateData.username = cleanUsername;
    }

    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'لا توجد بيانات جديدة للتعديل' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      select: { id: true, name: true, username: true, role: true }
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل البيانات' }, { status: 500 });
  }
}
