import { Capacitor } from "@capacitor/core";
const isNative = () => Capacitor.isNativePlatform();
const isAndroid = () => Capacitor.getPlatform() === "android";
function normalise(raw) {
  if (raw === "granted") return "granted";
  if (raw === "denied") return "denied";
  if (raw === "prompt-with-rationale") return "prompt-with-rationale";
  return "prompt";
}
async function checkCamera() {
  if (!isNative()) return "granted";
  try {
    const { Camera } = await import("@capacitor/camera");
    const status = await Camera.checkPermissions();
    return normalise(status.camera);
  } catch {
    return "denied";
  }
}
async function requestCamera() {
  if (!isNative()) return { status: "granted", isDeniedForever: false };
  try {
    const { Camera } = await import("@capacitor/camera");
    const result = await Camera.requestPermissions({ permissions: ["camera"] });
    const status = normalise(result.camera);
    return {
      status,
      isDeniedForever: status === "denied"
    };
  } catch {
    return { status: "denied", isDeniedForever: true };
  }
}
async function checkNotifications() {
  if (!isNative()) {
    if (typeof Notification === "undefined") return "denied";
    return normalise(Notification.permission);
  }
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const status = await LocalNotifications.checkPermissions();
    return normalise(status.display);
  } catch {
    return "denied";
  }
}
async function requestNotifications() {
  if (!isNative()) {
    if (typeof Notification === "undefined") return { status: "denied", isDeniedForever: true };
    try {
      const result = await Notification.requestPermission();
      return { status: normalise(result), isDeniedForever: result === "denied" };
    } catch {
      return { status: "denied", isDeniedForever: false };
    }
  }
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.requestPermissions();
    const status = normalise(result.display);
    return { status, isDeniedForever: status === "denied" };
  } catch {
    return { status: "denied", isDeniedForever: true };
  }
}
async function checkMicrophone() {
  try {
    if (typeof navigator?.permissions?.query === "function") {
      const result = await navigator.permissions.query({ name: "microphone" });
      return normalise(result.state);
    }
  } catch {
  }
  return "prompt";
}
async function requestMicrophone() {
  if (!isNative()) {
    try {
      if (typeof navigator?.permissions?.query === "function") {
        const result = await navigator.permissions.query({ name: "microphone" });
        return { status: normalise(result.state), isDeniedForever: result.state === "denied" };
      }
    } catch {
    }
    return { status: "prompt", isDeniedForever: false };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    stream.getTracks().forEach((t) => t.stop());
    return { status: "granted", isDeniedForever: false };
  } catch (error) {
    const msg = error?.name ?? "";
    const isDeniedForever = msg === "NotAllowedError";
    return { status: "denied", isDeniedForever };
  }
}
async function checkLocation() {
  if (!isNative()) {
    try {
      if (typeof navigator?.permissions?.query === "function") {
        const result = await navigator.permissions.query({ name: "geolocation" });
        return normalise(result.state);
      }
    } catch {
    }
    return "prompt";
  }
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.checkPermissions();
    return normalise(status.location);
  } catch {
    return "denied";
  }
}
async function requestLocation() {
  if (!isNative()) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve({ status: "granted", isDeniedForever: false }),
        (err) => resolve({
          status: "denied",
          isDeniedForever: err.code === GeolocationPositionError.PERMISSION_DENIED
        }),
        { timeout: 5e3 }
      );
    });
  }
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const result = await Geolocation.requestPermissions();
    const status = normalise(result.location);
    return { status, isDeniedForever: status === "denied" };
  } catch {
    return { status: "denied", isDeniedForever: true };
  }
}
async function openSettings() {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    if (isAndroid()) {
      const appInfo = await App.getInfo().catch(() => ({ id: "com.creamandcrust.app" }));
      await App.openUrl({
        url: `package:${appInfo.id ?? "com.creamandcrust.app"}`
      }).catch(async () => {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({
          url: `package:${appInfo.id ?? "com.creamandcrust.app"}`,
          windowName: "_system"
        });
      });
    }
  } catch (e) {
    console.warn("[AndroidPermissions] openSettings failed:", e);
  }
}
async function checkPermission(type) {
  switch (type) {
    case "camera":
      return checkCamera();
    case "gallery":
      // Android Photo Picker needs ZERO permissions — always return granted
      return "granted";
    case "notifications":
      return checkNotifications();
    case "microphone":
      return checkMicrophone();
    case "location":
      return checkLocation();
    case "file_access":
      return "granted";
    default:
      return "granted";
  }
}
async function requestPermission(type) {
  switch (type) {
    case "camera":
      return requestCamera();
    case "gallery":
      // Android Photo Picker needs ZERO permissions — always return granted
      return { status: "granted", isDeniedForever: false };
    case "notifications":
      return requestNotifications();
    case "microphone":
      return requestMicrophone();
    case "location":
      return requestLocation();
    case "file_access":
      return { status: "granted", isDeniedForever: false };
    default:
      return { status: "granted", isDeniedForever: false };
  }
}
export {
  checkCamera,
  checkLocation,
  checkMicrophone,
  checkNotifications,
  checkPermission,
  openSettings,
  requestCamera,
  requestLocation,
  requestMicrophone,
  requestNotifications,
  requestPermission
};
