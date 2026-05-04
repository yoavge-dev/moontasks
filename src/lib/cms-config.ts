// CMS field configuration — update this file to change the schema.
// Red = section-level | Blue = provider CMS fields | Yellow = hardcoded (no field)

export const CMS_CONFIG = {
  section: [
    { path: "section.badgeLabel",  type: "text", hint: 'Top badge label (e.g. "TOP MATCH")' },
    { path: "section.ctaText",     type: "text", hint: 'CTA button text (e.g. "Claim your bonus")' },
    { path: "section.heading",     type: "text", hint: 'Section heading (e.g. "Why it\'s feets you need")' },
  ],
  provider: [
    { path: "provider.mobileLogos",                    type: "image",  hint: "Mobile app logos" },
    { path: "provider.offers.bonus.offerText",         type: "text",   hint: "Bonus offer text" },
    { path: "provider.offers.amount",                  type: "text",   hint: "Offer amount" },
    { path: "provider.score.permanentRating.value",    type: "number", hint: "Permanent rating value" },
    { path: "provider.content.features",               type: "array",  hint: "Content features list" },
    { path: "provider.icons.paymentMethods",           type: "array",  hint: "Payment method icons" },
    { path: "provider.legal.disclaimer",               type: "text",   hint: "Legal disclaimer text" },
  ],
} as const;

export type CmsField = { path: string; type: string; hint: string };
