// The single landscape (1366x720) hero reel, shown behind the home and
// download-app heroes by HeroBackgroundVideo.
//
// Cached as immutable for a year (see the /hero-videos rule in
// next.config.ts), so THE FILENAME IS THE CACHE KEY: ship a new cut under a
// new name rather than overwriting this one, or clients keep the old footage.
export const HERO_VIDEO_LANDSCAPE = "/hero-videos/energiebee_tx_v1_(720p).mp4";
