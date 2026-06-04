importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js");

// We need to pass the same firebase config here
// Since we don't have process.env in SW, we usually hardcode it or inject it during build.
// For the sake of simplicity in a local dev environment, we initialize with minimal config if needed,
// but the messaging compat library often can pick it up from query params or we must hardcode.
// A common approach is using url params during SW registration, but here we'll use a placeholder
// that the developer must fill, or we can read from Vite env if we use a SW bundler.
// For now, we will leave the initialization open. In a real app, you MUST inject the config.

const firebaseConfig = {
  // It's safe to put public config here
  apiKey: "API_KEY_PLACEHOLDER",
  authDomain: "AUTH_DOMAIN_PLACEHOLDER",
  projectId: "PROJECT_ID_PLACEHOLDER",
  storageBucket: "STORAGE_BUCKET_PLACEHOLDER",
  messagingSenderId: "SENDER_ID_PLACEHOLDER",
  appId: "APP_ID_PLACEHOLDER"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message ", payload);
    const notificationTitle = payload.notification.title || "New Notification";
    const notificationOptions = {
      body: payload.notification.body,
      icon: "/logo.png", // Path to your app icon
      badge: "/logo.png"
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log('Failed to initialize Firebase Messaging SW', e);
}
