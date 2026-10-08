import { registerPlugin } from '@capacitor/core';

// This binds our custom Java `BillingPlugin` to the JS context
export const BillingPlugin = registerPlugin('Billing');
