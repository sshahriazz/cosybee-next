import { tv, type VariantProps } from "@heroui/styles";
import Hexagon from "@/app/components/ui/Hexagon";

/**
 * DecorHex — the cream hexagon that bleeds off the edge of the 1440px design
 * rail on nearly every marketing band.
 *
 * Two rules live here so no call site has to restate them:
 *
 * 1. The hex is pulled out by exactly half of its own width
 *    (`-translate-x-1/2`), so the bleed is 50% at every breakpoint even though
 *    the width ramp changes. The old hand-tuned strings paired a fixed offset
 *    (`sm:-left-36`) with a responsive width (`sm:w-88 lg:w-76.75`), so the
 *    bleed drifted anywhere between 0% and 53%.
 *
 * 2. It bleeds off the 1440px rail, not off whatever box it happens to sit in.
 *    `left`/`right` resolve against the containing block, and the bands do not
 *    agree on one: most use `<Container>` (1440), seven use `size="wide"`
 *    (1280), one is narrower still. Anchored naively, the same component would
 *    bleed correctly on one band and sit 80px inside the window on the next.
 *    The `calc` walks back from the containing block's own width to the rail:
 *
 *      (100% − min(90rem, 100vw)) / 2
 *
 *    `100%` is the containing block, `90rem` is the rail (keep in step with
 *    `Container`'s `max-w-360`), and `100vw` collapses the term to zero once
 *    the window is narrower than the rail — below 1440 the rail *is* the
 *    window, so the hex bleeds straight off the screen edge. Above 1440 the
 *    rail stops growing and more of the hex comes into view.
 *
 * Mount it as a direct child of the band's `<Container>` — the containing
 * block has to be the centred container for the `calc` to hold. Dropping it
 * inside a column instead re-anchors it to that column's box, which is what
 * the previous hand-tuned offsets were quietly fighting.
 */
const decorHex = tv({
  base: "pointer-events-none absolute z-0",
  variants: {
    /** Which rail edge the hex bleeds off. */
    side: {
      left: "left-[calc((100%-min(90rem,100vw))/2)] -translate-x-1/2",
      right: "right-[calc((100%-min(90rem,100vw))/2)] translate-x-1/2",
    },
    /**
     * Width ramp. `md` is the site-wide decorative size, `sm` the small accent
     * hex. To override a one-off, pass a `w-*` for every step the ramp sets in
     * `className` — a leftover step otherwise wins at its breakpoint.
     */
    size: {
      sm: "w-28 sm:w-36",
      md: "w-72 sm:w-88 lg:w-76.75",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type DecorHexVariants = VariantProps<typeof decorHex>;

export interface DecorHexProps extends DecorHexVariants {
  side: NonNullable<DecorHexVariants["side"]>;
  /** Fill colour. Defaults to the cream used across the marketing bands. */
  color?: string;
  /**
   * Vertical placement, plus any per-band tweaks (opacity, visibility). These
   * win over the variant classes via tailwind-merge, so pass a plain `top-*`
   * rather than fighting the base with `!`.
   */
  className?: string;
}

export default function DecorHex({
  side,
  size,
  color = "#F7F2E1",
  className,
}: DecorHexProps) {
  return (
    <Hexagon
      color={color}
      className={decorHex({ side, size, class: className })}
    />
  );
}
