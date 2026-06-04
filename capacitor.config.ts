import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskchi.app',
  appName: 'Taskchi',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://taskchi-production.up.railway.app',
    cleartext: false,
    allowNavigation: ['taskchi-production.up.railway.app', 'taskchi.tj']
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
