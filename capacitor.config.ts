import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moladaty.app',
  appName: 'أمبيري',
  webDir: 'public',
  server: {
    // نقوم بتعليق رابط السيرفر المباشر لكي يتم تشغيل ملف index.html المحلي أولاً
    // ملف index.html المحلي يقوم بفحص الاتصال بالشبكة وإظهار صفحة خطأ جميلة باللغة العربية في حال انقطاع الاتصال
    // وإذا وجد اتصالاً فإنه يقوم بتحويل المستخدم تلقائياً إلى رابط السيرفر أدناه
    // url: 'http://192.168.0.190:3000',
    cleartext: true,
    allowNavigation: [
      '*'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#1e293b",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#10b981",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
