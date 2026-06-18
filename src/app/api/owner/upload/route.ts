import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  const user = await checkAuth();
  if (!user || !user.generatorId) {
    return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'لم يتم اختيار ملف' }, { status: 400 });
    }

    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      return NextResponse.json({ error: 'يجب اختيار ملف صورة فقط' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create uploads folder inside public if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique name
    const originalName = (file as any).name || 'logo.png';
    const ext = originalName.split('.').pop() || 'png';
    const filename = `logo-${user.generatorId}-${Date.now()}.${ext}`;
    const filePath = join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء رفع الملف' }, { status: 500 });
  }
}
