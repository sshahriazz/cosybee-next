"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  Switch,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import { Envelope, MapPin, Smartphone } from "@gravity-ui/icons";
import { AppImage } from "@/app/components/ui/AppImage";
import CopyButton from "@/app/components/ui/CopyButton";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Heading, Text } from "@/app/components/ui/Typography";
import { AppLink as Link } from "@/app/components/ui/AppLink";
import { submitContact } from "@/app/lib/public-forms";
import { getRecaptchaToken, preloadRecaptcha } from "@/app/lib/recaptcha";
import landmarkImg from "@/public/Landmark-Day-scaled.webp";
import { trackEvent } from "@/app/lib/analytics";
// import { NewsletterSignup } from "./NewsletterSignup";

const FIELD_CLASS =
  "w-full border border-transparent bg-surface-secondary px-4 py-3 text-base text-foreground transition-colors placeholder:text-muted focus-within:border-accent";

type ContactInfo = {
  icon: React.ReactNode;
  title: string;
  detail: string;
  href?: string;
  /** When set, a hover-revealed button copies this text to the clipboard. */
  copy?: string;
};

const CONTACT_INFO: ContactInfo[] = [
  {
    icon: <Smartphone className="size-5" />,
    title: "Phone number",
    detail: "+44 1282 940095",
    href: "tel:+441282940095",
  },
  {
    icon: <Envelope className="size-5" />,
    title: "Email address",
    detail: "support@energiebee.com",
    href: "mailto:support@energiebee.com",
    copy: "support@energiebee.com",
  },
  {
    icon: <MapPin className="size-5" />,
    title: "Location",
    detail:
      "EnergieBee Limited, The Landmark, 1 School Lane, Burnley, BB11 1UF",
  },
];

const MAP_SRC =
  "https://www.google.com/maps?q=The+Landmark,+1+School+Lane,+Burnley+BB11+1UF&output=embed";

/**
 * Parallax image panel — the image layer is 130% of the frame's height and
 * slides vertically as the frame travels through the viewport. Driven
 * imperatively via refs + rAF (no re-renders); stays static under
 * prefers-reduced-motion.
 */
function ParallaxImage() {
  const frameRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const layer = layerRef.current;
    if (!frame || !layer) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = frame.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = Math.min(
        1,
        Math.max(0, (viewport - rect.top) / (viewport + rect.height)),
      );
      // Layer overshoots the frame by 15% top and bottom; sweep that range.
      const y = (0.5 - progress) * rect.height * 0.3;
      layer.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="relative min-h-80 overflow-hidden rounded-2xl sm:min-h-104 lg:min-h-0"
    >
      <div
        ref={layerRef}
        className="absolute inset-x-0 top-[-15%] h-[130%] will-change-transform"
      >
        <AppImage
          src={landmarkImg}
          alt="The Landmark, 1 School Lane, Burnley — home of EnergieBee"
          fill
          placeholder="blur"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

/**
 * Get-in-touch section — eyebrow + title, then a two-column band (parallax
 * office image left, multi-field enquiry form right), a row of contact-info
 * cards, and an embedded map. Light surface to follow the dark hero.
 */
export default function GetInTouch() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real users never fill this
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);

  // Load reCAPTCHA early so Google has page-interaction context by submit time
  // (covers both this form and the newsletter band — the script is a singleton).
  useEffect(() => preloadRecaptcha(), []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = `${firstName} ${lastName}`.trim();
    if (!name || !email.trim() || !message.trim() || !agreed || pending) return;

    setPending(true);
    const recaptchaToken = await getRecaptchaToken("contact");
    const result = await submitContact({
      name,
      email: email.trim(),
      message: message.trim(),
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      website,
      recaptchaToken,
    });
    setPending(false);

    if (result.ok) {
      trackEvent("generate_lead", { form: "contact" });
      toast.success("Thanks for reaching out — we'll be in touch soon.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setMessage("");
      setAgreed(false);
    } else {
      toast.danger(result.error);
    }
  };

  return (
    <Section spacing="md" surface="base">
      <Container size="wide">
        {/* heading */}
        <div className="mx-auto max-w-lg text-center">
          {/* <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Contact
          </p> */}
          <Heading variant="title" className="mt-2 text-foreground">
            Get in touch
          </Heading>
          <Text variant="lead" tone="muted" className="mt-3">
            Reach out to us anytime! We&rsquo;re here to help with your
            enquiries and support.
          </Text>
        </div>

        {/* parallax image + form */}
        <div className="mx-auto mt-12 grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <ParallaxImage />
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-4 text-sm font-bold text-foreground">
                Personal Information
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  aria-label="First name"
                  value={firstName}
                  onChange={setFirstName}
                  isRequired
                >
                  <Input placeholder="First Name" className={FIELD_CLASS} />
                </TextField>
                <TextField
                  aria-label="Last name"
                  value={lastName}
                  onChange={setLastName}
                  isRequired
                >
                  <Input placeholder="Last Name" className={FIELD_CLASS} />
                </TextField>
              </div>
              <TextField
                aria-label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                isRequired
              >
                <Input placeholder="Email" className={FIELD_CLASS} />
              </TextField>
              <TextField
                aria-label="Phone"
                type="tel"
                value={phone}
                onChange={setPhone}
              >
                <Input placeholder="Phone" className={FIELD_CLASS} />
              </TextField>
              <TextField
                aria-label="Company"
                value={company}
                onChange={setCompany}
              >
                <Input placeholder="Company" className={FIELD_CLASS} />
              </TextField>
            </fieldset>

            <fieldset className="flex flex-col gap-4">
              <legend className="mb-4 text-sm font-bold text-foreground">
                Purposes
              </legend>
              <TextArea
                aria-label="Message"
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className={`${FIELD_CLASS} resize-none`}
              />
            </fieldset>

            {/* Honeypot: off-screen, not announced to AT, ignored by humans. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="sr-only"
            />

            <Switch
              isSelected={agreed}
              onChange={setAgreed}
              className="items-center gap-3"
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Content>
                <span className="text-sm text-muted">
                  By selecting this, you agree to our{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-accent underline"
                  >
                    privacy policy.
                  </Link>
                </span>
              </Switch.Content>
            </Switch>

            <Button
              type="submit"
              isPending={pending}
              isDisabled={!agreed || pending}
              className="w-full bg-accent py-3 text-base font-semibold text-white shadow-[0_15px_30px_-10px_rgba(238,61,26,0.6)] transition hover:brightness-110"
            >
              {pending ? "Sending…" : "Send Message"}
            </Button>
          </form>
        </div>

        {/* contact info cards */}
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-3">
          {CONTACT_INFO.map((item) => {
            const detail = item.href ? (
              <Link
                href={item.href}
                className="text-sm text-muted transition-colors hover:underline"
              >
                {item.detail}
              </Link>
            ) : (
              <span className="text-sm text-muted">{item.detail}</span>
            );
            return (
              <div
                key={item.title}
                className="group/copy flex flex-col items-center rounded-2xl bg-surface-secondary px-6 py-8 text-center"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  {item.icon}
                </span>
                <h3 className="mt-4 text-base font-bold text-foreground">
                  {item.title}
                </h3>
                <div className="mt-1 flex items-center justify-center gap-1">
                  {detail}
                  {item.copy && (
                    <CopyButton label={item.title} value={item.copy} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* map */}
        <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-2xl border border-border">
          <iframe
            src={MAP_SRC}
            title="EnergieBee location map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-75 w-full sm:h-96"
            allowFullScreen
          />
        </div>

        {/* newsletter sign-up */}
        {/* <NewsletterSignup /> */}
      </Container>
    </Section>
  );
}
