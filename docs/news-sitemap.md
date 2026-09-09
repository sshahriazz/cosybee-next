# News sitemap

`https://energiebee.com/news-sitemap.xml` — a [Google News sitemap][spec], read by
Googlebot-News to pick up articles within minutes of publication instead of
waiting for the next ordinary crawl.

It is **additional** to `/sitemap.xml`, never a replacement. The ordinary sitemap
stays the permanent record of every URL on the site; this file is a rolling
window of what is new.

[spec]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap

## What goes in it

An article is listed when **all** of these hold:

| Rule | Where it lives |
| --- | --- |
| It's in **The Hive** — `learn` is evergreen guides, which Google asks publishers to keep out | `NEWS_BLOG` / `isNewsArticle`, `app/lib/news-sitemap.ts` |
| Published in the **last 2 days** | `NEWS_WINDOW_DAYS`, same file |
| Not `noindex`, and not pointing its canonical at another site | `isAdvertisable`, `app/lib/articles.ts` — the same predicate `/sitemap.xml` uses |
| It has a headline and a publication date | `buildNewsSitemap`, same file |

Each entry carries exactly the four fields Google requires — `news:name`,
`news:language`, `news:publication_date`, `news:title` — in the order the
published schema demands. No optional fields (`news:genres`, `news:keywords`,
`news:stock_tickers`) are emitted; add them to `urlXml` if a reason ever appears.

## It is usually empty, and that is correct

Google's rule is that a news sitemap holds articles "created in the last two
days", and that older URLs be removed. On a site that publishes weekly, that
means an **empty `<urlset>` most of the time**.

An empty file is valid XML, returns HTTP 200, and Search Console reports it as a
sitemap with zero URLs — not an error. Those articles are still indexed; they're
listed in `/sitemap.xml` like everything else.

**Do not widen `NEWS_WINDOW_DAYS` to make the file look busier.** Stale entries
are precisely what the spec asks publishers to remove, and they buy nothing:
Googlebot-News ignores an out-of-window article wherever it finds it.

Quick check on whether the file is empty for the right reason — the route sets a
header with the entry count, so you don't have to read the body:

```bash
curl -sI https://energiebee.com/news-sitemap.xml | grep -i x-news-article-count
```

## How it stays fresh

This file goes stale on the **clock** as well as on content — an article leaves
the window with nothing having been edited. So the route calls `connection()`,
which renders it at request time; without that, Next would prerender it at build
and freeze the window against a stopped clock. (It does prerender `/sitemap.xml`
that way, which is fine there — that file has no time dimension.)

`connection()` rather than `force-dynamic`: the latter would also force every
fetch to `no-store`, discarding the article read's shared Data Cache entry and
re-walking the catalogue on each crawler hit. This way only the render moves to
request time; the read keeps its 60s TTL and its `CONTENT_TAG`.

Publishing from the admin calls `revalidateContent()`, which expires the tag
outright and re-renders `/news-sitemap.xml` along with the other derived files,
so a new article appears on the very next request. There is no separate step.

## Where the pieces are

| File | Role |
| --- | --- |
| `app/lib/news-sitemap.ts` | The document builder: all the rules, plus the XML. Pure function of articles + a clock. |
| `app/(blog)/news-sitemap.xml/route.ts` | The route. Fetches, builds, sets the cache and count headers. |
| `app/lib/articles.ts` | `getIndexableArticles(blog)` — the published, advertisable catalogue. |
| `app/lib/xml.ts` | `escapeXml` / `w3cDate`, shared with the RSS feeds and the video sitemap. |
| `app/robots.ts` | Advertises the file alongside `/sitemap.xml` and `/video-sitemap.xml`. |
| `app/lib/revalidate.ts` | Re-renders it when an admin publishes. |
| `app/lib/crawler-log.ts` | Logs every crawler hit on it (`ALWAYS_LOG`). |

## Submitting it

Once deployed to production:

1. Open [Google Search Console](https://search.google.com/search-console) and
   select the EnergieBee property.
2. **Indexing → Sitemaps**.
3. Enter `news-sitemap.xml` and submit.

It only needs submitting once — Google re-reads it on its own schedule
thereafter, and robots.txt advertises it regardless.

Worth knowing: a news sitemap speeds up *discovery*; it is not an application to
Google News. Sites are considered for Google News automatically, so there is no
separate submission to make.

## Validating a deploy

```bash
# 200, XML content type, and how many articles are listed
curl -sI https://energiebee.com/news-sitemap.xml

# Parses cleanly
curl -s https://energiebee.com/news-sitemap.xml | xmllint --noout - && echo OK

# Listed URLs actually resolve
curl -s https://energiebee.com/news-sitemap.xml \
  | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' \
  | while read -r u; do echo "$(curl -so /dev/null -w '%{http_code}' "$u") $u"; done
```

Then check the titles match the articles' own `<h1>` and the dates match their
publication dates — both come straight from the post record, so a mismatch means
the record is wrong rather than the sitemap.

Ongoing, watch Search Console's Sitemaps report for read errors, and the crawler
log (see [crawler-logging.md](crawler-logging.md)) for whether Googlebot-News is
actually turning up.
