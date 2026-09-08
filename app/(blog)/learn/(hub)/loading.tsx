import BlogHubSkeleton from "@/app/components/sections/blog/BlogHubSkeleton";

/**
 * Instant loading state for Learn.
 *
 * The hub is a dynamic route (it reads `searchParams`), so nothing about it is
 * prerendered and the router has no shell to paint on click — without this the
 * click read as dead rather than slow. See BlogHubSkeleton.
 *
 * It lives in the `(hub)` ROUTE GROUP, not at `app/(blog)/learn/`, and must
 * stay there. `loading.tsx` wraps its own page AND EVERY ROUTE BELOW IT in one
 * Suspense boundary, so at the segment root this file also covered
 * `/learn/[slug]`, `/learn/tag/[tag]` and `/learn/category/[slug]` — which
 * (a) flashed a hub skeleton while an article loaded, and (b) turned their
 * `notFound()` calls into streamed HTTP 200s, because a response that has
 * started streaming can no longer change its status. A route group adds no URL
 * segment, so `/learn` is unchanged while those siblings stay outside the
 * boundary and keep their hard 404s.
 *
 * Its twin is app/(blog)/hive/(hub)/loading.tsx — keep both pointing at the
 * shared skeleton.
 */
export default function Loading() {
  return <BlogHubSkeleton />;
}
