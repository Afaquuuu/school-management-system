import { Check } from "lucide-react";
import { DEMO_REQUEST_EMAIL } from "@/components/landing/demo-request";

function buildPlanMailto(planName: string) {
  return `mailto:${DEMO_REQUEST_EMAIL}?subject=${encodeURIComponent(
    `School Management — ${planName} Plan Inquiry`
  )}&body=${encodeURIComponent(
    `Hello,\n\nI am interested in the ${planName} plan for School Management.\n\nSchool name:\nContact name:\nPhone:\nEstimated students:\n\nThank you.`
  )}`;
}

const plans = [
  {
    name: "Starter",
    headline: "Flexible pricing",
    subline: "For small schools getting started",
    features: [
      "Up to 300 students",
      "Student, staff & attendance modules",
      "Exam & marks management",
      "Email support",
    ],
    cta: "Get a Quote",
    featured: false,
  },
  {
    name: "Professional",
    headline: "Most popular",
    subline: "For growing schools that need the full platform",
    features: [
      "Unlimited students & staff",
      "All modules + performance analytics",
      "Finance & communication tools",
      "Priority onboarding & support",
    ],
    cta: "Request Demo",
    featured: true,
  },
  {
    name: "Enterprise",
    headline: "Custom",
    subline: "For multi-campus organizations",
    features: [
      "Dedicated onboarding manager",
      "Custom integrations & workflows",
      "Multi-school administration",
      "Account manager & SLA support",
    ],
    cta: "Contact Sales",
    featured: false,
  },
] as const;

export function LandingPricing() {
  return (
    <section id="pricing" className="landing-pricing-section mt-8 scroll-mt-24">
      <div className="landing-pricing-header">
        <p className="landing-pricing-eyebrow">Pricing</p>
        <h2 className="landing-info-title">Simple, transparent pricing</h2>
        <p className="landing-pricing-lead">
          Choose a plan that fits your institution. Every plan includes secure cloud hosting,
          regular updates, and onboarding support.
        </p>
      </div>

      <div className="landing-pricing-grid">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`landing-pricing-card ${plan.featured ? "landing-pricing-card-featured" : ""}`}
          >
            {plan.featured ? (
              <span className="landing-pricing-popular">Most Popular</span>
            ) : null}

            <div className="landing-pricing-card-top">
              <h3 className="landing-pricing-plan-name">{plan.name}</h3>
              <p className="landing-pricing-headline">{plan.headline}</p>
              <p className="landing-pricing-subline">{plan.subline}</p>
            </div>

            <ul className="landing-pricing-features">
              {plan.features.map((feature) => (
                <li key={feature} className="landing-pricing-feature">
                  <span className="landing-pricing-check">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href={buildPlanMailto(plan.name)}
              className={
                plan.featured ? "landing-pricing-cta-primary" : "landing-pricing-cta-secondary"
              }
            >
              {plan.cta}
            </a>
          </article>
        ))}
      </div>

      <p className="landing-pricing-footnote">
        Need help choosing a plan? Email us at{" "}
        <a href={`mailto:${DEMO_REQUEST_EMAIL}`} className="landing-pricing-footnote-link">
          {DEMO_REQUEST_EMAIL}
        </a>
      </p>
    </section>
  );
}
