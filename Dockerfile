# syntax=docker/dockerfile:1

# Multi-stage build for the EnergieBee Next.js app (output: "standalone").
# The final image ships only the traced server + node_modules, plus the
# static assets and public/ folder copied in by hand (we serve them from the
# container, not a CDN).

# ---- Base -------------------------------------------------------------------
FROM node:22-alpine AS base
# libc6-compat: sharp (Next image optimization) needs it on Alpine/musl.
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies (cached unless lockfile changes) --------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder ----------------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production

# Build-time values inlined into the build output. NOTHING is hardcoded here —
# every value is supplied by Dokploy (build args) at `docker build`, so the same
# Dockerfile builds any environment and no real URLs/keys live in the image
# source. An arg left unpassed builds empty, which each consumer handles:
# NEXT_PUBLIC_* → the client feature no-ops or uses its in-code fallback.
#
#   NEXT_PUBLIC_SITE_URL            canonical site origin (links, metadata)
#   NEXT_PUBLIC_AUTH_URL            Better Auth backend URL for client auth
#   NEXT_PUBLIC_API_URL            browser API base (presigned uploads, article images)
#   NEXT_PUBLIC_RECAPTCHA_SITE_KEY  reCAPTCHA v3 public site key
#   NEXT_PUBLIC_GA_MEASUREMENT_ID   GA4 measurement ID (empty disables GA)
#   NEXT_PUBLIC_GOOGLE_ADS_ID       Google Ads conversion ID (empty disables it)
#   NEXT_PUBLIC_GTM_ID              GTM container ID (empty disables GTM)
#   NEXT_PUBLIC_CLARITY_PROJECT_ID  Clarity project ID (empty disables Clarity)
#   NEXT_PUBLIC_APP_STORE_ID        App Store ID, bare digits e.g. 6771356608
#                                   — NOT a URL (empty → "coming soon")
#   NEXT_PUBLIC_APP_STORE_STOREFRONT
#                                   App Store storefront country code for the
#                                   listing URL (empty → "gb"); must be a country
#                                   the app is published in, else non-published
#                                   regions get "not available in your country"
#   NEXT_PUBLIC_PLAY_STORE_PACKAGE_NAME
#                                   Android application ID e.g. com.energiebee.app
#                                   — NOT a URL (empty → "coming soon")
#   NEXT_PUBLIC_HERO_VIDEO_URL      absolute URL of the hero reel on a CDN
#                                   (empty → the copy in public/hero-videos,
#                                   served by this app server). Also widens the
#                                   CSP media-src — see next.config.ts
#   GOOGLE_SITE_VERIFICATION        Search Console token — baked into the
#                                   statically-prerendered home HTML, so it must
#                                   be a build arg (not a runtime env var)
#   API_URL                         backend base used during prerender only; the
#                                   standalone server re-reads it from the RUNTIME
#                                   env (Dokploy) for every SSR request, so build
#                                   and runtime targets can differ
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_GTM_ID
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID
ARG NEXT_PUBLIC_CLARITY_PROJECT_ID
ENV NEXT_PUBLIC_CLARITY_PROJECT_ID=$NEXT_PUBLIC_CLARITY_PROJECT_ID
ARG NEXT_PUBLIC_APP_STORE_ID
ENV NEXT_PUBLIC_APP_STORE_ID=$NEXT_PUBLIC_APP_STORE_ID
ARG NEXT_PUBLIC_APP_STORE_STOREFRONT
ENV NEXT_PUBLIC_APP_STORE_STOREFRONT=$NEXT_PUBLIC_APP_STORE_STOREFRONT
ARG NEXT_PUBLIC_GOOGLE_ADS_ID
ENV NEXT_PUBLIC_GOOGLE_ADS_ID=$NEXT_PUBLIC_GOOGLE_ADS_ID
ARG NEXT_PUBLIC_PLAY_STORE_PACKAGE_NAME
ENV NEXT_PUBLIC_PLAY_STORE_PACKAGE_NAME=$NEXT_PUBLIC_PLAY_STORE_PACKAGE_NAME
ARG NEXT_PUBLIC_HERO_VIDEO_URL
ENV NEXT_PUBLIC_HERO_VIDEO_URL=$NEXT_PUBLIC_HERO_VIDEO_URL
ARG GOOGLE_SITE_VERIFICATION
ENV GOOGLE_SITE_VERIFICATION=$GOOGLE_SITE_VERIFICATION
ARG API_URL
ENV API_URL=$API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runner (minimal runtime image) -----------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Server-side configuration is read live from the runtime environment by the
# standalone server (there is no `env` block in next.config.ts to freeze it, and
# .env is dockerignored). Provide these at runtime via Dokploy — do NOT bake them
# into the image:
#   API_URL                 backend base URL for SSR data fetching
#   ADMIN_EMAIL             admin login
#   ADMIN_PASSWORD          admin login
#   ADMIN_SESSION_SECRET    signs the admin session cookie (rotating logs everyone out)
#   AWS_REGION / AWS_BUCKET S3 storage
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY   S3 credentials (if used)
#   RECAPTCHA_SECRET_KEY    server-side reCAPTCHA verification
#   BING_SITE_VERIFICATION  optional webmaster token (dynamic pages)
#   SANDBOX_ACCESS_PASSWORD shared access code that puts the WHOLE deployment
#                           behind the /preview gate (app/lib/sandbox-gate.ts).
#                           Set it on the sandbox; leave it unset on production,
#                           where it is ignored anyway. Changing it signs
#                           everyone out.
#   SANDBOX_SESSION_SECRET  optional extra salt for the gate cookie; rotate it
#                           alone to sign everyone out without changing the code

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# The standalone output: server.js + the minimal traced node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets and public/ are NOT included in standalone — copy them in so
# server.js can serve /_next/static and /public (no CDN in use).
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Liveness check against robots.txt: a prerendered route that answers 200 no
# matter what. Not the home page — with SANDBOX_ACCESS_PASSWORD set, `/`
# redirects to the /preview gate, and a probe that has to follow a redirect to
# call the container healthy is a probe waiting to be tripped up. robots.txt is
# one of the paths the gate deliberately leaves open (see proxy.ts).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:3000/robots.txt || exit 1

CMD ["node", "server.js"]
