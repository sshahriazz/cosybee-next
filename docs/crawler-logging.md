# Crawler logging

Every request from a search engine, social unfurler, feed reader or AI crawler
is written to the server's **stdout** as a single line:

```
[CRAWLER] Googlebot GET /hive/my-article 200 12.4ms {"crawler":"Googlebot","method":"GET","url":"/hive/my-article","status":200,"durationMs":12.4,"ip":"66.249.66.1","userAgent":"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)","referer":"https://www.google.com/","timestamp":"2026-09-04T07:20:47.211Z"}
```

The prefix is for `grep`, the JSON is for `jq` — one line so both work.

## Where it lives

| File | Role |
| --- | --- |
| `app/lib/crawler-log.ts` | `detectCrawler()`, the crawler table, path filtering, client-IP resolution, the log format. Pure — no side effects on import. |
| `app/lib/crawler-http-logger.ts` | Installs the hook on the Node HTTP server. This is what supplies the response **status** and **duration**. |
| `instrumentation.ts` | Next's server bootstrap hook; calls the installer once per server process. |

`proxy.ts` is deliberately untouched. It runs *before* the route renders, so it
can never see the status code or the response time — which is the whole reason,
and it still holds now that the proxy's matcher covers the entire site for the
sandbox gate (see `sandbox-access.md`). The app is
deployed as a self-hosted `output: "standalone"` Node server (see the
Dockerfile), so hooking the HTTP server is available to us and sees the whole
request. **If this app is ever moved to Vercel or another serverless platform,
this stops working** and the detection has to move into `proxy.ts` (losing
status and duration) — `detectCrawler()` is exported and ready for that.

## What is and isn't logged

Logged: pages (including dynamic `/hive/[slug]` and `/learn/[slug]` articles),
category and author pages, `/robots.txt`, `/sitemap.xml`, `/video-sitemap.xml`,
`/rss.xml`, `/newsnow/newsnow.xml`, `/news/applenews.xml`, `/llms.txt`,
`/api/og/*` (how social cards get built), and 404s.

Not logged: every request from a normal browser, `/_next/*`, `favicon.ico`, and
static assets (js/css/images/fonts/video). Nothing is logged for humans, so this
adds no per-visitor tracking and no personal data beyond the crawler's own IP.

## Viewing the logs

**Development** — they go to the terminal running `npm run dev`, mixed in with
Next's own output:

```bash
npm run dev | grep --line-buffered CRAWLER
```

**Production (Dokploy / Docker)** — stdout is the container log:

```bash
# Live tail, crawlers only
docker logs -f <container> 2>&1 | grep '\[CRAWLER\]'

# Last 24h from the Dokploy host
docker logs --since 24h <container> 2>&1 | grep '\[CRAWLER\]'
```

Dokploy's UI shows the same stream under the application's **Logs** tab; type
`[CRAWLER]` into its filter box.

At boot the logger prints one line — if it is missing, nothing is being logged:

```
[CRAWLER] logger attached (trustedProxyHops=1, pid=1)
```

## Filtering

```bash
L="docker logs --since 24h <container>"

# One crawler
$L 2>&1 | grep '\[CRAWLER\] Googlebot '
$L 2>&1 | grep '\[CRAWLER\] Bingbot '
$L 2>&1 | grep '\[CRAWLER\] NewsNow '

# All crawlers
$L 2>&1 | grep '\[CRAWLER\]'

# One article, whoever crawled it
$L 2>&1 | grep '\[CRAWLER\]' | grep ' /hive/my-article '

# Sitemaps and feeds only
$L 2>&1 | grep -E '\[CRAWLER\].* (/sitemap\.xml|/rss\.xml|/newsnow/newsnow\.xml|/robots\.txt) '

# Which crawlers came, and how often (a crawl-budget snapshot)
$L 2>&1 | grep -o '\[CRAWLER\] [A-Za-z0-9_.-]*' | sort | uniq -c | sort -rn

# Errors served to crawlers — the ones that cost you rankings
$L 2>&1 | grep '\[CRAWLER\]' | grep -E ' (4[0-9]{2}|5[0-9]{2}) '

# Structured queries: strip the prefix and pipe the JSON to jq
$L 2>&1 | grep -o '\[CRAWLER\] .*{.*}$' | sed 's/^.*\] [^{]*//' \
  | jq -r 'select(.crawler=="Googlebot") | [.timestamp,.status,.durationMs,.url] | @tsv'
```

## Verifying it works

Against a local dev server, or against production over HTTPS:

```bash
curl -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' \
  http://localhost:3000/robots.txt

curl -A 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' \
  http://localhost:3000/hive/my-article

curl -A 'Mozilla/5.0 (compatible; NewsNow/1.0; +http://www.newsnow.co.uk/)' \
  http://localhost:3000/rss.xml

# Control: a browser User-Agent must produce NO line
curl -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' \
  http://localhost:3000/
```

Which is also the point: **a User-Agent proves nothing.** Those four commands
produce log lines identical to the real crawlers'. Treat every line as "a
request claiming to be X".

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `CRAWLER_LOG` | *(unset)* | Set to `off` to disable logging entirely (the HTTP hook is not even installed). |
| `TRUSTED_PROXY_HOPS` | `1` in production, `0` elsewhere | How many reverse proxies sit in front of the app. `1` = Dokploy's Traefik. Put a CDN (Cloudflare) in front and set it to `2`. |

`X-Forwarded-For` is a chain that each proxy *appends* to, so the forgeable
entries are on the left and our own infrastructure's are on the right. The IP is
taken `TRUSTED_PROXY_HOPS` from the right — never `split(",")[0]`, which is
whatever the caller typed. With `0` hops the headers are ignored completely and
only the socket address is used.

## Adding a crawler

One line in `CRAWLER_SIGNATURES` in `app/lib/crawler-log.ts`, in the right
group, most specific first:

```ts
{ name: "ExampleBot", pattern: /ExampleBot/i },
```

Unknown crawlers are still caught by the generic fallback and logged under the
name pulled out of their UA (e.g. `AcmeBot`), so the table is about naming them
neatly, not about catching them at all.

## Deploying

No dependencies, no migrations, no new endpoints. Rebuild and redeploy as usual;
the logger attaches when the server boots. Setting `CRAWLER_LOG` or
`TRUSTED_PROXY_HOPS` in Dokploy needs a container restart (both are read at
startup), but no rebuild.
