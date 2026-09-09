import Script from "next/script";
import { IS_PRODUCTION_DEPLOYMENT } from "@/app/lib/site";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

/**
 * The site's Google tag — gtag.js loaded ONCE, serving two destinations:
 * Google Analytics 4 (G-…) and Google Ads (AW-…).
 *
 * ONE LOADER, MANY DESTINATIONS. Google's setup instructions say "don't add
 * more than one Google tag to each page", yet the snippet it hands you for a
 * new Ads account carries its own `gtag/js` <script>. Pasting that anywhere on
 * this site is the mistake to avoid — the library is already here, and a new
 * destination costs exactly one `gtag('config', …)` line below.
 *
 * Renders nothing unless this is the production DEPLOYMENT and at least one ID
 * is set, so dev/staging stay tracking-free and this is a safe no-op until the
 * env vars are configured. The loader takes whichever ID exists, and each
 * `config` is guarded on its own so either destination can run without the
 * other. Both guards are `||`/ternaries rather than `??`: an unpassed build arg
 * reaches us as "" (see Dockerfile), not undefined, and an unguarded
 * `gtag('config', '')` registers an empty destination.
 *
 * Consent Mode: we set ALL consent to `denied` by default (beforeInteractive,
 * so it runs before the tag library loads). Until the visitor accepts via the
 * Consently banner, GA runs in cookieless "consent mode" — no analytics
 * cookies, only privacy-preserving pings. Consently (a Google-certified CMP)
 * updates consent with `gtag('consent', 'update', …)` once the user accepts, at
 * which point full measurement begins. This keeps us GDPR/PECR-compliant
 * without extra wiring. The Ads destination is gated by the same defaults
 * (`ad_storage`, `ad_user_data`, `ad_personalization`), so Ads conversions stay
 * modelled — no `_gcl_aw` cookie — until consent is granted.
 *
 * NOTE: do NOT also add a Google Ads conversion tag inside the GTM container
 * (GoogleTagManager.tsx) — it would double-count every conversion, the same
 * trap that keeps GA4 out of that container.
 *
 * EVENTS: `trackEvent` (app/lib/analytics.ts) calls `gtag('event', …)` with no
 * `send_to`, which delivers to EVERY configured destination — so `generate_lead`
 * and `sign_up` now reach Ads as well as GA4. Harmless while no Ads conversion
 * action matches those names; set `send_to` explicitly once one does, or Ads
 * will start counting conversions nobody wired up.
 */
export default function Analytics() {
  if (!IS_PRODUCTION_DEPLOYMENT || (!GA_ID && !ADS_ID)) return null;
  const loaderId = GA_ID || ADS_ID;

  return (
    <>
      {/* Consent defaults — must execute before the tag library loads. */}
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            functionality_storage: 'denied',
            personalization_storage: 'denied',
            security_storage: 'granted',
            wait_for_update: 500
          });
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          ${GA_ID ? `gtag('config', '${GA_ID}', { anonymize_ip: true });` : ""}
          ${ADS_ID ? `gtag('config', '${ADS_ID}');` : ""}
        `}
      </Script>
    </>
  );
}
