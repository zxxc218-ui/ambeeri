import prisma from '../db';
import { sendWhatsappMessage } from '../whatsapp';

export async function runUnpaidBillsReminderJob() {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const currentDay = new Date().getDate();

  console.log(`[Job] Running checkUnpaidBillsReminderJob at ${new Date().toISOString()}`);

  // Check if 5 days have passed since the start of the month (i.e. currentDay >= 6)
  if (currentDay < 6) {
    console.log(`[Job] Only day ${currentDay} of the month. Less than 5 days have passed. Job skipped.`);
    return { 
      success: true, 
      message: 'لم تمضِ 5 أيام من بداية الشهر بعد. تم تخطي التشغيل تلقائياً.' 
    };
  }

  try {
    // Find all monthly bills that:
    // 1. Are for the current month and year.
    // 2. Are not paid (paymentStatus is UNPAID or PARTIAL or LATE).
    // 3. Have not had a successful reminder sent yet (reminderStatus !== 'SENT').
    const bills = await prisma.monthlyBill.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
        paymentStatus: { in: ['UNPAID', 'PARTIAL', 'LATE'] },
        reminderStatus: { not: 'SENT' }
      },
      include: {
        subscriber: true
      }
    });

    console.log(`[Job] Found ${bills.length} bills qualified for payment reminder.`);

    let sentCount = 0;
    let failedCount = 0;

    for (const bill of bills) {
      let message = '';
      if (bill.paymentStatus === 'UNPAID') {
        message = `عزيزي المشترك، نود تذكيرك بأن فاتورة اشتراك المولدة لشهر ${bill.month} / ${bill.year} لم يتم تسديدها لحد الآن. يرجى التسديد بأقرب وقت، مع الشكر.`;
      } else {
        message = `عزيزي المشترك، نود تذكيرك بأن فاتورة اشتراك المولدة لشهر ${bill.month} / ${bill.year} غير مسددة بالكامل لحد الآن. يرجى إكمال التسديد، مع الشكر.`;
      }

      // Send WhatsApp message
      const result = await sendWhatsappMessage(bill.subscriber.phone, message);

      const status = result.success ? 'SENT' : (result.isMissingCredentials ? 'PENDING' : 'FAILED');

      // Save result to DB
      await prisma.$transaction(async (tx) => {
        await tx.monthlyBill.update({
          where: { id: bill.id },
          data: {
            reminderStatus: status === 'SENT' ? 'SENT' : (status === 'PENDING' ? 'PENDING' : 'FAILED'),
            reminderSentAt: new Date()
          }
        });

        await tx.whatsappNotification.create({
          data: {
            generatorId: bill.generatorId,
            subscriberId: bill.subscriberId,
            billId: bill.id,
            toPhone: bill.subscriber.phone,
            message: message,
            type: 'UNPAID_REMINDER',
            status: status,
            errorMessage: result.success ? null : result.error
          }
        });
      });

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        console.error(`[Job] Failed to send reminder to ${bill.subscriber.name} (${bill.subscriber.phone}):`, result.error);
      }
    }

    console.log(`[Job] Completed checkUnpaidBillsReminderJob. Sent: ${sentCount}, Failed: ${failedCount}`);
    return { success: true, sentCount, failedCount };
  } catch (error: any) {
    console.error('[Job] checkUnpaidBillsReminderJob Error:', error);
    return { success: false, error: error.message };
  }
}
