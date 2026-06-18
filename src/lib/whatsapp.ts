export function normalizeIraqiPhone(phone: string): string {
  // Remove non-digit characters
  let clean = phone.replace(/\D/g, '');
  
  // If starts with 00964, replace with 964
  if (clean.startsWith('00964')) {
    clean = clean.substring(2);
  }
  
  // If starts with 0, replace with 964
  if (clean.startsWith('0')) {
    clean = '964' + clean.substring(1);
  }
  
  // If it doesn't start with 964 and has 10 digits (e.g. 7701234567), prepend 964
  if (!clean.startsWith('964') && clean.length === 10) {
    clean = '964' + clean;
  }
  
  return clean;
}

export async function sendWhatsappMessage(phone: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.warn('⚠️ WhatsApp credentials missing. Message logged to console:', text);
    return { 
      success: false, 
      error: 'مفاتيح واتساب غير مضبوطة، تم حفظ التسديد بدون إرسال الإشعار.',
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
      console.error('WhatsApp Business Cloud API Error:', data);
      return { success: false, error: data.error?.message || 'فشل الإرسال عبر واتساب API' };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: any) {
    console.error('WhatsApp Message HTTP Error:', error);
    return { success: false, error: error.message || 'حدث خطأ في الاتصال بخوادم واتساب API' };
  }
}
