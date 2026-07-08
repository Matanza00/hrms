import { apiGet, apiPost } from "../apiClient";

export type FeedbackType =
  | "Bug / Something broken"
  | "Missing feature"
  | "Improvement"
  | "Other";

export type FeedbackStatus = "New" | "In Progress" | "Resolved" | "Dismissed";

/** A single feedback report submitted by an employee or admin. */
export type Feedback = {
  feedbackId: string;
  type: FeedbackType | string;
  reason: string;
  /** Full URL of the page the reporter was on. */
  pageUrl: string;
  /** Path only, e.g. "/attendance". */
  pagePath: string;
  role: string;
  reporterName: string;
  reporterEmail: string;
  reporterCode: string;
  userAgent: string;
  viewport: string;
  /** Drive/URL link to the attached screenshot, if any. */
  screenshotUrl?: string;
  status: FeedbackStatus | string;
  createdAt: string;
};

/** Payload sent when a user submits new feedback. */
export type SubmitFeedbackInput = {
  type: string;
  reason: string;
  pageUrl: string;
  pagePath: string;
  role: string;
  reporterName: string;
  reporterEmail: string;
  reporterCode: string;
  userAgent: string;
  viewport: string;
  /** Base64 data URL of the screenshot (may be empty). */
  screenshot: string;
  createdAt: string;
};

export const submitFeedback = (data: SubmitFeedbackInput) =>
  apiPost<Feedback>("submitFeedback", data);

/** Admin-only: list all submitted feedback. */
export const getFeedback = () => apiGet<Feedback[]>("feedback");

export const updateFeedbackStatus = (
  feedbackId: string,
  status: FeedbackStatus
) => apiPost<Feedback>("updateFeedbackStatus", { feedbackId, status });
