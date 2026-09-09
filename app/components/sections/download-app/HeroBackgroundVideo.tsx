"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import {
  PauseFill,
  PlayFill,
  VolumeFill,
  VolumeSlashFill,
} from "@gravity-ui/icons";
import { HERO_VIDEO_ORIGIN } from "@/app/lib/hero-videos";

/**
 * Background video for the hero, mounted only at md+ (tablet and up). A media
 * query in JS — not CSS hiding — because a `display:none` video with autoplay
 * still downloads; small devices should never fetch the ~13MB file. Until it
 * mounts (and below md, and under prefers-reduced-motion) the hero shows the
 * background photo underneath.
 *
 * Plays through exactly once: it pauses whenever the hero scrolls out of view
 * (and resumes on the way back, unless the viewer pressed pause), and on
 * `ended` it fades out to reveal the photo again rather than looping. The play
 * button restarts it from the top.
 *
 * Renders two sibling layers: the video at -z-10 (above the -z-20 photo,
 * below the gradient the parent places after this component) and a
 * play/mute control cluster at the hero's top-right corner on positive z,
 * so it stays clickable above the content rail.
 */
export default function HeroBackgroundVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // The viewer's intent, kept out of state so the observer never restarts a
  // video they deliberately paused.
  const wantsPlaybackRef = useRef(true);
  const [show, setShow] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setShow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Pause offscreen so a hero scrolled past isn't decoding frames nobody sees.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (wantsPlaybackRef.current && !video.ended) void video.play();
        } else if (!video.paused) {
          video.pause();
        }
      },
      // Any sliver of the hero counts — the element is usually taller than the
      // viewport, so a ratio-based threshold would never fire.
      {
        threshold: 0.5,
        rootMargin: "-80px 0px 0px 0px",
      },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [show]);

  // Abort the download when this hero goes away — a route change, or a resize
  // below md.
  //
  // Removing a media element from the document runs the spec's "internal pause
  // steps", which stop PLAYBACK but not the FETCH. With `preload="auto"` on a
  // ~13MB file that leaves megabytes still arriving for a hero nobody is
  // looking at, competing for bandwidth with the page just navigated to.
  // Detaching the source and calling `load()` is what actually cancels it.
  //
  // Deferred to a microtask and guarded on `isConnected` because this is
  // destructive and cannot be undone: React would not re-set the `src` prop
  // afterwards, since from its side nothing changed. Under Strict Mode's
  // dev-only setup → cleanup → setup double-invoke the element is still in the
  // document, so an eager teardown would blank the video on first mount and it
  // would never come back. By the time the microtask runs, a real unmount has
  // detached the node and a Strict Mode replay has not.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    return () => {
      queueMicrotask(() => {
        if (video.isConnected) return;
        video.pause();
        video.removeAttribute("src");
        video.load();
      });
    };
  }, [show]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      wantsPlaybackRef.current = true;
      void video.play();
    } else {
      wantsPlaybackRef.current = false;
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <>
      {/* Open the connection to the CDN during the hero's first paint, so the
          handshake is not still in front of the player when it asks for its
          first byte. React 19 hoists this to <head> and dedupes it, so the two
          heroes never emit it twice.

          Rendered OUTSIDE the `show` gate below, and that is the whole point:
          `show` is false until a client effect measures the viewport, so
          anything behind it misses the server-rendered HTML and lands in the
          same commit as the <video> — simultaneous, and therefore worthless as
          a hint. `media` carries the md+ rule instead, so phones (which never
          mount the video) do not open a connection they will not use.

          No `crossOrigin`: the <video> below has no `crossorigin` attribute, so
          it fetches in no-CORS mode. A hint in CORS mode is a separate
          connection-pool entry and the player would not reuse it. */}
      {HERO_VIDEO_ORIGIN && (
        <link
          rel="preconnect"
          href={HERO_VIDEO_ORIGIN}
          media="(min-width: 768px)"
        />
      )}
      {show && (
        <>
          <video
            ref={videoRef}
            src={src}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden
            onPlay={() => {
              setIsPlaying(true);
              setHasEnded(false);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              wantsPlaybackRef.current = false;
              setHasEnded(true);
            }}
            className={`absolute inset-0 -z-10 h-full w-full object-cover object-center transition-opacity duration-700 motion-reduce:hidden ${
              hasEnded ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* controls — hidden with the video under prefers-reduced-motion */}
          <div className="absolute right-4 top-4 z-10 flex gap-2 sm:right-6 sm:top-6 motion-reduce:hidden">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={isPlaying ? "Pause video" : "Play video"}
              onPress={togglePlay}
              className="rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
            >
              {isPlaying ? <PauseFill /> : <PlayFill />}
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
              onPress={toggleMute}
              className="rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
            >
              {isMuted ? <VolumeSlashFill /> : <VolumeFill />}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
