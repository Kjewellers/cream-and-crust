import React from 'react';
import LegalLayout, { H2, P, UL } from './LegalLayout';

const UPDATED = 'June 2026';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" subtitle="Your data, explained" updated={UPDATED}>
      <P>
        Cream &amp; Crust ("the app", "we", "us") is a business-management tool for home bakers and
        small bakeries. It helps you manage orders, customers, recipes, inventory, invoices and a
        shareable public menu. This policy explains what information the app collects, how it is
        used, and the choices you have. We keep data collection to what the app genuinely needs to
        work.
      </P>

      <H2>Who this applies to</H2>
      <P>
        This policy covers two kinds of people: <strong>bakery owners</strong> who sign in to run
        their business, and <strong>their customers</strong> whose order details a bakery enters or
        who place an order through a bakery's public menu link.
      </P>

      <H2>Information we collect</H2>
      <P>
        <strong>Account information</strong> — when you sign up we store your name, email address,
        phone number (if provided), and (if you sign in with Google or Apple) the basic profile your
        provider shares. Passwords for email accounts are handled by Google Firebase Authentication
        and are never stored by us in readable form.
      </P>
      <P>
        <strong>Business profile</strong> — bakery name, logo, tagline, phone, WhatsApp, Instagram,
        website, city, pickup address, delivery areas, UPI ID and GST number that you choose to
        enter. These appear on your invoices and your public menu.
      </P>
      <P>
        <strong>Customer &amp; order data</strong> — names, phone numbers, delivery addresses and
        order notes that you enter for your customers. Sensitive customer fields (name, phone,
        address, notes) are <strong>encrypted</strong> before being stored.
      </P>
      <P>
        <strong>Photos</strong> — images you upload for products, recipes, your logo or payment QR.
        These are stored via Cloudinary or as compressed images in your database.
      </P>
      <P>
        <strong>Device &amp; notification tokens</strong> — if you enable push notifications, we
        store a messaging token so we can send order alerts to your device.
      </P>
      <P>
        <strong>Subscription &amp; purchase data</strong> — if you subscribe to Cream &amp; Crust Pro,
        we receive your subscription status, plan type, purchase date, and expiry date from our
        billing partners (Google Play and RevenueCat). We <strong>never</strong> receive or store
        your credit card number, bank account, UPI PIN, or any payment credentials — those are
        handled entirely by Google Play.
      </P>
      <P>
        <strong>Usage &amp; diagnostics</strong> — we collect anonymous performance metrics
        (page load times, error rates) through Firebase Performance Monitoring and crash reports
        through Firebase Crashlytics. These contain no personal data and are used solely to fix
        bugs and improve app speed.
      </P>
      <P>
        <strong>Optional feedback</strong> — if you delete your account, we store the reason you
        provide (and your account ID) so we can improve the product.
      </P>

      <H2>Device Access &amp; Permissions</H2>
      <P>
        To provide a full native experience, the app requests the following device permissions:
      </P>
      <UL
        items={[
          'Camera: Used only when you choose to capture photos for your recipes, products, profile avatar, or order references.',
          'Photos & Media: Used when you upload existing gallery images for your menu, recipes, or invoices.',
          'File Storage: Used to save exported PDF invoices, shopping lists, and reports to your device, and to share them via other apps.',
          'Notifications: Used to deliver real-time push alerts about new orders, status changes, and inventory updates.',
        ]}
      />
      <P>
        We only access these features when you explicitly grant permission. You can revoke these permissions at any time through your device's app settings. We do not access your camera, storage, or media in the background without your knowledge.
      </P>

      <H2>How we use your information</H2>
      <UL
        items={[
          'To provide core features: orders, customers, recipes, inventory, invoices and your public menu.',
          'To generate PDF invoices that carry your business details and logo.',
          'To send push notifications you have opted into (e.g. order status alerts).',
          'To process and manage subscription payments through Google Play Billing.',
          'To verify your subscription status and grant access to premium features.',
          'To monitor app performance, detect crashes, and fix bugs.',
          'To keep the app secure and improve features.',
        ]}
      />
      <P>
        We do <strong>not</strong> sell your data, and we do not use your customers' contact details
        for our own marketing. We do <strong>not</strong> serve advertisements.
      </P>

      <H2>AI Features &amp; Data Processing</H2>
      <P>
        Cream &amp; Crust includes an AI assistant called <strong>Cream AI</strong> that helps you
        manage orders, analyse inventory, generate recipes, and provide business insights. To
        produce these responses, Cream AI sends a portion of your bakery data to a large language
        model (LLM).
      </P>
      <P>
        <strong>What data is sent</strong> — When you use Cream AI, a snapshot of your relevant
        app data is included in the request. This may include:
      </P>
      <UL
        items={[
          'Recent orders (customer name, product, delivery date, total, payment status).',
          'Inventory items (item name, stock level, minimum stock, expiry date).',
          'Products (name, category, price).',
          'Customers (name, phone number).',
          'Expenses (title, amount, category).',
          'Memories you have explicitly asked Cream AI to remember.',
          'The current message and recent conversation history (up to 6 turns).',
        ]}
      />
      <P>
        <strong>How it is processed</strong> — Requests are routed through{' '}
        <strong>OpenRouter</strong>, a model API gateway, to a language model (currently{' '}
        <em>openai/gpt-oss-120b</em> or equivalent free-tier model). OpenRouter and the underlying
        model provider do <strong>not</strong> store your data for training or any purpose beyond
        generating the immediate response. Data is transmitted over encrypted HTTPS.
      </P>
      <P>
        <strong>What is not sent</strong> — Your account password, Firebase auth tokens, UPI PIN,
        payment credentials, and full raw database records are never included in AI requests. Only
        the summarised fields listed above are sent.
      </P>
      <P>
        <strong>Rate limits</strong> — AI usage is limited to {500} requests per user per day to
        prevent abuse. This limit is enforced on our server and does not involve any additional
        personal data collection.
      </P>
      <P>
        <strong>Opting out</strong> — AI features are optional. You can use all core bakery
        management features (orders, inventory, recipes, customers) without ever using Cream AI.
        Simply do not open the AI chat or AI hub to avoid any data being sent to the LLM.
      </P>

      <H2>Services we rely on</H2>
      <P>The app uses trusted third-party providers to function:</P>
      <UL
        items={[
          'Google Firebase — authentication, database (Firestore), cloud storage, push messaging, performance monitoring and crash reporting (Crashlytics).',
          'Cloudinary — image hosting for product, recipe and logo photos.',
          'Google Play Billing — subscription purchases and renewal management on Android.',
          'RevenueCat — subscription analytics, receipt validation, and entitlement management. RevenueCat receives your anonymous user ID, subscription status and purchase history. It does not receive your name, email or personal data.',
          'OpenRouter — AI model API gateway used to route Cream AI requests to a large language model. Requests include a summarised snapshot of your bakery data as described in the AI Features section above. OpenRouter does not retain your data after generating a response.',
          'Vercel — hosting and delivery of the web version of the app.',
        ]}
      />
      <P>
        Each provider processes data under its own privacy terms. We share only what each service
        needs to perform its function. You can review their policies:
      </P>
      <UL
        items={[
          'Google: https://policies.google.com/privacy',
          'RevenueCat: https://www.revenuecat.com/privacy',
          'Cloudinary: https://cloudinary.com/privacy',
          'OpenRouter: https://openrouter.ai/privacy',
          'Vercel: https://vercel.com/legal/privacy-policy',
        ]}
      />

      <H2>Payments &amp; subscriptions</H2>
      <P>
        App subscriptions (Cream &amp; Crust Pro) are purchased and managed through{' '}
        <strong>Google Play Billing</strong>. Your payment method and billing details are handled
        entirely by Google — we never see or store your card, bank or UPI information.
      </P>
      <UL
        items={[
          'Subscriptions auto-renew at the end of each billing period unless cancelled at least 24 hours before renewal.',
          'You can manage or cancel your subscription any time from Google Play → Subscriptions.',
          'Free trial: if offered, the unused portion of the trial is forfeited when you purchase a subscription.',
          'Refunds follow Google Play\'s refund policy and applicable local law.',
        ]}
      />
      <P>
        Separately, your own <strong>UPI ID or payment QR</strong> (if you add one) is stored only
        so it can be shown on your own invoices, letting your customers pay you directly. Those
        customer payments happen outside the app, between you and your customer.
      </P>

      <H2>Data sharing</H2>
      <P>
        We share your data only in the following limited cases:
      </P>
      <UL
        items={[
          'With service providers listed above, solely to operate the app.',
          'When required by law, regulation, legal process, or government request.',
          'To protect the rights, property or safety of Cream & Crust, our users, or the public.',
          'In a business transfer (merger, acquisition), with notice to you.',
        ]}
      />
      <P>
        We do <strong>not</strong> share or sell personal data for advertising, profiling, or
        marketing by third parties.
      </P>

      <H2>How long we keep data</H2>
      <P>
        We keep your data while your account is active. When you delete your account from Settings,
        we re-verify your identity and then remove your profile and business records and revoke your
        sign-in. Subscription records may be retained by Google Play and RevenueCat per their
        retention policies. Some records may take additional time to be fully purged from encrypted
        backups.
      </P>

      <H2>Your choices &amp; rights</H2>
      <UL
        items={[
          'Access & edit — view and update your details any time from Profile.',
          'Notifications — turn email, push and WhatsApp alerts on or off in Settings.',
          'Delete account — permanently delete your account and data from Settings → Danger zone.',
          'Clear local data — clear the app cache from Settings → Device & data.',
          'Withdraw consent — stop using the app and delete your account at any time.',
          'Data portability — contact us to request an export of your data.',
        ]}
      />
      <P>
        If you are in India, your rights under the Digital Personal Data Protection Act, 2023 (DPDP Act)
        are respected. You may contact us to exercise your rights as a Data Principal.
      </P>

      <H2>Children</H2>
      <P>
        The app is intended for business owners and is not directed at children under 18. We do not
        knowingly collect personal information from children.
      </P>

      <H2>Security</H2>
      <P>
        We use industry-standard measures including encrypted transport (HTTPS/TLS), Firebase
        security rules, field-level AES encryption of sensitive customer data, and secure
        server-side receipt validation. No method of transmission or storage is 100% secure, but we
        work to protect your information.
      </P>

      <H2>International data transfers</H2>
      <P>
        Your data is stored on Google Cloud servers which may be located outside India. By using the
        app, you consent to this transfer. Google Cloud maintains appropriate safeguards for
        international data transfers.
      </P>

      <H2>Changes to this policy</H2>
      <P>
        We may update this policy as the app evolves. Material changes will be reflected by the
        "Last updated" date above. Continued use of the app after changes constitutes acceptance.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about this policy or your data? Reach us at{' '}
        <a href="mailto:support@creamandcrust.online" style={{ color: '#B5606A', fontWeight: 600 }}>
          support@creamandcrust.online
        </a>
        .
      </P>
    </LegalLayout>
  );
}
