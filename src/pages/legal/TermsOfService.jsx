import React from 'react';
import LegalLayout, { H2, P, UL } from './LegalLayout';

const UPDATED = 'June 2026';

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" subtitle="The agreement" updated={UPDATED}>
      <P>
        Welcome to Cream &amp; Crust. By creating an account or using the app, you agree to these
        Terms of Service. Please read them carefully. If you do not agree, please do not use the
        app.
      </P>

      <H2>1. What the app is</H2>
      <P>
        Cream &amp; Crust is a business-management tool for home bakers and small bakeries. It
        provides order tracking, customer records, recipe and inventory management, invoice
        generation, and a shareable public menu. It is a tool to help you run your business — it
        does not bake, deliver, or sell products itself.
      </P>

      <H2>2. Your account</H2>
      <UL
        items={[
          'You must provide accurate information and keep your login secure.',
          'You are responsible for all activity that happens under your account.',
          'You must be old enough to run a business in your jurisdiction to use the bakery features.',
          'One person or business per account unless we agree otherwise.',
        ]}
      />

      <H2>3. Your content &amp; your customers</H2>
      <P>
        You own the data you put into the app — your products, recipes, customer records and order
        details. You are responsible for it. In particular:
      </P>
      <UL
        items={[
          'You confirm you have the right to store your customers\u2019 contact details and to contact them about their orders.',
          'You are responsible for the accuracy of prices, invoices, taxes (including GST) and any legal or food-safety obligations of your bakery.',
          'You must not upload content that is unlawful, infringing, or harmful.',
        ]}
      />
      <P>
        You grant us a limited licence to store and process your content solely to provide the app's
        features to you (for example, rendering an invoice or your public menu).
      </P>

      <H2>4. Subscriptions &amp; payments</H2>
      <P>
        Cream &amp; Crust offers a free tier and a paid <strong>Pro</strong> subscription with
        additional features. Subscriptions are purchased and managed exclusively through{' '}
        <strong>Google Play Billing</strong> on Android.
      </P>
      <UL
        items={[
          'Prices, billing cycle and included features are clearly shown before you subscribe.',
          'A free trial may be offered. If you cancel during the trial, you retain access until the trial ends. The unused portion of any free trial is forfeited if you purchase a subscription before the trial expires.',
          'Subscriptions auto-renew at the end of each billing period at the then-current price unless cancelled at least 24 hours before the renewal date.',
          'You can manage or cancel your subscription at any time from Google Play → Subscriptions. Cancellation takes effect at the end of the current billing period — you keep access until then.',
          'Refunds are handled according to Google Play\u2019s refund policy and applicable local law. To request a refund, contact Google Play support directly.',
          'We may change subscription pricing with at least 30 days\u2019 notice. Price changes apply at your next renewal.',
        ]}
      />
      <P>
        Your payment method is managed entirely by Google Play. Cream &amp; Crust does not see or
        store your credit card, bank account, UPI or any payment credentials. We use RevenueCat to
        track subscription status and entitlements — RevenueCat does not receive your personal
        information.
      </P>

      <H2>5. Invoices &amp; payments you collect</H2>
      <P>
        The app helps you create invoices and display your own UPI ID or QR so your customers can
        pay you directly. Payments between you and your customers are strictly between you and them
        — Cream &amp; Crust is not a party to those transactions and is not responsible for
        collecting, holding, or refunding them.
      </P>

      <H2>6. Acceptable use</H2>
      <P>You agree not to:</P>
      <UL
        items={[
          'Use the app for anything illegal or to harm others.',
          'Attempt to break, reverse-engineer, overload, or gain unauthorised access to the app or its servers.',
          'Resell, redistribute or white-label the app as your own product.',
          'Send spam or unsolicited messages to customers using the app.',
          'Share your account credentials with others or allow third parties to access your account.',
          'Attempt to extract, scrape, or abuse the AI features in ways that exceed normal bakery-management use (e.g. flooding the AI with automated requests or using it to generate content unrelated to your bakery).',
        ]}
      />

      <H2>7. AI Features</H2>
      <P>
        Cream &amp; Crust includes an AI assistant (<strong>Cream AI</strong>) that can help you
        create orders, analyse inventory, generate recipes, and provide business insights. By using
        these features you agree to the following:
      </P>
      <UL
        items={[
          'AI output is generated by a third-party large language model (LLM) and is provided for guidance only. It may be incomplete, inaccurate, or unsuitable for your specific situation.',
          'You remain solely responsible for reviewing, verifying, and acting on any AI-generated content — including orders created, prices suggested, recipes generated, or business advice given.',
          'Do not rely on Cream AI for legally or financially binding decisions without independent verification.',
          'A snapshot of your bakery data (orders, inventory, products, customers, expenses) is sent to OpenRouter and an LLM to generate responses. See our Privacy Policy for full details of what is sent and how it is handled.',
          'AI usage is subject to a rate limit (currently 500 requests per user per day). We may adjust this limit at any time.',
          'AI features are optional. Using Cream AI is your choice and constitutes your consent to the data processing described in our Privacy Policy.',
          'We are not liable for errors, omissions, or business losses arising from actions taken based on AI-generated output.',
        ]}
      />

      <H2>8. Intellectual property</H2>
      <P>
        The Cream &amp; Crust name, logo, interface design, and underlying code are owned by us and
        protected by applicable intellectual property laws. Your use of the app does not grant you
        any ownership of the app itself. You retain ownership of the content you create within the
        app (products, recipes, customer records, etc.).
      </P>

      <H2>9. Availability &amp; updates</H2>
      <P>
        We work to keep the app running reliably, but we provide it "as is" and "as available". We
        may update, change, add or remove features at any time for maintenance, improvement, or
        compliance. We rely on third-party services (such as Firebase, Cloudinary, Google Play,
        RevenueCat, and OpenRouter) whose availability we don't control.
      </P>

      <H2>10. Disclaimer &amp; limitation of liability</H2>
      <P>
        To the fullest extent permitted by law, Cream &amp; Crust is provided without warranties
        of any kind, express or implied. We are not liable for indirect, incidental, special,
        consequential or punitive damages, lost profits, lost revenue, or loss of data arising from
        your use of the app. This includes, without limitation, any loss arising from reliance on
        AI-generated content produced by Cream AI. Our total liability for any claim related to the
        app shall not exceed the amount you paid us in the 12 months preceding the claim. The app
        is a record-keeping and management tool; you remain responsible for your business decisions,
        pricing, taxes and customer commitments.
      </P>

      <H2>11. Indemnification</H2>
      <P>
        You agree to indemnify and hold Cream &amp; Crust harmless from any claims, damages or
        expenses (including legal fees) arising from your use of the app, your content, your
        violation of these terms, or your violation of any third-party rights.
      </P>

      <H2>12. Termination</H2>
      <P>
        You may stop using the app and delete your account at any time from Settings. We may suspend
        or terminate accounts that violate these terms or misuse the service. On deletion, your data
        is removed as described in our Privacy Policy. Termination does not automatically cancel an
        active Google Play subscription — you must cancel it separately in Google Play.
      </P>

      <H2>13. Governing law</H2>
      <P>
        These terms are governed by the laws of India. Any disputes shall be subject to the
        exclusive jurisdiction of the courts in Mumbai, Maharashtra.
      </P>

      <H2>14. Changes to these terms</H2>
      <P>
        We may update these terms as the app grows. Material changes will be communicated via the
        app or email. Continued use after an update means you accept the revised terms. The
        "Last updated" date above reflects the latest version.
      </P>

      <H2>15. Contact</H2>
      <P>
        Questions about these terms? Email{' '}
        <a href="mailto:support@creamandcrust.online" style={{ color: '#B5606A', fontWeight: 600 }}>
          support@creamandcrust.online
        </a>
        .
      </P>
    </LegalLayout>
  );
}
