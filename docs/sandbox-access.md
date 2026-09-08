# Sandbox access gate

A shared-code wall around a whole non-production deployment, so the sandbox
isn't readable by anyone who happens on the URL. Nothing renders until the
visitor is past it — pages, API routes, `public/` files, the admin console, the
lot.

It is **not** the site's own login. better-auth answers "which member is this?";
the gate answers "may this browser see the deployment at all?". They stack, and
the gate can be handed to a client for a look around without creating them an
account.

## Turning it on

Set one environment variable on the sandbox service in Dokploy:

```
SANDBOX_ACCESS_PASSWORD=<the shared code>
```

Redeploy. That's the whole setup — the gate goes up, `/preview` starts asking
for the code, and every other path redirects there until it's given.

An optional second variable adds a salt to the cookie signature:

```
SANDBOX_SESSION_SECRET=<random string>
```

Leave both unset for an open deployment. Production leaves them unset, and
**ignores them even if they are set** — see "Production can't be locked" below.

## Where it lives

| File | Role |
| --- | --- |
| `app/lib/sandbox-gate.ts` | Config, HMAC signing, cookie shape, `isGateEnabled()`. Pure and importable from both the proxy and the server action. |
| `proxy.ts` | Layer 1 of the proxy: checks every request, redirects locked ones to `/preview`, and handles the `?eb_preview=` link. |
| `app/preview/` | The unlock screen (`page.tsx`), the form (`UnlockForm.tsx`) and the Server Action that checks the code (`actions.ts`). |

## Getting in

Two ways, both landing on the same signed cookie:

1. **The screen.** Any locked URL bounces to `/preview?from=<where you were
   going>`. Enter the code and you're returned to that page, not to the home
   page.
2. **A link.** Append `?eb_preview=<the code>` to any URL:
   `https://sandbox.example.com/hive?eb_preview=hunter2`. The proxy swaps it for
   the cookie and redirects to the clean URL, so the code doesn't stay in the
   address bar or leak through the `Referer` header of the next request. Handy
   for "here's the build" messages.

   The parameter is namespaced rather than a plain `key` on purpose: the proxy
   deletes it from **every** request it sees, unlocked ones included, so a
   generic name would silently eat somebody else's. `key` in particular is
   already the S3 object in `/api/storage/download?key=…` and the address handle
   in `/onboarding/building-profile?key=…`. Anything new the gate reads off the
   query string needs the same treatment.

The pass lasts **30 days**, then the screen reappears.

## Rotating and revoking

The password is part of the cookie's signing key, so:

- **Change `SANDBOX_ACCESS_PASSWORD`** → every pass already issued stops
  working, and everyone re-enters the new code. This is the move when a code has
  leaked.
- **Change `SANDBOX_SESSION_SECRET` only** → everyone is signed out but the code
  they know still works. Useful when a laptop goes missing.

There is no session store to clear, and no per-person revocation — one shared
code is the deliberate trade for having no infrastructure behind it. If you ever
need to revoke one person without disturbing the others, that's the point at
which the single password should become a list.

## What stays open while locked

Four exceptions, all in `proxy.ts`:

| Path | Why |
| --- | --- |
| `/preview` | The way in. |
| `/robots.txt` | A crawler that can't read it assumes it may crawl. Ours says `Disallow: /` on every non-production host (`app/robots.ts`) and is what keeps the sandbox out of search. |
| `/.well-known/` | Certificate and domain-ownership challenges. Machines can't type a password. |
| `/_next/static/` | The build's own CSS and JS — including what the unlock screen needs to render. No page content lives there. |

`/api/*` is **not** open. Locked API requests get `401` with a JSON body rather
than a redirect, so client-side fetches fail cleanly instead of parsing a login
page.

## Production can't be locked

`isGateEnabled()` returns false for the canonical host in `PRODUCTION_URL`
(`app/lib/site.ts`), whatever the environment says. A password pasted into the
wrong Dokploy service would otherwise take the public site dark, silently, and
that failure is much worse than the inconvenience it prevents.

If a pre-launch lock on production is ever genuinely wanted, delete the hostname
check in `isGateEnabled()`. It's the only thing in the way, and it should be a
deliberate edit with a commit message on it.

## Brute force

The unlock action keeps an in-memory count of failures per IP: 8 wrong codes in
a minute and that address is told to wait. It's per-process and resets on
deploy, which is fine for a single sandbox container. If this ever runs
horizontally scaled, replace it — otherwise an attacker gets 8 attempts *per
instance*.

## Trying it locally

Uncomment `SANDBOX_ACCESS_PASSWORD` in `.env` and restart `next dev`.
`localhost` isn't the production host, so the gate comes up exactly as it does
on the sandbox.
