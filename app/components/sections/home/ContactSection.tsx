"use client";

import { useState } from "react";
import { Button, Input, TextField, TextArea } from "@heroui/react";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import Hexagon from "@/app/components/ui/Hexagon";
import DecorHex from "@/app/components/ui/DecorHex";

function EnvelopeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-12 w-12"
      aria-hidden
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <polyline points="22 6 12 13 2 6" />
    </svg>
  );
}

/**
 * Contact section — dark backdrop with a decorative olive hex behind
 * the headline, a yellow hex email card, and a 3-field form. Sits at
 * the bottom of the home page and mirrors the dark/Hero styling used
 * elsewhere on the site.
 *
 * The form is a controlled client component for state only; submit is
 * a no-op until you wire it to your backend / Vercel Forms / etc.
 */
export default function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: wire to server action / API route / Vercel Form handler
    console.log({ name, email, message });
  };

  return (
    <Section spacing="none" surface="dark" className="isolate">
      <Container className="py-20 lg:py-25">
        {/* decorative side hexes bleeding in from left + right */}
        <DecorHex
          side="left"
          color="#7A6F1C"
          className="top-100 -translate-y-1/2 w-80 sm:w-lg lg:w-lg"
        />
        <DecorHex
          side="right"
          color="#4A5F7A"
          className="top-12 w-72 sm:w-96 lg:w-96"
        />

        {/* headline + decorative hex behind it */}
        <div className="relative flex flex-col items-center">
          <Hexagon
            color="#7A6F1C"
            className="pointer-events-none absolute left-1/2 top-15 -z-10 w-72 -translate-x-1/2 -translate-y-1/2 sm:w-75"
          />
          <h2 className="text-6xl font-extrabold tracking-tight sm:text-7xl lg:text-[96px]">
            contact
          </h2>
          <p className="mt-2 text-base text-muted sm:text-lg">
            we&rsquo;d love to hear from you!
          </p>
        </div>

        {/* email card */}
        <div className="mt-16 flex flex-col items-center">
          <Hexagon
            color="#EFDF18"
            className="flex w-32 items-center justify-center sm:w-36"
          >
            <span className="absolute inset-0 flex items-center justify-center">
              <EnvelopeIcon />
            </span>
          </Hexagon>
          <a
            href="mailto:support@energiebee.com"
            className="mt-6 text-base font-medium text-white transition-colors hover:text-[#EFDF18] sm:text-lg"
          >
            support@energiebee.com
          </a>
        </div>

        {/* form */}
        <form
          onSubmit={onSubmit}
          className="mx-auto mt-16 flex max-w-295 flex-col gap-5"
        >
          <TextField
            aria-label="Name"
            value={name}
            onChange={setName}
            isRequired
          >
            <Input
              placeholder="Name"
              className="w-full rounded-full bg-surface px-7 py-5 text-base"
            />
          </TextField>
          <TextField
            aria-label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            isRequired
          >
            <Input
              placeholder="Email"
              className="w-full rounded-full bg-surface px-7 py-5 text-base"
            />
          </TextField>
          <TextArea
            aria-label="Message"
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
            className="w-full resize-none rounded-3xl bg-surface px-7 py-5 text-base"
          />
          <Button
            type="submit"
            variant="outline"
            className="w-full rounded-full border border-[#EFDF18] text-white hover:bg-[#EFDF18]/10 sm:text-lg"
          >
            Send
          </Button>
        </form>
      </Container>
    </Section>
  );
}
