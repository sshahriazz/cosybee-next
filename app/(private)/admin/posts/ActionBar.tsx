"use client";

import {
  Button,
  Card,
  Chip,
  ListBox,
  ListBoxItem,
  Select,
} from "@heroui/react";
import { ArrowUpRightFromSquare, TriangleExclamation } from "@gravity-ui/icons";
import { useState } from "react";
import { AppLink } from "@/app/components/ui/AppLink";
import type { AutosaveState } from "./useAutosave";

export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Sticky top action bar — blog picker on the left, status chip + action
 *  buttons on the right. Busy state is passed in — see `pending`. */
export function ActionBar({
  editing,
  status,
  blog,
  setBlog,
  onSetStatus,
  liveHref,
  disabled = false,
  hasIssues = false,
  pending,
  autosave,
  staged = null,
}: {
  editing: boolean;
  status: PostStatus;
  blog: string;
  setBlog: (b: string) => void;
  /**
   * Status this submit should put the post in — `""` for "leave it alone".
   *
   * Saving used to BE a status change: the secondary button set DRAFT, so
   * pressing "Save draft" on a live article unpublished it, and that was the
   * only way to edit one privately. Publication is now its own decision, made
   * by the buttons that say so.
   */
  onSetStatus: (s: string) => void;
  liveHref?: string;
  /** Block both save buttons (e.g. content images missing alt text). */
  disabled?: boolean;
  /** The post has advisory issues — mark the publish button and let the form
   *  show them before it publishes. Advisory only; nothing is blocked. */
  hasIssues?: boolean;
  /**
   * Whether a save is in flight.
   *
   * Passed in rather than read from `useFormStatus`: the form dispatches its
   * action by hand (so the status can be written onto the FormData), and
   * without an `action` prop React has no form state to report.
   */
  pending: boolean;
  /** Autosave's current state, rendered as the quiet line beside the chip. */
  autosave?: AutosaveState;
  /** Set when a live post is holding edits nobody has made live yet. */
  staged?: { onDiscard: () => void; busy: boolean } | null;
}) {
  // Which button was pressed, so only that one spins. It used to be inferred
  // from the status being submitted, which no longer distinguishes them — a
  // plain save submits no status at all.
  const [pressed, setPressed] = useState<string | null>(null);
  const isPublished = status === "PUBLISHED";
  const isArchived = status === "ARCHIVED";

  /**
   * Record which button was pressed, then hand over the status it asks for —
   * which is what actually submits the form (see `setStatusForSubmit`).
   *
   * These are `type="button"`, deliberately. As real submit buttons the
   * browser could serialise the form before this handler had written the
   * status field, and Publish would save a draft.
   */
  const press = (key: string, nextStatus: string) => () => {
    setPressed(key);
    onSetStatus(nextStatus);
  };
  const chipColor = isPublished
    ? ("success" as const)
    : isArchived
      ? ("warning" as const)
      : ("default" as const);
  const chipLabel = isPublished
    ? "Published"
    : isArchived
      ? "Archived"
      : "Draft";
  // Colour carries the meaning, so the states aren't all one grey word:
  //
  //   unsaved       danger   — work that only exists on screen
  //   saving        success  — on its way, and about to be safe
  //   saved         success  — steady while idle, not a flash: it stays until
  //                            the next keystroke
  //   not live yet  warning  — the one state with something still to do
  //   failed        danger   — handled separately below, since it also has to
  //                            survive on mobile and announce itself
  const autosaveNote: { text: string; tone: string } | null =
    autosave?.status === "saving"
      ? { text: "Saving…", tone: "text-success" }
      : autosave?.status === "dirty"
        ? { text: "Unsaved changes", tone: "text-danger" }
        : autosave?.status === "saved"
          ? // Read from `staged`, the same value that shows the Discard
            // button. It used to come off the autosave result, which is a
            // snapshot taken when that save landed — so pressing Update
            // cleared the button but left this insisting the work was not
            // live.
            staged
            ? { text: "Saved - not live yet", tone: "text-warning font-medium" }
            : { text: "Saved", tone: "text-success font-medium" }
          : null;

  return (
    <Card className="sticky top-20 z-30 mb-6 flex-row items-center justify-between">
      <div className="flex items-center gap-3">
        <Select
          aria-label="Blog"
          selectedKey={blog}
          onSelectionChange={(k) => setBlog(String(k))}
        >
          <Select.Trigger className="w-28">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBoxItem textValue="Hive" id="hive">
                Hive
              </ListBoxItem>
              <ListBoxItem textValue="Learn" id="learn">
                Learn
              </ListBoxItem>
            </ListBox>
          </Select.Popover>
        </Select>
        <Chip
          color={chipColor}
          size="sm"
          variant="soft"
          className="hidden sm:inline-flex"
        >
          {chipLabel}
        </Chip>
        {autosaveNote && (
          <span
            className={`hidden text-sm sm:inline ${autosaveNote.tone}`}
            // Spoken only when it settles, not on every keystroke.
            aria-live="polite"
          >
            {autosaveNote.text}
          </span>
        )}
        {autosave?.status === "error" && (
          <span className="text-xs font-medium text-danger" role="alert">
            {autosave.message}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {liveHref && (
          <AppLink
            href={liveHref}
            external
            className="hidden items-center gap-1 text-sm text-muted transition-colors hover:text-foreground sm:inline-flex"
          >
            View live
            <ArrowUpRightFromSquare className="size-3.5" />
          </AppLink>
        )}
        {/* A live post holding edits nobody has seen.
            There is no "make these live" button here on purpose: Update
            already does that, and does it properly. This acts only on the
            staged patch — it would have published the subset autosave
            tracks, so an author who had also changed the cover or the tags
            would have shipped the body and silently left those behind. */}
        {staged && (
          <Button
            type="button"
            variant="danger-soft"
            size="sm"
            onPress={staged.onDiscard}
            isDisabled={staged.busy || pending}
            isPending={staged.busy}
          >
            Discard changes
          </Button>
        )}

        {/* A live post's secondary action is to TAKE IT DOWN, said plainly —
            not a "Save draft" that quietly did the same thing. A draft has
            nothing to take down, so it gets an ordinary save instead. */}
        {isPublished ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={press("unpublish", "DRAFT")}
            isDisabled={pending || disabled}
            isPending={pending && pressed === "unpublish"}
          >
            Unpublish
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={press("save", "")}
            isDisabled={pending || disabled}
            isPending={pending && pressed === "save"}
          >
            {isArchived ? "Save" : "Save draft"}
          </Button>
        )}
        {editing && (isPublished || isArchived) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onPress={press("archive", isArchived ? "DRAFT" : "ARCHIVED")}
            isDisabled={pending || disabled}
            isPending={pending && pressed === "archive"}
          >
            {isArchived ? "Unarchive" : "Archive"}
          </Button>
        )}
        {/* Primary. On a post that is already live this is a plain save —
            it must not re-assert PUBLISHED, or a scheduled post would be
            dragged forward to now every time someone fixed a typo. */}
        <Button
          type="button"
          variant="primary"
          size="sm"
          onPress={press(
            "primary",
            isPublished || isArchived ? "" : "PUBLISHED",
          )}
          isDisabled={pending || disabled}
          isPending={pending && pressed === "primary"}
        >
          {/* Shown when THIS button leaves the post live, which has to match the
              gate on the issues dialog in PostForm or the dialog arrives
              unannounced. That means Publish on a draft and Update on a live
              post — but not Save on an archived one, which publishes nothing. */}
          {hasIssues && !isArchived && (
            <TriangleExclamation
              aria-hidden
              className="size-3.5 shrink-0 opacity-90"
            />
          )}
          {isPublished ? "Update" : isArchived ? "Save" : "Publish"}
        </Button>
      </div>
    </Card>
  );
}
