# SmartNews feed

`https://energiebee.com/smartnews/smartnews.xml` — the [SmartFormat][spec] feed
SmartNews polls.

SmartFormat is RSS 2.0 plus three namespaces. What makes it different from the
site's other feeds is that **SmartNews renders the article itself**, as a
SmartView page, rather than linking out — so the whole body travels in the feed
and the channel carries the publisher branding that page is framed with.

[spec]: https://publishers.smartnews.com/hc/en-us/articles/56500436151065-SmartFormat-Specification-Version-2-2

## The four feeds

| Feed | Carries | Rebuilt |
| --- | --- | --- |
| `/rss.xml` | Description only | Every request |
| `/newsnow/newsnow.xml` | Description only | Every request |
| `/news/applenews.xml` | Description only | Every request |
| `/smartnews/smartnews.xml` | **Full article bodies**, thumbnails, branding | Every request, from 60s-cached reads |

All four share one builder (`buildRssFeed`) and one article list, so they cannot
disagree about what has been published. The SmartNews extras are **options on
`FEEDS.smartnews`** — `fullContent`, `thumbnails`, `maxItems`, `smartFormat` —
not a forked builder. Add a partner's requirement as another option; don't copy
the builder.

## What the feed contains

**Channel:** `title`, `link`, `description`, `pubDate`, `language`, `snf:logo`,
plus optional `snf:darkModeLogo` and `ttl`.

**Each item:** `title`, `link`, `guid`, `pubDate`, `dc:creator`, `description`,
`content:encoded`, `media:thumbnail`.

Namespaces are declared **only when used**, so the presence of `xmlns:snf`
genuinely means "this is a SmartFormat document".

## Decisions worth knowing

**Why `fullContent` is off by default.** Shipping whole articles turns every
reader into somewhere the piece can be consumed without visiting the site. It's
on for SmartNews because SmartNews renders the article and was given permission
to. Don't flip it on `/rss.xml` casually.

**The body is the same body the page renders.** Both go through
`renderArticleBody` (`app/lib/article-body.ts`). Before that existed the
resolution logic lived inline in `ArticleDetail`, and a copy in the feed would
have been free to drift — serving the stale `contentHtml` fallback while the
canonical URL rendered `contentJson`, republishing a different article than the
one at the link.

**What the feed does *not* inherit from the page.** The page adds heading ids,
table scroll wrappers, and routes images through Next's optimizer. The feed
skips all three — `optimizeArticleImages` in particular rewrites `<img>` to
`/_next/image?...`, which is site-relative and meaningless on SmartNews' origin.
It runs `stripPastedColors` (pasted inline colours would survive into SmartView)
and `absolutizeHtml`.

**Articles with no body are dropped, not published empty.** `content:encoded` is
required, and a SmartView page with no text is worse than the article's absence.
The `X-Feed-Dropped-Count` header reports how many.

**An article with no cover keeps its item but gets no `media:thumbnail`.** The
placeholder cover is deliberately not used: an aggregator presents the thumbnail
as *the article's* picture, so a shared stand-in would make every image-less
article look identically illustrated. One article currently has no cover.

**Tracking parameters.** SmartFormat asks for clean canonical article URLs, and
`<link>`/`<guid>` are exactly that — nothing in this codebase appends UTM
parameters. Some article *bodies* do contain `utm_` inside pasted third-party
embed markup (Instagram, mostly); that is authored content and stripping it
would break the embed, so it is left alone. The rule is about article URLs.

**Capped at 50 items** (`maxItems`). Each item costs a detail read, because the
list endpoint strips `contentJson`. The cap is applied *before* those reads, so
the work doesn't grow with the archive.

**It is the one feed that keeps the Data Cache.** The other three are
`force-dynamic` + `no-store`, which refetches everything per poll — fine when an
item is a title and a description, not when it is a detail read. Here the reads
are cached for 60s, so the feed's content can be up to a minute stale; a publish
clears that immediately (`updateTag(CONTENT_TAG)`).

The route itself still renders per request — the build marks it `ƒ`, as it does
`/video-sitemap.xml`. Measured on a production build with 50 items (~920KB):
**~1.1s cold, ~0.6s steady**, which is the fifty `contentJsonToHtml` renders,
not the HTTP reads. That is cheap enough for a feed polled every few minutes.
The only way to cache it further today is `unstable_cache`, which Next 16
documents as replaced by `use cache` (Cache Components, not enabled here) — so
if this ever gets expensive, lower `maxItems` before reaching for a deprecated
API.

## The logos

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

To regenerate after a brand change, do both together or they will disagree
between light and dark:

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

## Validating

SmartNews provide a **SmartFormat Validator** — run the deployed URL through it
to check compliance, article rendering, images and metadata. Locally:

```bash
# Well-formed, and how many items / how many were dropped
curl -sI https://energiebee.com/smartnews/smartnews.xml | grep -i x-feed
curl -s https://energiebee.com/smartnews/smartnews.xml | xmllint --noout - && echo OK

# Both logos must be publicly reachable
curl -sI https://energiebee.com/smartnews-logo.png | head -1
curl -sI https://energiebee.com/smartnews-logo-dark.png | head -1
```

Crawler hits are logged (`SmartNews` is a known user-agent, and the feed path is
in `ALWAYS_LOG`) — see [crawler-logging.md](crawler-logging.md).
