import { FEEDS } from "@/app/lib/rss-feed";
import {
  renderSyndicationFeed,
  SYNDICATION_HEADERS,
} from "@/app/lib/syndication-feed";

/**
 * `/newsbreak/newsbreak.xml` — the RSS/MRSS feed given to NewsBreak.
 *
 * RSS 2.0 plus the `nb:`, `dc:`, `content:` and `media:` namespaces. NewsBreak
 * renders the article itself and is explicit that snippets, summary-only items
 * and link-out feeds are not accepted — so this carries whole bodies, sharing
 * the pipeline (and therefore the rules) with `/smartnews/smartnews.xml`. See
 * `renderSyndicationFeed`.
 *
 * Three details of their specification worth knowing, all already satisfied by
 * what the body pipeline produces:
 *
 *  1. Images want `<figure>` / `<img>` / `<figcaption>`, which is exactly what
 *     BlockNote emits and what `leadImage` mirrors — NewsBreak styles the
 *     caption differently from body text, so the structure carries meaning.
 *  2. Embedded `<iframe>` players must say whether they are video or audio
 *     (`nb-video` / `nb-audio`); `classifyEmbedIframes` labels them. No article
 *     currently contains an iframe, so this is standing to attention rather
 *     than doing work — which is the point, since the day one appears nobody
 *     will remember the rule.
 *  3. `<guid>` must be a URL permalink and share its generation logic across
 *     feeds. It does: every feed derives it from the canonical article URL in
 *     the one `itemXml`.
 *
 * `media:thumbnail` is optional here — NewsBreak falls back to the first image
 * in `content:encoded`, which the lead image guarantees for any article that
 * has a cover. It is sent anyway, because an explicit thumbnail is a choice and
 * a fallback is a guess.
 *
 * Not sent: `nb:scripts`, which would run our analytics inside NewsBreak's
 * article iframe. That is a tracking decision with consent implications (the
 * site gates analytics through Consently), not a formatting one, so it stays
 * off until someone decides otherwise. `nb:disclosure` is wired but unset —
 * see `FEEDS.newsbreak` — because nothing here is sponsored or affiliated.
 */
export async function GET() {
  const { xml, itemCount, droppedCount } = await renderSyndicationFeed(
    FEEDS.newsbreak,
  );

  return new Response(xml, {
    headers: {
      ...SYNDICATION_HEADERS,
      "X-Feed-Item-Count": String(itemCount),
      "X-Feed-Dropped-Count": String(droppedCount),
    },
  });
}
