# Syndication feeds

The site publishes five RSS feeds. Three carry a headline and a summary; two
carry **whole articles**, because the partner renders the article itself rather
than linking out.

| Feed | Carries | Rebuilt |
| --- | --- | --- |
| `/rss.xml` | Description only | Every request |
| `/newsnow/newsnow.xml` | Description only | Every request |
| `/news/applenews.xml` | Description only | Every request |
| `/smartnews/smartnews.xml` | **Full bodies** + SmartFormat branding, latest 10 | Every request, from 60s-cached reads |
| `/newsbreak/newsbreak.xml` | **Full bodies** + MRSS, latest 50 | Every request, from 60s-cached reads |

All five share one builder (`buildRssFeed`) and one article list, so they cannot
disagree about what has been published. The two full-content feeds also share
one read-render-build pipeline (`renderSyndicationFeed`).

**Everything partner-specific is an option on the feed's `FeedDefinition`** —
`fullContent`, `thumbnails`, `maxItems`, `smartFormat`, `newsBreak`. Adding a
third aggregator should be a definition plus a four-line route, not a copy of
the builder or the pipeline.

## Where things live

| File | Role |
| --- | --- |
| `app/lib/rss-feed.ts` | `FEEDS`, `FeedDefinition`, and the RSS document builder |
| `app/lib/syndication-feed.ts` | The full-content pipeline: read → render bodies → build |
| `app/lib/article-body.ts` | `renderArticleBody`, `classifyEmbedIframes` |
| `app/lib/urls.ts` | `absolutizeHtml`, `stripTrackingParams`, `toAbsoluteUrl` — pure, no server imports |
| `app/(blog)/smartnews/smartnews.xml/route.ts` | SmartNews route |
| `app/(blog)/newsbreak/newsbreak.xml/route.ts` | NewsBreak route |

## Rules both full-content feeds hold to

**`fullContent` is off by default.** Shipping whole articles turns every reader
into somewhere the piece can be consumed without visiting the site. It's on for
these two because they render the article and were given permission to. Don't
flip it on `/rss.xml` casually.

**The body is the same body the page renders.** Both the feeds and
`ArticleDetail` go through `renderArticleBody`. Before that existed the
resolution logic lived inline in the component, and a copy in a feed would have
been free to drift — serving the stale `contentHtml` fallback while the
canonical URL rendered `contentJson`, republishing a different article than the
one at the link.

**What the feeds do *not* inherit from the page.** The page adds heading ids,
table scroll wrappers, and routes images through Next's optimizer. The feeds
skip all three — `optimizeArticleImages` in particular rewrites `<img>` to
`/_next/image?...`, which is site-relative and meaningless on a partner's
origin. They do run `stripPastedColors` (pasted inline colours would survive
into the partner's reader) and `absolutizeHtml`.

**Articles with no body are dropped, not published empty.** Both partners treat
the body as the article, so an empty one publishes a blank page under our name.
The `X-Feed-Dropped-Count` header reports how many.

**An article with no cover keeps its item but gets no `media:thumbnail`.** The
placeholder cover is deliberately not used: an aggregator presents the thumbnail
as *the article's* picture, so a shared stand-in would make every image-less
article look identically illustrated. One article currently has no cover.

**Tracking parameters are stripped from every URL in the feed** — the item
`<link>`/`<guid>` and every URL inside `content:encoded`. `utm_*` plus the
`gclid` / `fbclid` / `msclkid` click identifiers; see `TRACKING_PARAMS` in
`app/lib/urls.ts`. Deliberately NOT stripped: `ref_src` and `ref_url` (Twitter/X
embeds need them to render) and `igshid` (Instagram's own permalinks) — a tidy
URL is not worth a broken embed.

The case that matters is HTML-encoded separators. A URL written in HTML joins
its parameters with `&amp;`, so parsing the raw text sees one parameter named
`amp;utm_campaign` — which hides everything after the first parameter from the
filter and, worse, corrupts the URL on re-serialising. Instagram's embed
permalinks are the live example. `stripTrackingParamsInHtml` decodes before
parsing and re-encodes only when it actually changed something.

**Links are canonical and absolute.** `canonicalLink` prefers the post's own
`canonicalUrl` when set — that is the copy the author nominated as
authoritative — and otherwise builds the article's address from its CURRENT
slug, so nothing in a feed points at a redirect (renaming a slug retires the old
address behind a 308). A `canonicalUrl` that is root-relative is resolved to
absolute; one that is neither an absolute URL nor a `/` path is a typo and falls
back to the article's own address rather than to a plausible-looking URL on our
domain that leads nowhere. `<guid>` derives from the same value, which is what
keeps guid generation identical across feeds.

**Capped** (`maxItems`) — SmartNews at 10, NewsBreak at 50. Each item costs a
detail read, because the list endpoint strips `contentJson`. The cap is applied
*before* those reads, so the work doesn't grow with the archive.
`DEFAULT_MAX_ITEMS` is the floor under a future feed that forgets to set one —
there is no such thing as an uncapped full-content feed.

**They are the feeds that keep the Data Cache.** The description-only three are
`force-dynamic` + `no-store`, refetching everything per poll — fine when an item
is a title and a description, not when it is a detail read. Here the reads are
cached for 60s, so content can be up to a minute stale; a publish clears that
immediately (`updateTag(CONTENT_TAG)`).

The routes themselves still render per request — the build marks them `ƒ`.
Measured on a production build at 50 items (NewsBreak's cap): **~1.1s cold,
~0.6s steady**, which is the fifty `contentJsonToHtml` renders, not the HTTP
reads. SmartNews at 10 items is a fifth of that work. Cheap enough for feeds
polled every few minutes. The only way to cache further today is
`unstable_cache`, which Next 16 documents as replaced by `use cache` (Cache
Components, not enabled here) — so if this gets expensive, lower `maxItems`
before reaching for a deprecated API.

---

## SmartNews (SmartFormat)

[Specification][snf-spec]. RSS 2.0 plus `snf:`, `media:` and `content:`.
SmartNews renders each article as a **SmartView** page framed with our branding.

[snf-spec]: https://publishers.smartnews.com/hc/en-us/articles/56500436151065-SmartFormat-Specification-Version-2-2

**Channel:** `title`, `link`, `description`, `pubDate`, `language`, `snf:logo`,
plus `snf:darkModeLogo` and `ttl`.
**Items:** `title`, `link`, `guid`, `pubDate`, `dc:creator`, `description`,
`content:encoded`, `media:thumbnail`, `snf:analytics`.

**Capped at the latest 10**, at SmartNews' request — they came back twice, 50 →
20 → 10, because the feed carries whole article bodies and the item count *is*
the payload. Measured on the live catalogue: 50 items ≈ 900KB, 20 ≈ 680KB, 10 ≈
300KB. Note the curve — dropping 50→20 saved 220KB but 20→10 saved 380KB,
because the most recent articles are also the longest, so each item trimmed off
the front costs far more than one off the tail.

If they ask a third time, lower `maxItems` again: it is the only lever that
reduces what each poll transfers.

### snf:analytics

SmartNews renders the article on their own surface, so nothing on this site ever
sees the visit — this per-item script is the only way a SmartView read reaches
GA4. SmartNews runs it in a sandboxed iframe.

Two guards, both deliberate:

- **Gated on `IS_PRODUCTION_DEPLOYMENT`**, exactly as `Analytics.tsx` is. The
  sandbox deployment is built with the *production* analytics IDs (they arrive
  as Dokploy build args), so without this the sandbox's feed would ship real
  tracking to the real property. The element is absent locally and on sandbox —
  that is correct, not a fault.
- **Consent defaults are `denied`**, mirroring the site's own Consent Mode
  posture. The Consently banner does not exist on SmartNews' surface, so there
  is nothing there to grant consent: GA4 runs cookieless and sends only
  privacy-preserving pings. Less granular data in exchange for not setting
  analytics cookies on a UK audience with no consent basis — the same bargain
  the site already makes.

`page_location` is the canonical article URL, so a SmartView read lands on the
same GA4 page path as a visit to the article itself; `page_referrer` is
`https://www.smartnews.com/`, which is what separates the two in reporting.

To turn it off, unset `NEXT_PUBLIC_GA_MEASUREMENT_ID` or drop the `analyticsXml`
call in `itemXml`.

### The logos

`snf:logo` is shown above the article in SmartView. SmartFormat specifies a
**700×100 PNG**.

| File | Used for | Look |
| --- | --- | --- |
| `public/smartnews-logo.png` | `snf:logo` | Near-black lockup on white |
| `public/smartnews-logo-dark.png` | `snf:darkModeLogo` | White lockup, transparent |

Both are generated from `public/energieBee-logo.svg` (512×80, `#1C1C1E`). The
dark variant is the same file with the mark colour swapped to white — note that
the lone `fill="white"` rect in that SVG is the **clipPath bounds**, not a
background; removing it clips the whole logo away.

Regenerate both together after a brand change, or they will disagree between
light and dark:

```bash
node -e '
const sharp=require("sharp"), fs=require("fs");
const src=fs.readFileSync("public/energieBee-logo.svg","utf8");
const dark=src.replace(/#1C1C1E/gi,"#FFFFFF");
const render=(svg,out,flat)=>{let p=sharp(Buffer.from(svg),{density:600})
  .resize(660,80,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}})
  .extend({top:10,bottom:10,left:20,right:20,background:{r:0,g:0,b:0,alpha:0}});
  if(flat)p=p.flatten({background:flat});return p.png({compressionLevel:9}).toFile(out);};
render(src,"public/smartnews-logo.png",{r:255,g:255,b:255});
render(dark,"public/smartnews-logo-dark.png",null);'
```

### Validating

SmartNews provide a **SmartFormat Validator** — run the deployed URL through it
for compliance, article rendering, images and metadata.

---

## NewsBreak (RSS/MRSS)

RSS 2.0 plus `nb:`, `dc:`, `content:` and `media:`. NewsBreak renders the
article itself and is explicit that **snippets, summary-only items and link-out
feeds are not accepted**.

**Channel:** `title`, `link`, `description`, `language`.
**Items (required):** `title`, `link`, `pubDate`, `dc:creator`, `description`,
`content:encoded`. Plus `guid` and `media:thumbnail`.

Three details of their specification, all satisfied by the shared pipeline:

1. **Images want `<figure>` / `<img>` / `<figcaption>`** — which is exactly what
   BlockNote emits and what `leadImage` mirrors. NewsBreak styles the caption
   differently from body text, so the structure carries meaning.
2. **Embed `<iframe>`s must be labelled** `nb-video` or `nb-audio` so NewsBreak
   knows which player chrome to use. `classifyEmbedIframes` adds the class,
   keeping any existing one (Instagram's embeds carry their own). Classification
   is a small audio host allow-list — `AUDIO_EMBED_HOSTS` — defaulting to video;
   add a host when one turns up. **No article currently contains an iframe**, so
   this is standing to attention rather than doing work.
3. **`<guid>` must be a URL permalink** and share its generation logic across
   feeds. It does — every feed derives it from the canonical article URL in the
   one `itemXml`.

`media:thumbnail` is optional for NewsBreak (they fall back to the first image
in `content:encoded`, which the lead image guarantees). It is sent anyway: an
explicit thumbnail is a choice, a fallback is a guess.

### Deliberately not sent

- **`nb:scripts`** would run our analytics inside NewsBreak's article iframe.
  That is a tracking decision with consent implications — the site gates
  analytics through Consently — not a formatting one, so it stays off until
  someone decides otherwise.
- **`nb:disclosure`** is wired but unset (`FEEDS.newsbreak`), because nothing
  here is sponsored or carries affiliate links. Set it there the day that
  changes; note it applies to every item, so a per-article disclosure would need
  a field on the post instead.

---

## Checking a deploy

```bash
for f in smartnews/smartnews newsbreak/newsbreak; do
  curl -sI "https://energiebee.com/$f.xml" | grep -iE "^HTTP|x-feed"
  curl -s  "https://energiebee.com/$f.xml" | xmllint --noout - && echo "$f OK"
done

# SmartNews only — both logos must be publicly reachable
curl -sI https://energiebee.com/smartnews-logo.png | head -1
curl -sI https://energiebee.com/smartnews-logo-dark.png | head -1
```

NewsBreak's own tip for checking a body: save one `content:encoded` value to a
`.html` file and open it in a browser — bar CSS, that is what their readers see.

Crawler hits are logged (`SmartNews` and `NewsBreak` are known user-agents, and
both feed paths are in `ALWAYS_LOG`) — see [crawler-logging.md](crawler-logging.md).
