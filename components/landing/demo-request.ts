export const DEMO_REQUEST_EMAIL = "webdev.team002@gmail.com";

export const DEMO_REQUEST_MAILTO = `mailto:${DEMO_REQUEST_EMAIL}?subject=${encodeURIComponent(
  "School Management Demo Request"
)}&body=${encodeURIComponent(
  "Hello,\n\nI would like to request a demo of the School Management platform.\n\nSchool name:\nContact name:\nPhone:\n\nThank you."
)}`;

export const QUOTE_MAILTO = `mailto:${DEMO_REQUEST_EMAIL}?subject=${encodeURIComponent(
  "School Management Quote Request"
)}&body=${encodeURIComponent(
  "Hello,\n\nI would like a quote for the School Management platform.\n\nSchool name:\nContact name:\nPhone:\nEstimated students:\n\nThank you."
)}`;

export const SALES_MAILTO = `mailto:${DEMO_REQUEST_EMAIL}?subject=${encodeURIComponent(
  "School Management Sales Inquiry"
)}&body=${encodeURIComponent(
  "Hello,\n\nI would like to speak with sales about the School Management platform.\n\nSchool name:\nContact name:\nPhone:\n\nThank you."
)}`;

export const SUPPORT_MAILTO = `mailto:${DEMO_REQUEST_EMAIL}?subject=${encodeURIComponent(
  "School Management Support Request"
)}&body=${encodeURIComponent(
  "Hello,\n\nI need help with the School Management platform.\n\nSchool name:\nIssue:\n\nThank you."
)}`;
