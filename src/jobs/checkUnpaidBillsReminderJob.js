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
  console.log(`[Job] checkUnpaidBillsReminderJob is disabled.`);
  return;
}

main();
