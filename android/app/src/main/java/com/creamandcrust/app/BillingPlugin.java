package com.creamandcrust.app;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.revenuecat.purchases.CustomerInfo;
import com.revenuecat.purchases.Offerings;
import com.revenuecat.purchases.Package;
import com.revenuecat.purchases.PurchaseParams;
import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesConfiguration;
import com.revenuecat.purchases.PurchasesError;
import com.revenuecat.purchases.interfaces.LogInCallback;
import com.revenuecat.purchases.interfaces.PurchaseCallback;
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback;
import com.revenuecat.purchases.interfaces.ReceiveOfferingsCallback;
import com.revenuecat.purchases.interfaces.SyncPurchasesCallback;
import com.revenuecat.purchases.models.StoreTransaction;

import java.util.List;

@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin {
    private static final String TAG = "BillingPlugin";

    @PluginMethod
    public void initialize(PluginCall call) {
        String apiKey = call.getString("apiKey");
        String appUserId = call.getString("appUserId");

        if (apiKey == null || apiKey.isEmpty()) {
            call.reject("Missing apiKey");
            return;
        }

        try {
            PurchasesConfiguration.Builder builder = new PurchasesConfiguration.Builder(getContext(), apiKey);
            if (appUserId != null && !appUserId.isEmpty()) {
                builder.appUserID(appUserId);
            }
            Purchases.configure(builder.build());
            
            Log.i(TAG, "RevenueCat initialized successfully.");
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to initialize RevenueCat", e);
        }
    }

    @PluginMethod
    public void getOfferings(PluginCall call) {
        if (!Purchases.isConfigured()) {
            call.reject("RevenueCat is not configured");
            return;
        }

        Purchases.getSharedInstance().getOfferings(new ReceiveOfferingsCallback() {
            @Override
            public void onReceived(@NonNull Offerings offerings) {
                try {
                    JSObject result = new JSObject();
                    if (offerings.getCurrent() != null) {
                        JSObject currentOffering = new JSObject();
                        JSArray packagesArray = new JSArray();
                        
                        for (Package pkg : offerings.getCurrent().getAvailablePackages()) {
                            JSObject pkgObj = new JSObject();
                            pkgObj.put("identifier", pkg.getIdentifier());
                            pkgObj.put("packageType", pkg.getPackageType().name());
                            
                            JSObject productObj = new JSObject();
                            productObj.put("identifier", pkg.getProduct().getId());
                            productObj.put("priceString", pkg.getProduct().getPrice().getFormatted());
                            productObj.put("title", pkg.getProduct().getTitle());
                            productObj.put("description", pkg.getProduct().getDescription());
                            
                            pkgObj.put("product", productObj);
                            packagesArray.put(pkgObj);
                        }
                        
                        currentOffering.put("availablePackages", packagesArray);
                        result.put("current", currentOffering);
                    }
                    call.resolve(result);
                } catch (Exception e) {
                    call.reject("Failed to parse offerings", e);
                }
            }

            @Override
            public void onError(@NonNull PurchasesError error) {
                call.reject(error.getMessage(), error.getCode().name());
            }
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        if (!Purchases.isConfigured()) {
            call.reject("RevenueCat is not configured", "REVENUECAT_NOT_CONFIGURED");
            return;
        }

        if (getActivity() == null || getActivity().isFinishing()) {
            call.reject("Android Activity is unavailable", "ACTIVITY_NULL");
            return;
        }

        String packageId = call.getString("packageId");
        if (packageId == null || packageId.isEmpty()) {
            call.reject("Missing packageId", "MISSING_PACKAGE_ID");
            return;
        }

        Purchases.getSharedInstance().getOfferings(new ReceiveOfferingsCallback() {
            @Override
            public void onReceived(@NonNull Offerings offerings) {
                Package pkgToBuy = null;

                // 1. Check current offering first
                if (offerings.getCurrent() != null) {
                    for (Package pkg : offerings.getCurrent().getAvailablePackages()) {
                        if (pkg.getIdentifier().equalsIgnoreCase(packageId) ||
                            pkg.getProduct().getId().equalsIgnoreCase(packageId)) {
                            pkgToBuy = pkg;
                            break;
                        }
                    }
                }

                // 2. Fallback: Search all offerings if not found in current
                if (pkgToBuy == null && offerings.getAll() != null) {
                    for (com.revenuecat.purchases.Offering offering : offerings.getAll().values()) {
                        for (Package pkg : offering.getAvailablePackages()) {
                            if (pkg.getIdentifier().equalsIgnoreCase(packageId) ||
                                pkg.getProduct().getId().equalsIgnoreCase(packageId)) {
                                pkgToBuy = pkg;
                                break;
                            }
                        }
                        if (pkgToBuy != null) break;
                    }
                }

                if (pkgToBuy == null) {
                    call.reject("Package not found in RevenueCat offerings: " + packageId, "PACKAGE_NOT_FOUND");
                    return;
                }

                if (getActivity() == null || getActivity().isFinishing()) {
                    call.reject("Android Activity is unavailable for billing sheet", "ACTIVITY_NULL");
                    return;
                }

                PurchaseParams params = new PurchaseParams.Builder(getActivity(), pkgToBuy).build();
                Purchases.getSharedInstance().purchase(params, new PurchaseCallback() {
                    @Override
                    public void onCompleted(@NonNull StoreTransaction storeTransaction, @NonNull CustomerInfo customerInfo) {
                        JSObject result = new JSObject();
                        result.put("customerInfo", serializeCustomerInfo(customerInfo));
                        call.resolve(result);
                    }

                    @Override
                    public void onError(@NonNull PurchasesError error, boolean userCancelled) {
                        JSObject result = new JSObject();
                        result.put("userCancelled", userCancelled);
                        result.put("code", error.getCode().name());
                        result.put("message", error.getMessage());

                        if (userCancelled) {
                            call.resolve(result); // Don't reject on cancel, return it cleanly
                        } else {
                            call.reject(error.getMessage(), error.getCode().name(), result);
                        }
                    }
                });
            }

            @Override
            public void onError(@NonNull PurchasesError error) {
                call.reject(error.getMessage(), error.getCode().name());
            }
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        if (!Purchases.isConfigured()) {
            call.reject("RevenueCat is not configured");
            return;
        }

        Purchases.getSharedInstance().restorePurchases(new ReceiveCustomerInfoCallback() {
            @Override
            public void onReceived(@NonNull CustomerInfo customerInfo) {
                JSObject result = new JSObject();
                result.put("customerInfo", serializeCustomerInfo(customerInfo));
                call.resolve(result);
            }

            @Override
            public void onError(@NonNull PurchasesError error) {
                call.reject(error.getMessage(), error.getCode().name());
            }
        });
    }

    @PluginMethod
    public void getCustomerInfo(PluginCall call) {
        if (!Purchases.isConfigured()) {
            call.reject("RevenueCat is not configured");
            return;
        }

        Purchases.getSharedInstance().getCustomerInfo(new ReceiveCustomerInfoCallback() {
            @Override
            public void onReceived(@NonNull CustomerInfo customerInfo) {
                JSObject result = new JSObject();
                result.put("customerInfo", serializeCustomerInfo(customerInfo));
                call.resolve(result);
            }

            @Override
            public void onError(@NonNull PurchasesError error) {
                call.reject(error.getMessage(), error.getCode().name());
            }
        });
    }
    
    @PluginMethod
    public void isPro(PluginCall call) {
        if (!Purchases.isConfigured()) {
            call.resolve(new JSObject().put("isPro", false));
            return;
        }

        Purchases.getSharedInstance().getCustomerInfo(new ReceiveCustomerInfoCallback() {
            @Override
            public void onReceived(@NonNull CustomerInfo customerInfo) {
                boolean isPro = customerInfo.getEntitlements().getAll().containsKey("pro") &&
                                customerInfo.getEntitlements().getAll().get("pro").isActive();
                JSObject result = new JSObject();
                result.put("isPro", isPro);
                call.resolve(result);
            }

            @Override
            public void onError(@NonNull PurchasesError error) {
                call.reject(error.getMessage(), error.getCode().name());
            }
        });
    }

    @PluginMethod
    public void login(PluginCall call) {
        String appUserId = call.getString("appUserId");
        if (appUserId == null || appUserId.isEmpty()) {
            call.reject("Missing appUserId");
            return;
        }

        if (!Purchases.isConfigured()) {
            call.reject("RevenueCat is not configured");
            return;
        }

        Purchases.getSharedInstance().logIn(appUserId, new LogInCallback() {
            @Override
            public void onReceived(@NonNull CustomerInfo customerInfo, boolean created) {
                JSObject result = new JSObject();
                result.put("customerInfo", serializeCustomerInfo(customerInfo));
                result.put("created", created);
                call.resolve(result);
            }

            @Override
            public void onError(@NonNull PurchasesError error) {
                call.reject(error.getMessage(), error.getCode().name());
            }
        });
    }

    @PluginMethod
    public void logout(PluginCall call) {
        if (!Purchases.isConfigured()) {
            call.reject("RevenueCat is not configured");
            return;
        }

        Purchases.getSharedInstance().logOut(new ReceiveCustomerInfoCallback() {
            @Override
            public void onReceived(@NonNull CustomerInfo customerInfo) {
                JSObject result = new JSObject();
                result.put("customerInfo", serializeCustomerInfo(customerInfo));
                call.resolve(result);
            }

            @Override
            public void onError(@NonNull PurchasesError error) {
                call.reject(error.getMessage(), error.getCode().name());
            }
        });
    }
    
    @PluginMethod
    public void syncPurchases(PluginCall call) {
        if (!Purchases.isConfigured()) {
            call.reject("RevenueCat is not configured");
            return;
        }
        
        Purchases.getSharedInstance().syncPurchases(new SyncPurchasesCallback() {
            @Override
            public void onSuccess(@NonNull CustomerInfo customerInfo) {
                JSObject result = new JSObject();
                result.put("customerInfo", serializeCustomerInfo(customerInfo));
                call.resolve(result);
            }
            
            @Override
            public void onError(@NonNull PurchasesError error) {
                call.reject(error.getMessage(), error.getCode().name());
            }
        });
    }

    private JSObject serializeCustomerInfo(CustomerInfo customerInfo) {
        JSObject obj = new JSObject();
        
        JSObject entitlements = new JSObject();
        JSObject active = new JSObject();
        JSObject all = new JSObject();

        for (String key : customerInfo.getEntitlements().getAll().keySet()) {
            com.revenuecat.purchases.EntitlementInfo ent = customerInfo.getEntitlements().getAll().get(key);
            JSObject entObj = new JSObject();
            entObj.put("identifier", ent.getIdentifier());
            entObj.put("isActive", ent.isActive());
            entObj.put("willRenew", ent.getWillRenew());
            entObj.put("periodType", ent.getPeriodType().name());
            entObj.put("productIdentifier", ent.getProductIdentifier());
            entObj.put("store", ent.getStore().name());
            
            if (ent.getExpirationDate() != null) {
                entObj.put("expirationDateMillis", ent.getExpirationDate().getTime());
            }
            if (ent.getLatestPurchaseDate() != null) {
                entObj.put("latestPurchaseDateMillis", ent.getLatestPurchaseDate().getTime());
            }
            
            all.put(key, entObj);
            
            if (ent.isActive()) {
                active.put(key, entObj);
            }
        }
        
        entitlements.put("active", active);
        entitlements.put("all", all);
        obj.put("entitlements", entitlements);
        obj.put("originalAppUserId", customerInfo.getOriginalAppUserId());
        
        return obj;
    }
}
