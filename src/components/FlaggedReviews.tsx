"use client";

import { useState } from "react";

import {
  dismissReport,
  removeReview,
} from "@/app/guild/[id]/moderation-actions";

/** A flag as the guild page renders it — names resolved, ids from the DB. */
export interface FlaggedReview {
  reportId: string;
  reviewId: string;
  body: string;
  /** Null while the review's film is still anonymous. */
  authorName: string | null;
  reporterName: string;
}

/**
 * The president's moderation queue: every member-flagged review, each
 * resolved by removing the review or dismissing the flag. Rendered only
 * when the queue is non-empty.
 */
export function FlaggedReviews({
  guildId,
  reports,
}: {
  guildId: string;
  reports: FlaggedReview[];
}) {
  const [queue, setQueue] = useState(reports);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (queue.length === 0) return null;

  const resolve = async (
    report: FlaggedReview,
    action: "remove" | "dismiss",
  ) => {
    setBusy(report.reportId);
    setError(null);
    const result =
      action === "remove"
        ? await removeReview(guildId, report.reviewId)
        : await dismissReport(guildId, report.reportId);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Removing a review clears every flag on it, not just this one.
    setQueue((prev) =>
      prev.filter((r) =>
        action === "remove"
          ? r.reviewId !== report.reviewId
          : r.reportId !== report.reportId,
      ),
    );
  };

  return (
    <section className="border border-signal bg-paper-raised p-6">
      <h2 className="label-eyebrow text-signal">
        Flagged reviews · {queue.length}
      </h2>
      <p className="mt-2 max-w-lg text-xs leading-relaxed text-ink-faint">
        Members flagged these reviews. Remove takes the review down for the
        whole guild; dismiss clears the flag and leaves it up.
      </p>

      {error && <p className="mt-3 text-xs text-signal">{error}</p>}

      <ul className="mt-4 space-y-5">
        {queue.map((report) => (
          <li key={report.reportId} className="border-l-2 border-signal pl-4">
            <p className="text-sm">
              <span className="font-medium">
                {report.authorName ?? "Anonymous (window still open)"}
              </span>
              <span className="text-ink-faint">
                {" "}
                · flagged by {report.reporterName}
              </span>
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {report.body}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => resolve(report, "remove")}
                disabled={busy === report.reportId}
                className="border border-signal px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-signal transition-colors hover:bg-signal hover:text-paper disabled:opacity-50"
              >
                Remove review
              </button>
              <button
                type="button"
                onClick={() => resolve(report, "dismiss")}
                disabled={busy === report.reportId}
                className="border border-rule px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-ink-faint transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
