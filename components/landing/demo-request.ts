export const DEMO_REQUEST_EMAIL = "webdev.team002@gmail.com";

function buildGmailComposeUrl(subject: string, body: string) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: DEMO_REQUEST_EMAIL,
    su: subject,
    body,
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
}

export const DEMO_REQUEST_LINK = buildGmailComposeUrl(
  "School Management Demo Request",
  "Hello,\n\nI would like to request a demo of the School Management platform.\n\nSchool name:\nContact name:\nPhone:\n\nThank you."
);

export const QUOTE_LINK = buildGmailComposeUrl(
  "School Management Quote Request",
  "Hello,\n\nI would like a quote for the School Management platform.\n\nSchool name:\nContact name:\nPhone:\nEstimated students:\n\nThank you."
);

export const SALES_LINK = buildGmailComposeUrl(
  "School Management Sales Inquiry",
  "Hello,\n\nI would like to speak with sales about the School Management platform.\n\nSchool name:\nContact name:\nPhone:\n\nThank you."
);

export const SUPPORT_LINK = buildGmailComposeUrl(
  "School Management Support Request",
  "Hello,\n\nI need help with the School Management platform.\n\nSchool name:\nIssue:\n\nThank you."
);

export const GMAIL_INBOX_LINK = `https://mail.google.com/mail/u/0/#inbox?compose=new&to=${encodeURIComponent(
  DEMO_REQUEST_EMAIL
)}`;

/** @deprecated Use DEMO_REQUEST_LINK — kept for any stale imports */
export const DEMO_REQUEST_MAILTO = DEMO_REQUEST_LINK;

/** @deprecated Use QUOTE_LINK */
export const QUOTE_MAILTO = QUOTE_LINK;

/** @deprecated Use SALES_LINK */
export const SALES_MAILTO = SALES_LINK;

/** @deprecated Use SUPPORT_LINK */
export const SUPPORT_MAILTO = SUPPORT_LINK;

export const externalEmailLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;
