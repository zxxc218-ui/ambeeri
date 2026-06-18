const subscriberPhone = '07701234567';
const subscriberName = 'طه عبد';
const payment = {
  id: 'test-id',
  amount: 100000,
  date: new Date(),
  subscriber: { name: 'طه عبد', phone: '07701234567' },
  generator: { name: 'المولدة', phone: '07701234567', ownerName: 'صاحب المولدة' },
  bill: { month: 10, year: 2026, monthAmount: 100000, oldDebt: 0, remainingAmount: 0 }
};
const receiptDate = '10 أكتوبر 2026';
const pdfFileName = 'receipt_test-id.pdf';

const html = `<!DOCTYPE html>
<html>
<head>
<script>
  const subscriberPhone = '${payment.subscriber?.phone || ''}';
  const subscriberName = '${payment.subscriber?.name || ''}';
  const pdfFileName = 'receipt_${payment.receiptNumber || payment.id}.pdf';

  async function sendWhatsApp() {
    let phone = subscriberPhone.replace(/\\D/g, '');
    if (phone.startsWith('0')) {
      phone = '964' + phone.substring(1);
    } else if (!phone.startsWith('964') && phone.length === 10) {
      phone = '964' + phone;
    }
    const msg = encodeURIComponent('مرحباً ' + subscriberName + '، مرفق وصل التسديد الخاص بك من أمبيري. شكراً لتسديدكم ✅');
    const url = phone ? \`https://wa.me/\${phone}?text=\${msg}\` : \`https://wa.me/?text=\${msg}\`;
    console.log(url);
  }
</script>
</head>
<body>
</body>
</html>`;

console.log("Renders without throwing errors!");
console.log("Resulting HTML:\n", html);
