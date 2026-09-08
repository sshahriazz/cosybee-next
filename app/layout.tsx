import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Manrope } from "next/font/google";
import "./globals.css";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import { HideSiteChrome } from "./components/layout/HideSiteChrome";
import { Providers } from "./providers";
import Analytics from "./components/Analytics";
import GoogleTagManager, {
  GoogleTagManagerNoScript,
} from "./components/GoogleTagManager";
import Clarity from "./components/Clarity";
import { DeferredClientLayer } from "./components/DeferredClientLayer";
import {
  IS_PRODUCTION,
  IS_PRODUCTION_DEPLOYMENT,
  ORG_ADDRESS,
  ORG_CONTACT_EMAIL,
  ORG_LEGAL_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SOCIAL,
  TWITTER_HANDLE,
  url,
  RSS_ALTERNATE_TYPES,
} from "./lib/site";
import { DEFAULT_OG_IMAGE } from "./lib/seo";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Site-wide metadata. Per-page metadata exports inherit and override
 * individual fields. `title.template` automatically suffixes child page
 * titles with the brand name.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: ORG_LEGAL_NAME, url: SITE_URL }],
  creator: ORG_LEGAL_NAME,
  publisher: ORG_LEGAL_NAME,
  category: "technology",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  alternates: {
    canonical: "/",
    // Let feed readers and crawlers discover the blog RSS feed.
    types: RSS_ALTERNATE_TYPES,
  },
  // Search-engine site verification. Tokens are read from server env so they
  // can differ per environment and aren't committed. Undefined values are
  // omitted by Next, so this is a no-op until the tokens are set.
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    // Default card served from /api/og (a route, not the opengraph-image file
    // convention, which would outrank per-page og:image). Shared with per-page
    // metadata via DEFAULT_OG_IMAGE (lib/seo.ts).
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    creator: TWITTER_HANDLE,
    site: TWITTER_HANDLE,
    images: [DEFAULT_OG_IMAGE.url],
  },
  // Only the canonical production host invites indexing. The sandbox and
  // preview deploys emit `noindex, nofollow` instead, matching the site-wide
  // X-Robots-Tag header those builds already send (next.config.ts) — a page
  // that says "index" in its HTML while the response header says "noindex" is
  // a contradiction, and crawlers that read only one of the two would take the
  // wrong half. No per-page metadata sets `index: true`, so gating it here
  // covers every route on the site.
  robots: IS_PRODUCTION
    ? {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      }
    : { index: false, follow: false, nocache: true },
  // icons are auto-injected by Next from app/icon.tsx and app/apple-icon.tsx
  // — no need to repeat them here.
  referrer: "origin-when-cross-origin",
};

/**
 * Theme + responsive viewport. `themeColor` lives here (not in metadata)
 * as of Next.js 16. Two themes: black for the dark navbar / hero, white
 * for the rest of the page.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Organization schema (JSON-LD) for rich results in search. */
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: ORG_LEGAL_NAME,
  alternateName: SITE_NAME,
  url: SITE_URL,
  logo: url("/icon"),
  description: SITE_DESCRIPTION,
  email: ORG_CONTACT_EMAIL,
  address: {
    "@type": "PostalAddress",
    streetAddress: ORG_ADDRESS.street,
    addressLocality: ORG_ADDRESS.city,
    addressRegion: ORG_ADDRESS.region,
    postalCode: ORG_ADDRESS.postalCode,
    addressCountry: ORG_ADDRESS.country,
  },
  sameAs: Object.values(SOCIAL),
};

/** LocalBusiness schema — registered UK business location. Shares the same
 *  NAP (name/address) as the Organization schema and the contact page; keep
 *  all three in sync to reinforce the local-SEO trust signal. */
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#localbusiness`,
  name: ORG_LEGAL_NAME,
  alternateName: SITE_NAME,
  url: SITE_URL,
  image: url("/api/og"),
  logo: url("/icon"),
  description: SITE_DESCRIPTION,
  email: ORG_CONTACT_EMAIL,
  address: {
    "@type": "PostalAddress",
    streetAddress: ORG_ADDRESS.street,
    addressLocality: ORG_ADDRESS.city,
    addressRegion: ORG_ADDRESS.region,
    postalCode: ORG_ADDRESS.postalCode,
    addressCountry: ORG_ADDRESS.country,
  },
  areaServed: { "@type": "Country", name: "United Kingdom" },
  sameAs: Object.values(SOCIAL),
};

/** Website schema with SearchAction — helps Google show a sitelinks
 *  search box for the brand. */
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: url("/search?q={search_term_string}"),
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${manrope.variable} h-full antialiased scroll-smooth`}
    >
      <head>
        {/* Manual scroll restoration. On reload we save the previous
         *  scroll position to sessionStorage and restore it instantly
         *  once the document is tall enough — avoids both the "jumps to
         *  top" issue (browser can't restore past initial document
         *  height) and the smooth-scroll-animates-restoration issue. We
         *  then enable `scroll-smooth` for subsequent anchor clicks. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  if(!('scrollRestoration' in history))return;
  var k='sy:'+location.pathname+location.search;
  history.scrollRestoration='manual';
  var save=function(){try{sessionStorage.setItem(k,String(window.scrollY));}catch(e){}};
  addEventListener('pagehide',save);
  addEventListener('beforeunload',save);
  var raw;try{raw=sessionStorage.getItem(k);}catch(e){}
  var enableSmooth=function(){document.documentElement.classList.add('scroll-smooth');};
  if(raw===null){enableSmooth();return;}
  var y=parseInt(raw,10);
  if(!y||y<0){enableSmooth();return;}
  var tries=0;
  var step=function(){
    var max=document.documentElement.scrollHeight-window.innerHeight;
    if(max>=y){window.scrollTo({top:y,left:0,behavior:'instant'});enableSmooth();return;}
    if(++tries>120){window.scrollTo({top:y,left:0,behavior:'instant'});enableSmooth();return;}
    requestAnimationFrame(step);
  };
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){requestAnimationFrame(step);});
  }else{requestAnimationFrame(step);}
})();
`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {/* GTM <noscript> fallback — Google requires this immediately after the
         *  opening <body> tag. No-op outside production / without a container ID. */}
        <GoogleTagManagerNoScript />
        {/* Skip link — first focusable element, visually hidden until focused,
         *  so keyboard/screen-reader users can jump straight past the navbar. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-1000 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        {/* Consently cookie-consent banner. Loaded `lazyOnload` (during browser
         *  idle, after the page has loaded) because at 66 KiB it's the single
         *  largest script on the page and was the dominant Total Blocking Time
         *  contributor. The banner appears a moment later, which is fine:
         *  tracking stays gated regardless of load order — Google Consent Mode
         *  defaults all signals to `denied` (see Analytics.tsx, with
         *  `wait_for_update: 500`) and GA stays cookieless until Consently
         *  issues `gtag('consent','update',…)`.
         *
         *  Gated on IS_PRODUCTION_DEPLOYMENT, NOT `NODE_ENV`. `next build`
         *  sets NODE_ENV to "production" for EVERY deployment, sandbox
         *  included, so that test loaded the banner (and its 66 KiB) on the
         *  sandbox — and unlike GA/GTM/Clarity there is no empty-ID escape
         *  hatch here, because the banner id is hardcoded. */}
        {IS_PRODUCTION_DEPLOYMENT && (
          <Script
            src="https://app.consently.net/consently.js"
            data-bannerid="6a229f9186e4ca8d56f54ed0"
            strategy="lazyOnload"
          />
        )}
        <Providers>
          <HideSiteChrome>
            <Navbar />
          </HideSiteChrome>
          {/* Skip-link target. A wrapper (not <main>, since each page renders
           *  its own <main>) that keeps the sticky-footer flex layout intact. */}
          <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
            {children}
          </div>
          <HideSiteChrome>
            <Footer />
          </HideSiteChrome>
          <DeferredClientLayer />
        </Providers>
        <Analytics />
        <GoogleTagManager />
        <Clarity />
      </body>
    </html>
  );
}
