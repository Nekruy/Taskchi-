import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskchi.app',
  appName: 'Taskchi',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://taskchi-production.up.railway.app',
    cleartext: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
