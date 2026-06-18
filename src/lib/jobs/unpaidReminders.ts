import prisma from '../db';
import { sendWhatsappMessage } from '../whatsapp';

export async function runUnpaidBillsReminderJob(): Promise<{ success: boolean; message: string; error?: string }> {
  console.log(`[Job] Running checkUnpaidBillsReminderJob is disabled.`);
  return { 
    success: true, 
    message: 'تم إيقاف مهمة التذكير التلقائي بالكامل من قبل النظام.' 
  };
}
