# ProGuard / R8 Rules for Cream & Crust Android App

# 1. WebView & JavaScript Interfaces
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 2. Capacitor Core, Plugins & Bridge
-keep public class * extends com.getcapacitor.Plugin
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Bridge

# 3. RevenueCat & Google Play Billing
-keep class com.revenuecat.purchases.** { *; }
-keep class com.android.billingclient.api.** { *; }

# 4. Firebase (Analytics, Crashlytics, Authentication, Push Notifications)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.ktx.**

# 5. CapGo Updater
-keep class ee.forrest.capacitorupdater.** { *; }
-keep class com.capgo.** { *; }

# 6. Optional third-party providers referenced by Firebase Auth plugins
-dontwarn com.facebook.**

# 7. Preserve Line Numbers & Source File attributes for Firebase Crashlytics stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile


