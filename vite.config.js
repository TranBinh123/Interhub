import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Tải các biến môi trường (bao gồm cả các biến Secret từ Vercel)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      // Ép Vite thay thế các chuỗi này bằng giá trị biến Secret khi build
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.FIREBASE_APP_ID),
    },
  };
});
