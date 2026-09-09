/**
 * RSS 2.0 document builder shared by every feed the site publishes.
 *
 * Kept out of the route handlers so the XML is a pure function of a list of
 * articles plus a `FeedDefinition` — the same split `video-sitemap.ts` uses.
 * The reason there is more than one feed at all is that syndication partners
 * each want their own URL: NewsNow and Apple News poll a feed they were given,
 * and giving them a path of their own means a partner-specific change (extra
 * elements, a narrower article set) can be made without touching the public
 * `/rss.xml` that readers subscribe to.
 *
 * Today all three feeds carry the SAME items — only the channel title and the
 * `atom:self` link differ. That is deliberate: see `FEEDS` for where the
 * partner-specific parts belong when they arrive.
 */

import type { Article } from "./article-types";
import { stripTrackingParams, toAbsoluteUrl } from "./urls";
import {
  IS_PRODUCTION_DEPLOYMENT,
  ORG_CONTACT_EMAIL,
  ORG_LEGAL_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  url,
} from "./site";
import { escapeXml } from "./xml";

/** Best-effort RFC-822 date (required by RSS) from an ISO string. */
export function rfc822(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return (isNaN(d.getTime()) ? new Date() : d).toUTCString();
}

/** One published feed: its path, and how the channel introduces itself. */
export type FeedDefinition = {
  /** Site-relative path this feed is served from. */
  path: string;
  /** `<channel><title>`. */
  title: string;
  /** `<channel><description>`. Defaults to the site description. */
  description?: string;
  /**
   * Emit `content:encoded` carrying the whole article body.
   *
   * Off by default, and deliberately so: `/rss.xml` is a "here is what's new,
   * come and read it" feed, and shipping the full text turns every reader into
   * a place the article can be consumed without visiting the site. Turn it on
   * only for a partner that renders the article itself and has been given
   * permission to — SmartNews (SmartView) is the case this exists for.
   *
   * Requires the caller to pass `bodies` to `buildRssFeed`; without it the
   * element is simply omitted, because an EMPTY `content:encoded` reads to an
   * ingester as "this article has no text" rather than as a missing field.
   */
  fullContent?: boolean;
  /**
   * Emit `media:thumbnail` (MRSS) with the article's cover image.
   *
   * The placeholder cover is never used here — see `thumbnailFor`. A stand-in
   * bee illustration on every image-less article is worse than no thumbnail:
   * the aggregator would show it as if it were the article's own picture.
   */
  thumbnails?: boolean;
  /**
   * Cap on how many items the feed carries, newest first.
   *
   * Only meaningful for a `fullContent` feed, where each item costs a detail
   * read: without a cap the work grows with the archive forever, and an
   * aggregator wants what is recent, not a complete back catalogue. The
   * description-only feeds are cheap and stay uncapped.
   */
  maxItems?: number;
  /**
   * SmartNews SmartFormat channel branding. Presence of this object is what
   * adds the `snf:` namespace to the document.
   *
   * `logoUrl` is shown above the article in SmartView, and the format is
   * specified: a 700×100 PNG. `darkModeLogoUrl` is the optional counterpart for
   * SmartNews' dark theme — the same lockup in white on transparency, since a
   * near-black logo on dark chrome is invisible.
   */
  smartFormat?: {
    /** Site-relative path to the 700×100 PNG. */
    logoUrl: string;
    /** Site-relative path to the white-on-transparent variant. */
    darkModeLogoUrl?: string;
    /** `<ttl>` — how many minutes a poller may cache the feed. */
    ttlMinutes?: number;
  };
  /**
   * NewsBreak feed extensions. Presence of this object is what adds the `nb:`
   * namespace and the `nb-video` / `nb-audio` labels on embed iframes.
   *
   * The namespace is declared even when only `nb:disclosure` would use it,
   * because NewsBreak's specification asks for it at the root of the feed and
   * — like `snf:` on a SmartFormat document — its presence is what identifies
   * the document as theirs.
   */
  newsBreak?: {
    /**
     * Sponsored / affiliate disclosure, shown before the article body.
     *
     * Plain text, and it must name who benefits from the relationship. Unset:
     * nothing on this site is sponsored or carries affiliate links today, and
     * a disclosure on content that has nothing to disclose is noise. Set it
     * here the day that changes — it applies to every item in the feed, so a
     * per-article disclosure would need a field on the post instead.
     */
    disclosure?: string;
  };
};

/**
 * The class NewsBreak wants on an embed iframe so it knows which player to
 * render. Fixed by their specification, not a preference.
 */
export const NEWSBREAK_IFRAME_CLASSES = {
  video: "nb-video",
  audio: "nb-audio",
} as const;

/**
 * Every feed the site serves, keyed by the route that serves it.
 *
 * `path` MUST match the route's own URL: it becomes the `atom:self` link, which
 * is how a reader (and a partner's ingest log) identifies which feed it is
 * holding. Adding a feed here is not enough — it needs a matching route.
 *
 * When a partner needs more than the shared item shape — Apple News wants
 * `content:encoded` with the full article body, for instance — that belongs in
 * an option on this definition rather than in a forked copy of the builder, so
 * the feeds cannot silently drift apart.
 */
export const FEEDS = {
  /** The public feed readers subscribe to, linked from every page's metadata. */
  blog: {
    path: "/rss.xml",
    title: `${SITE_NAME} — Blog`,
  },
  /** Polled by NewsNow; the title is what shows in their directory. */
  newsnow: {
    path: "/newsnow/newsnow.xml",
    title: `${SITE_NAME} — News`,
  },
  /** Polled by Apple News; the title becomes the channel name in the app. */
  applenews: {
    path: "/news/applenews.xml",
    title: `${SITE_NAME} — News`,
  },
  /**
   * Polled by SmartNews. The one feed that carries whole articles: SmartNews
   * renders them itself as SmartView pages rather than linking out, so a
   * description-only item would publish as a stub.
   *
   * The logos are generated from `public/energieBee-logo.svg` at the 700×100
   * the format specifies — regenerate both together if the brand mark changes,
   * or they will disagree between light and dark.
   */
  smartnews: {
    path: "/smartnews/smartnews.xml",
    title: `${SITE_NAME} — News`,
    fullContent: true,
    thumbnails: true,
    // SmartNews asked for the latest 10, after 20 was still too heavy for them.
    // Their crawler polls often and wants what is new, not an archive, and this
    // feed carries whole article bodies — so the item count IS the payload.
    // Measured on the live catalogue: 50 items ≈ 900KB, 20 ≈ 680KB, 10 ≈ 300KB.
    // Note the curve: dropping 50→20 saved 220KB, but 20→10 saved 380KB. The
    // recent articles are the LONGEST, so each one trimmed off the front of the
    // list costs far more than one trimmed off the tail — which is why halving
    // the count more than halves the payload.
    //
    // Lower this again before reaching for anything cleverer if they ask a third
    // time — it is the only lever that reduces what each poll transfers.
    maxItems: 10,
    smartFormat: {
      logoUrl: "/smartnews-logo.png",
      darkModeLogoUrl: "/smartnews-logo-dark.png",
      // Matches the route's own cache window, so a poller that honours `ttl`
      // and the CDN in front of it agree about how stale the feed may be.
      ttlMinutes: 5,
    },
  },
  /**
   * Polled by NewsBreak. Like SmartNews it renders the article itself, so it
   * takes whole bodies — their specification is explicit that snippets and
   * summary-only feeds are not accepted.
   *
   * Close enough to SmartNews that both routes share one pipeline
   * (`renderSyndicationFeed`); what differs is the `nb:` namespace and the
   * labels on embed iframes.
   */
  newsbreak: {
    path: "/newsbreak/newsbreak.xml",
    title: `${SITE_NAME} — News`,
    fullContent: true,
    thumbnails: true,
    maxItems: 50,
    newsBreak: {},
  },
} as const satisfies Record<string, FeedDefinition>;

/**
 * Wrap article HTML in a CDATA section for `content:encoded`.
 *
 * The body is real markup — it must reach the ingester as markup, not as
 * escaped text, so CDATA rather than `escapeXml`. The one sequence CDATA cannot
 * contain is its own terminator, so any `]]>` in the content is split across
 * two sections: `]]` closes the first, `]]>` re-opens into the second, and a
 * parser concatenates them back into the original three characters. Without
 * this, a single `]]>` anywhere in an article ends the section early and dumps
 * the rest of the body into the document as malformed XML.
 */
function cdata(html: string): string {
  return `<![CDATA[${html.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/**
 * The article's own cover, or null when it hasn't got one.
 *
 * `coverImageReal` and NOT `coverImage`: the latter falls back to the social
 * image and then to a placeholder illustration, which is right for a card in a
 * listing and wrong here. An aggregator presents `media:thumbnail` as the
 * article's picture, so a shared stand-in would appear as though every
 * image-less article were illustrated — and identically illustrated.
 */
function thumbnailFor(a: Article): string | null {
  const cover = a.coverImageReal ?? a.ogImage;
  if (!cover) return null;
  return cover.startsWith("http") ? cover : url(cover);
}

/**
 * The URL an item points at — the article's CANONICAL address.
 *
 * `canonicalUrl` wins when the post declares one, because that is the copy the
 * author has nominated as authoritative and an aggregator should send readers
 * there rather than here. Otherwise the article's own address, which is already
 * canonical and already final: renaming a slug retires the old address behind a
 * 308 (see `resolveRetiredSlug`), and this is always built from the CURRENT
 * slug, so nothing in a feed points at a redirect.
 *
 * Tracking parameters are stripped as a backstop. Nothing in this codebase adds
 * them to an article URL, but `canonicalUrl` is a free-text admin field and a
 * pasted link routinely arrives with a campaign tag still on the end.
 *
 * `<guid>` is derived from this same value, which is what keeps the guid
 * generation logic identical across every feed — a requirement NewsBreak states
 * explicitly, and a property SmartNews relies on to recognise a re-published
 * article rather than treating it as new.
 */
function canonicalLink(a: Article): string {
  const own = url(`/${a.blog}/${a.slug}`);
  if (!a.canonicalUrl) return own;
  return stripTrackingParams(toAbsoluteUrl(a.canonicalUrl, own));
}

/**
 * `snf:analytics` — the tracking that runs on the SmartView page.
 *
 * SmartNews renders the article on their own surface, so nothing on our site
 * ever sees the visit; this script is the only way a SmartView read appears in
 * GA4 at all. SmartNews runs it inside a sandboxed iframe, one per item.
 *
 * Two guards, both deliberate:
 *
 *  - Gated on `IS_PRODUCTION_DEPLOYMENT`, exactly as `Analytics.tsx` is. The
 *    sandbox deployment is built with the PRODUCTION analytics IDs (they arrive
 *    as Dokploy build args), so without this the sandbox's feed would ship real
 *    tracking to a real property.
 *  - Consent defaults are DENIED, mirroring the site's own Consent Mode
 *    posture. Our Consently banner does not exist on SmartNews' surface, so
 *    there is nothing there to grant consent — GA4 therefore runs cookieless
 *    and sends only privacy-preserving pings. That is a deliberate trade: less
 *    granular data in exchange for not setting analytics cookies on a UK
 *    audience with no consent basis, which is the same bargain the site makes.
 *
 * `page_location` is the canonical article URL rather than SmartNews', so the
 * SmartView read lands on the same GA4 page path as a visit to the article
 * itself; `page_referrer` is what separates the two in reporting.
 */
function analyticsXml(a: Article, link: string): string {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!IS_PRODUCTION_DEPLOYMENT || !gaId) return "";

  // JSON.stringify, not string concatenation: a headline containing an
  // apostrophe would otherwise terminate the JS string literal it sits in.
  const script = `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted'});
gtag('js', new Date());
gtag('config', ${JSON.stringify(gaId)}, {
  page_location: ${JSON.stringify(link)},
  page_title: ${JSON.stringify(a.seoTitle ?? a.title)},
  page_referrer: 'https://www.smartnews.com/',
  anonymize_ip: true
});
</script>`;

  return `      <snf:analytics>${cdata(script)}</snf:analytics>`;
}

function itemXml(
  a: Article,
  feed: FeedDefinition,
  bodies?: ReadonlyMap<string, string>,
): string {
  const link = canonicalLink(a);
  const desc = a.seoDescription ?? a.description ?? "";
  const categories = a.tags
    .map((t) => `<category>${escapeXml(t.name)}</category>`)
    .join("");

  const extra: string[] = [];

  if (feed.thumbnails) {
    const thumb = thumbnailFor(a);
    if (thumb) {
      extra.push(`      <media:thumbnail url="${escapeXml(thumb)}" />`);
    }
  }

  // Omitted rather than emitted empty when there is no body to carry — see
  // `fullContent`. `bodies` is keyed by article id, which is stable where a
  // slug is not (renaming a slug retires the old address; the id never moves).
  if (feed.fullContent) {
    const body = bodies?.get(a.id);
    if (body) {
      extra.push(`      <content:encoded>${cdata(body)}</content:encoded>`);
    }
  }

  // SmartNews recommends one per item. Empty string when it is not applicable
  // (non-production, no GA id, or a feed that is not SmartFormat).
  if (feed.smartFormat) {
    const analytics = analyticsXml(a, link);
    if (analytics) extra.push(analytics);
  }

  // Plain text, not markup — NewsBreak renders it as the disclosure line above
  // the article, so it is escaped like any other text node rather than CDATA'd.
  if (feed.newsBreak?.disclosure) {
    extra.push(
      `      <nb:disclosure>${escapeXml(feed.newsBreak.disclosure)}</nb:disclosure>`,
    );
  }

  return `    <item>
      <title>${escapeXml(a.seoTitle ?? a.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${rfc822(a.publishedAt ?? a.authorDate)}</pubDate>
      ${a.author?.name ? `<dc:creator>${escapeXml(a.author.name)}</dc:creator>` : ""}
      ${a.category?.name ? `<category>${escapeXml(a.category.name)}</category>` : ""}
      ${categories}
      <description>${escapeXml(desc)}</description>
${extra.join("\n")}
    </item>`;
}

/**
 * Render an RSS 2.0 document for `feed` over `articles`.
 *
 * `articles` are emitted in the order given — pass them newest-first
 * (`getFeedArticles` already does), which is what every aggregator expects.
 *
 * `bodies` maps article id → full article HTML, and is only read by a feed with
 * `fullContent` set. Passed in rather than resolved here because rendering a
 * body is async and costs a request per article: the caller decides how many
 * articles are worth that, and this stays a pure function of its inputs.
 */
export function buildRssFeed(
  articles: Article[],
  feed: FeedDefinition,
  bodies?: ReadonlyMap<string, string>,
): string {
  const lastBuild = rfc822(articles[0]?.publishedAt ?? null);

  // Declared only when used. An unused namespace is harmless to a parser but
  // misleading to a human validating the feed against a partner's spec, and
  // `snf:` in particular reads as a claim to be a SmartFormat document.
  const namespaces = [
    `xmlns:atom="http://www.w3.org/2005/Atom"`,
    `xmlns:dc="http://purl.org/dc/elements/1.1/"`,
    ...(feed.fullContent
      ? [`xmlns:content="http://purl.org/rss/1.0/modules/content/"`]
      : []),
    ...(feed.thumbnails ? [`xmlns:media="http://search.yahoo.com/mrss/"`] : []),
    ...(feed.smartFormat
      ? [`xmlns:snf="http://www.smartnews.be/snf"`]
      : []),
    ...(feed.newsBreak ? [`xmlns:nb="https://www.newsbreak.com/"`] : []),
  ].join("\n     ");

  const snf = feed.smartFormat;
  const channelExtra = [
    // `pubDate` on the channel is the newest article, where `lastBuildDate` is
    // when the document was generated. They are the same value here only
    // because this feed is rebuilt from published posts and nothing else.
    `    <pubDate>${lastBuild}</pubDate>`,
    ...(snf?.ttlMinutes ? [`    <ttl>${snf.ttlMinutes}</ttl>`] : []),
    ...(snf
      ? [
          `    <snf:logo>\n      <url>${escapeXml(url(snf.logoUrl))}</url>\n    </snf:logo>`,
        ]
      : []),
    ...(snf?.darkModeLogoUrl
      ? [
          `    <snf:darkModeLogo>\n      <url>${escapeXml(url(snf.darkModeLogoUrl))}</url>\n    </snf:darkModeLogo>`,
        ]
      : []),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     ${namespaces}>
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <atom:link href="${escapeXml(url(feed.path))}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(feed.description ?? SITE_DESCRIPTION)}</description>
    <language>en-GB</language>
    <copyright>© ${ORG_LEGAL_NAME}</copyright>
    <managingEditor>${escapeXml(ORG_CONTACT_EMAIL)} (${escapeXml(ORG_LEGAL_NAME)})</managingEditor>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${channelExtra}
${articles.map((a) => itemXml(a, feed, bodies)).join("\n")}
  </channel>
</rss>`;
}

/**
 * Response headers every feed route returns.
 *
 * No caching anywhere (browser, CDN/edge) — every request rebuilds the feed
 * from the latest published posts, which is what the partners' pollers are
 * asking for when they hit the URL.
 */
export const FEED_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
} as const;
