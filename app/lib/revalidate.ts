import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { CONTENT_TAG } from "./api";

/**
 * Drop every cached read of published content, plus the pages and files derived
 * from it. Call from any admin action that changes a post, tag or author.
 *
 * Why a tag and not a list of paths: a post's taxonomy is embedded in the post
 * payload, so renaming a tag or editing an author's bio changes the response
 * behind pages that name neither. One tag on every public read (see api.ts)
 * covers all of them without anyone having to remember the fan-out.
 *
 * `updateTag`, not `revalidateTag`: the latter only marks the tag stale, so the
 * next request — quite possibly Googlebot's — is still served the old sitemap
 * while the new one builds behind it. `updateTag` expires it outright and makes
 * the next request wait for fresh data, which is what "publish and it's live"
 * has to mean. It is Server-Action-only, which every caller here is.
 *
 * The `revalidatePath` calls that follow are not redundant: the tag invalidates
 * the fetched data, these invalidate the prerendered output built from it —
 * including the two dynamic route families whose every instance can be affected
 * by a single taxonomy edit. A route pattern needs the explicit `"page"` type
 * (Next requires it whenever the path has a dynamic segment); each match then
 * re-renders lazily on its next visit rather than all at once.
 *
 * Before this existed, the sitemap only ever caught up when api.ts's 60s fetch
 * TTL lapsed — freshness as a side effect of a cache option, which would have
 * vanished silently the day anyone tuned it.
 */
export function revalidateContent(): void {
  updateTag(CONTENT_TAG);

  // Derived files that enumerate the whole catalogue.
  revalidatePath("/sitemap.xml");
  revalidatePath("/video-sitemap.xml");
  revalidatePath("/news-sitemap.xml");
  revalidatePath("/llms.txt");
  // Belt-and-braces, exactly like /video-sitemap.xml above: this route renders
  // per request today, so `updateTag` alone already makes the next poll see the
  // new post. The line costs nothing and covers the day it stops being dynamic.
  revalidatePath("/smartnews/smartnews.xml");

  // Archives whose content can change without their own slug being touched.
  revalidatePath("/author/[slug]", "page");
  revalidatePath("/hive/tag/[tag]", "page");
  revalidatePath("/learn/tag/[tag]", "page");
}
