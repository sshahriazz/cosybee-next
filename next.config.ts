import type { NextConfig } from "next";

// Serve the site on ONE hostname only. Both www and non-www resolving splits
// ranking signals (duplicate content), so we 301 www → non-www to match the
// canonical URLs (SITE_URL = https://energiebee.com in app/lib/site.ts).
// To make www the canonical host instead, swap these two values.
const CANONICAL_HOST = "energiebee.com";
const REDIRECT_FROM_HOST = `www.${CANONICAL_HOST}`;

// Only the canonical production host may be indexed. Every other deployment
// (sandbox, previews) gets a site-wide `X-Robots-Tag: noindex` header below.
// Derived from the per-environment NEXT_PUBLIC_SITE_URL build arg — mirrors
// IS_PRODUCTION in app/lib/site.ts (kept inline here so the config has no app
// imports). headers() is evaluated at build, and this var is a build arg, so
// each environment bakes in the right policy.
const IS_PRODUCTION_HOST =
  (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${CANONICAL_HOST}`).replace(
    /\/$/,
    "",
  ) === `https://${CANONICAL_HOST}`;

// Content-Security-Policy, REPORT-ONLY for now. Report-only never blocks a
// request — the browser only logs violations to the console — so shipping this
// can't break the site. Watch the violation reports for a release or two, fix
// any legitimate sources it flags, then promote it to the enforcing
// `Content-Security-Policy` header. `'unsafe-inline'` is required for script
// because we ship a handful of inline scripts (scroll restoration, JSON-LD,
// next-themes, gtag bootstrap) and don't yet use per-request nonces — tighten
// to a nonce strategy when promoting to enforcing.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://app.consently.net https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.clarity.ms",
  "img-src 'self' data: blob: https://eb-api.technext.it https://energiebee.s3.eu-west-2.amazonaws.com https://lh3.googleusercontent.com https://www.google.com https://www.googletagmanager.com https://*.google-analytics.com https://c.bing.com",
  // Clarity uploads replay data to a regional *.clarity.ms host and syncs its
  // MUID cookie against c.bing.com.
  "connect-src 'self' https://app.consently.net https://www.google.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://eb-api.technext.it https://*.clarity.ms https://c.bing.com",
  "frame-src https://www.google.com https://app.consently.net",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // Dev-only: allow phones/tablets on the local network to load dev resources
  // (HMR, chunks) when browsing via the machine's LAN IP — otherwise Next
  // blocks them cross-origin and client JS (hydration, device detection)
  // never runs on those devices. No effect on production builds.
  allowedDevOrigins: ["10.10.10.83", "10.10.10.*", "*.local"],

  // Generate unique build ID for each deployment to help with Server Action cache invalidation
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },

  // Keep these out of the bundler so they load as normal Node modules:
  // BlockNote's server renderer pulls in React client APIs (createContext)
  // that can't be evaluated under the RSC "react-server" condition, and
  // better-sqlite3 is a native addon.
  serverExternalPackages: [
    "@blocknote/server-util",
    "@blocknote/core",
    "@blocknote/react",
    "@prisma/adapter-libsql",
    "@libsql/client",
    "sharp",
  ],
  // Strip console.* (except errors) from production builds — small bytes
  // saved, plus removes leaked dev logs.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  // Image pipeline — modern formats only, tighter size ladder than the
  // default (which goes up to 3840px and is overkill for our largest crop).
  images: {
    // Optimization is ON: local /public images (heroes, device shots — the LCP
    // images) are resized and served as AVIF/WebP. Remote API images (eb-api)
    // are rendered with the per-<Image unoptimized> prop where they appear,
    // since that host can resolve to a private IP that Next blocks from
    // server-side fetching.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    // Allowed `quality` values. 85 = the sweet spot for photos (sharp, but
    // far smaller than 100); 75 is Next's default, used by any <Image> without
    // an explicit quality prop. Next converts to AVIF/WebP and resizes per the
    // size ladders above.
    qualities: [75, 85, 90],
    // Allow external images from the backend API, S3, and Google account
    // photos. Every pattern is as narrow as the source allows — an
    // over-broad entry would let anyone route arbitrary images through our
    // optimizer.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eb-api.technext.it",
        pathname: "/api/media/**",
      },
      {
        protocol: "https",
        hostname: "energiebee.s3.eu-west-2.amazonaws.com",
        pathname: "/**",
      },
      {
        // Profile photos for users who signed in with Google (better-auth
        // stores the provider URL in `user.image`, which <AppAvatar> renders
        // through next/image). Google hands these out across lh3–lh6, so the
        // subdomain is wildcarded — `*` matches exactly one label. The size is
        // encoded in the path (…=s96-c), never a query string, so `search: ""`
        // stays safe and keeps the pattern tight; a URL that did carry a query
        // would simply fail to load and the avatar falls back to initials.
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
        search: "",
      },
    ],
  },
  // Default ("infer") mode ONLY — do NOT set `compilationMode: "all"`.
  //
  // "all" compiles every function in a file, not just the ones the compiler
  // infers to be components or hooks. Plain event callbacks then get a `_c()`
  // (react-compiler-runtime `c` → `useMemoCache`) prologue injected. That is a
  // hook, so the moment such a callback runs from an event handler instead of
  // from render, the dispatcher is null and React throws "Invalid hook call"
  // (minified error #321). It took out the onboarding address picker: the
  // ComboBox `onSelectionChange` handler threw before it could navigate, so
  // step 1 could never reach step 2.
  reactCompiler: true,
  // NOTE: there is deliberately NO `env: {}` block here.
  //
  // Next's `env` config inlines each key as a build-time literal (like
  // DefinePlugin), which FREEZES the value into the compiled output. That is
  // wrong for this app because we run the `standalone` server and inject
  // configuration at RUNTIME (Dokploy env vars). An `env` block would shadow
  // those runtime values and — worse — bake server secrets into the image.
  //
  // The correct split, with no `env` block:
  //   • Client values  — anything prefixed `NEXT_PUBLIC_` is auto-inlined into
  //     the browser bundle at build time (no `env` block needed). These are the
  //     only vars that truly must be present at `next build`, so they are passed
  //     as Docker build args. See the Dockerfile.
  //   • Server values  — `API_URL`, `ADMIN_*`, `AWS_*`, `RECAPTCHA_SECRET_KEY`,
  //     `BING_SITE_VERIFICATION`, etc. are read live from `process.env` by the
  //     standalone server at runtime, so Dokploy env changes take effect without
  //     a rebuild. Do NOT list them here.

  experimental: {
    // Inline above-the-fold critical CSS to reduce the render-blocking
    // CSS request on first paint. Uses Beasties (formerly Critters) under
    // the hood. Falls back gracefully if the optimiser can't run.
    optimizeCss: true,

    // Cover-image uploads go through a Server Action (multipart POST).
    // The default body limit is 1MB — too small for real photos, which
    // caused 400 / connection-reset errors on save. Allow up to 10MB.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  // No client-side source maps in production — they're large and only useful
  // when debugging deployed errors via a remote SDK.
  productionBrowserSourceMaps: false,
  compress: true,

  async redirects() {
    // Legacy URLs from the previous site that Google still has indexed and
    // sends traffic to. `permanent: true` = 308 (the search-engine equivalent
    // of a 301), so each old page's ranking signal transfers to the closest
    // matching page here and the 404s clear.
    return [
      // Host canonicalisation: 301 every www request to the bare domain so
      // www and non-www don't serve duplicate content. Runs before the legacy
      // path redirects below.
      {
        source: "/:path*",
        has: [{ type: "host", value: REDIRECT_FROM_HOST }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
      {
        // The signed-in dashboard moved from /energyflow-home to /dashboard.
        // Not an SEO concern — it was never in the sitemap and sits behind a
        // session — but users bookmark their dashboard, and a stale bookmark
        // 404ing is a bad way to find that out.
        source: "/energyflow-home",
        destination: "/dashboard",
        permanent: true,
      },
      {
        // The blog RSS feed moved from /feed.xml to /rss.xml. 308 so any
        // reader that already subscribed to the old path follows automatically.
        source: "/feed.xml",
        destination: "/rss.xml",
        permanent: true,
      },
      {
        // The app download page moved from /download to /download-app. It was
        // already indexable and in the sitemap, so redirect rather than 404 —
        // this also covers any QR code printed against the old URL.
        source: "/download",
        destination: "/download-app",
        permanent: true,
      },
      {
        source: "/energy-monitoring-domestic",
        destination: "/energy",
        permanent: true,
      },
      {
        source: "/energy-management-domestic",
        destination: "/energy",
        permanent: true,
      },
      {
        // No commercial offering on the new site — point at the closest page.
        source: "/energy-management-commercial",
        destination: "/energy",
        permanent: true,
      },
      {
        source: "/online-home-hub-domestic",
        destination: "/smart",
        permanent: true,
      },
      {
        // Old WordPress author archive — send to the blog.
        source: "/author/admin",
        destination: "/hive",
        permanent: true,
      },

      // Second batch of legacy 404s (from the Semrush crawl). The
      // monitoring/management/reporting/control pages map to the energy hub;
      // the brand-story page goes to the blog.
      { source: "/control-matters", destination: "/energy", permanent: true },
      { source: "/energy-management", destination: "/energy", permanent: true },
      {
        source: "/energy-monitoring-commercial",
        destination: "/energy",
        permanent: true,
      },
      {
        source: "/energy-monitoring-industrial",
        destination: "/energy",
        permanent: true,
      },
      {
        source: "/monitoring-matters",
        destination: "/energy",
        permanent: true,
      },
      {
        source: "/real-time-reporting-commercial",
        destination: "/energy",
        permanent: true,
      },
      {
        source: "/real-time-reporting-industrial",
        destination: "/energy",
        permanent: true,
      },
      {
        source: "/knocking-down-barriers",
        destination: "/hive",
        permanent: true,
      },

      // Leftover WordPress URLs.
      {
        // The default post every WordPress install ships with.
        source: "/hello-world",
        destination: "/",
        permanent: true,
      },
      // NOTE: WordPress's `/category/[slug]` archives are NOT handled here.
      // They need the data to resolve (an old flat slug carries no blog, so
      // only the category lists say whether it's a Hive or a Learn page), which
      // a static rule can't read — see app/(blog)/category/[slug]/page.tsx.
      // Adding a rule for one here would shadow that route, since redirects run
      // before routing.
    ];
  },

  async headers() {
    return [
      // Non-production hosts: keep the ENTIRE deployment out of search. This
      // X-Robots-Tag is the authoritative de-indexing signal (applies to every
      // route and response type, and is seen even for URLs reached via external
      // links). Paired with the block-all robots.txt (app/robots.ts).
      ...(!IS_PRODUCTION_HOST
        ? [
            {
              source: "/(.*)",
              headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
            },
          ]
        : []),
      {
        // Baseline hardening for every route.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS: force HTTPS for two years, cover subdomains, and opt into the
          // browser preload list. Safe here because the canonical site and its
          // subdomains are HTTPS-only. To back out of `preload` later you must
          // also remove the domain from hstspreload.org, so only ship this once
          // every *.energiebee.com host is confirmed HTTPS.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // CSP in report-only mode — logs violations without blocking. See the
          // CSP_REPORT_ONLY note above before promoting to enforcing.
          {
            key: "Content-Security-Policy-Report-Only",
            value: CSP_REPORT_ONLY,
          },
        ],
      },
      {
        // Keep the admin panel (dashboard, create/edit/list) out of every
        // search index. This HTTP-level directive backs up the `noindex`
        // meta tag in app/admin/layout.tsx and applies to all response types,
        // including redirects and non-HTML responses.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // `:path*` above doesn't match the bare /admin route — cover it too.
        source: "/admin",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // Keep the member account section (profile, security, etc.) out of
        // every search index. Backs up the `noindex` meta tag in
        // app/(private)/account/layout.tsx at the HTTP level, covering
        // redirects and non-HTML responses.
        source: "/account/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // `:path*` above doesn't match the bare /account route — cover it too.
        source: "/account",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // Hero videos are the heaviest things the site serves (~13MB for the
        // landscape reel behind the home and download-app heroes). Next serves
        // everything in `public/` as `public, max-age=0`, because unlike the
        // fingerprinted `_next/static` chunks it cannot know when a file
        // changes — so every visit to either hero paid a revalidation round
        // trip on a 13MB resource, and any cache eviction meant refetching all
        // of it.
        //
        // These are write-once assets: a new cut gets a new filename (see
        // app/lib/hero-videos.ts), so `immutable` is safe and turns a repeat
        // visit into zero bytes. THE FILENAME IS THE CACHE KEY — never
        // overwrite one of these in place with different footage, or clients
        // will keep serving the old cut for up to a year. Ship a new name.
        source: "/hero-videos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // The service worker must never be HTTP-cached, otherwise browsers
        // can keep serving a stale worker and updates won't roll out.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
