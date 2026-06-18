@echo off
echo ==========================================
echo تحضير مشروع Moladaty لتطبيق Android (APK)
echo ==========================================

echo [1] تثبيت مكتبات Capacitor...
npm install @capacitor/core @capacitor/cli @capacitor/android

echo [2] تهيئة Capacitor...
npx cap init Moladaty com.moladaty.app --web-dir public

echo [3] إضافة منصة Android...
npx cap add android

echo [4] مزامنة الملفات...
npx cap sync android

echo ==========================================
echo تمت العملية! يمكنك الآن فتح المشروع في Android Studio.
echo يمكنك استخدام الأمر التالي لفتحه مباشرة:
echo npx cap open android
pause
