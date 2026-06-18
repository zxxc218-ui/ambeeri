const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Zero-dependency local .env file parser for cron jobs
try {
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length > 1) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !key.startsWith('#')) {
          process.env[key] = value;
        }
      }
    });
    console.log('[Job] Loaded env variables from .env file successfully.');
  }
} catch (e) {
  console.warn('[Job] Warning: Could not read .env file manually. Using process.env.', e);
}

const prisma = new PrismaClient();

function normalizeIraqiPhone(phone) {
  let clean = phone.replace(/\D/g, '');
  
  if (clean.startsWith('00964')) {
    clean = clean.substring(2);
  }
  
  if (clean.startsWith('0')) {
    clean = '964' + clean.substring(1);
  }
  
  if (!clean.startsWith('964') && clean.length === 10) {
    clean = '964' + clean;
  }
  
  return clean;
}

async function sendWhatsappMessage(phone, text) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.warn('⚠️ WhatsApp credentials missing. Message logged:', text);
    return { 
      success: false, 
      error: 'مفاتيح إرسال الواتساب غير مضبوطة في ملف البيئة (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)',
      isMissingCredentials: true
    };
  }

  const rawRecipient = process.env.WHATSAPP_NOTIFY_NUMBER || phone;
  const normalizedPhone = normalizeIraqiPhone(rawRecipient);
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: text
        }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Meta API Error]:', data);
      return { success: false, error: data.error?.message || 'فشل إرسال التنبيه عبر واتساب API' };
    }
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('[HTTP request failed]:', error);
    return { success: false, error: error.message || 'حدث خطأ في الاتصال بخوادم واتساب API' };
  }
}

async function main() {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const currentDay = new Date().getDate();

  console.log(`[Job] Running checkUnpaidBillsReminderJob at ${new Date().toISOString()}`);

  // Check if 5 days have passed since the start of the month (i.e. day >= 6)
  if (currentDay < 6) {
    console.log(`[Job] Only day ${currentDay} of the month. Less than 5 days have passed. Job skipped.`);
    return;
  }

  try {
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

      const result = await sendWhatsappMessage(bill.subscriber.phone, message);

      const status = result.success ? 'SENT' : (result.isMissingCredentials ? 'PENDING' : 'FAILED');

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

    console.log(`[Job] Job finished successfully. Sent: ${sentCount}, Failed: ${failedCount}`);
  } catch (error) {
    console.error('[Job] checkUnpaidBillsReminderJob Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
