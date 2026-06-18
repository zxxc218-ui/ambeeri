import { NextResponse } from 'next/server';
import { runUnpaidBillsReminderJob } from '@/lib/jobs/unpaidReminders';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Secure API key matching env variable
  const cronSecret = process.env.CRON_SECRET || 'fallback-cron-secret-key-2026';
  
  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'مفتاح التحقق غير صحيح أو غير متوفر' }, { status: 401 });
  }

  const result = await runUnpaidBillsReminderJob();
  
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'حدث خطأ أثناء تشغيل مهمة التذكير' }, { status: 500 });
  }

  return NextResponse.json(result);
}
