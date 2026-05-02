# Prime Air — Pricing Strategy

## Market Positioning

Prime Air targets HVAC companies in the **SMB sweet spot**: 3–50 technicians, $300K–$5M annual revenue. This segment is:
- Too small for ServiceTitan ($398+/mo, 6-month implementation, annual contract)
- Underserved by Workyard (no FSM — they still need 3 other tools)
- Outgrowing Housecall Pro (weak GPS, weak labor cost tracking)

Our pricing must:
1. Be obviously cheaper than ServiceTitan for the same or better features
2. Be premium-priced vs. Workyard, justified by the full FSM feature set
3. Have clear upgrade pressure from Starter → Pro

---

## Price Points

### Starter — $79/mo + $8/tech/mo

**Why $79 base:**
- Covers core infrastructure costs and support overhead for small companies
- Low enough that a 2-tech owner-operator can afford it (~$95/mo total)
- Sets an accessible entry point for companies testing the platform

**Per-tech fee: $8**
- Matches Workyard's Starter ($8/user) so the comparison is instant: "same price as Workyard, but with work orders and invoicing"
- At 10 techs: $159/mo — still < $200, psychologically below a key mental threshold

**Starter includes intentional feature gaps:**
- No estimates/invoicing (most powerful revenue features)
- No service agreements
- No customer portal
- No smart dispatch or advanced reporting

These gaps create natural upgrade pressure as the company grows.

---

### Pro — $149/mo + $15/tech/mo

**Why $149 base:**
- Above Housecall Pro's $149/mo entry but our per-tech rate is more predictable as the company scales
- Well below ServiceTitan's $398/mo starting price
- "Most Popular" badge — anchor to this plan

**Per-tech fee: $15**
- At 8 techs (average SMB): $149 + $120 = $269/mo
- At 15 techs: $149 + $225 = $374/mo — still ~$25/tech less than ServiceTitan at that scale
- The per-tech rate ensures revenue scales naturally with company size

**Pro is the target plan.** 80% of active customers should be on Pro. Starter exists for acquisition and smaller operators.

---

### Enterprise — Custom

**Trigger:** Companies with 30+ techs OR multiple locations OR custom integration needs

**Starting at:** $750/mo (custom quote from there)

**Value adds that justify custom pricing:**
- Multi-location management (branch view, consolidated reporting)
- Custom API with 80+ endpoints
- Dedicated onboarding specialist (8-week implementation)
- Custom form templates built by Prime Air team
- SLA: 99.9% uptime guarantee with credits
- Phone support line
- Quarterly business review with account manager

**Enterprise sales motion:** Inbound leads that match criteria get routed to a sales call, not self-serve signup.

---

## Annual vs. Monthly Pricing

| Plan | Monthly | Annual | Annual Savings |
|---|---|---|---|
| Starter base | $79 | $67 | 15% |
| Starter per-tech | $8 | $6.80 | 15% |
| Pro base | $149 | $127 | 15% |
| Pro per-tech | $15 | $12.75 | 15% |

**Annual billing strategy:**
- 15% discount (vs. Workyard's 24%) — smaller discount keeps margin healthier
- Require annual billing for access to: Stripe rate discount program, dedicated onboarding, phone support
- Default new signups to monthly; after 3 months trigger in-app prompt to switch to annual for savings

**Revenue impact:**
- Monthly: higher churn risk, more predictable inflow
- Annual: 15% discount but collects 12 months upfront, dramatically improves cash flow and reduces churn

Target: 60% of Pro customers on annual billing by Month 12.

---

## Add-Ons (Future Revenue Streams)

These are not in V1 but should be planned in the product roadmap:

| Add-On | Price | Who Buys |
|---|---|---|
| Customer portal (branded URL) | $49/mo | Pro companies who want white-labeled portal |
| API access (Starter plan) | $99/mo | Tech-forward companies on Starter who want integrations |
| QuickBooks Desktop sync | $29/mo | Companies on QB Desktop (legacy, still common) |
| SMS marketing (review requests) | $29/mo | Marketing-focused owners |
| Extra file storage (100GB+) | $19/mo | High-volume photo companies |
| Certified payroll report | $49/mo | Government contract / prevailing wage companies |

---

## Competitive Pricing Analysis

| Platform | Entry | Per Tech | 10-Tech Total | Who It's For |
|---|---|---|---|---|
| **Prime Air Starter** | $79 | $8 | $159 | Small HVAC, time tracking focus |
| **Prime Air Pro** | $149 | $15 | $299 | Growing HVAC, full FSM |
| Workyard Starter | $50 | $8 | $130 | GPS time tracking only |
| Workyard Pro | $50 | $16 | $210 | GPS + scheduling (no invoicing) |
| Housecall Pro Starter | $149 | included (5 users) | $149 | Small FSM (weak GPS) |
| Housecall Pro Max | $399 | — | $399 | Mid-size FSM |
| ServiceTitan | $398+ | varies | $600–$900+ | Large HVAC enterprises |
| Jobber | $69 | $29/user | $359 | General field service |
| FieldPulse | $99 | varies | ~$350 | Small FSM |

**Prime Air Pro wins on:** feature set vs. Workyard (2× the features at 1.4× the price), price vs. ServiceTitan (50–70% cheaper), HVAC specificity vs. Housecall Pro/Jobber.

---

## Freemium / Trial Strategy

### 14-Day Free Trial (Full Pro)
- No credit card required at signup
- Day 3: In-app prompt to invite team members ("Get more from your trial — add your techs")
- Day 7: Personal check-in email from "product team" with tips
- Day 10: Urgency email ("4 days left — here's what you'll lose access to")
- Day 14: Downgrade to read-only OR upgrade with credit card

**Trial conversion tactics:**
- Require at least 1 team member invite before trial ends (social proof activation)
- Show real-time ROI calculator: "Based on your usage, Prime Air has saved you an estimated 4 hours of payroll admin and tracked $2,400 in labor accurately"
- Offer 20% off first 3 months for converting before Day 14

### Grace Period
After trial expires: 7-day grace period with read-only access + daily "upgrade to continue" prompt. Data is preserved. After 7 days: data locked (accessible to owner for export for 30 days).

---

## Churn Prevention

**30-Day Mark:**
Automated health check email: "How's it going? You've completed 12 jobs in Prime Air — here are 3 features most companies unlock around this time."

**60-Day Mark:**
If a Pro customer hasn't used estimates or invoicing yet, trigger: "Did you know you can send your first estimate in 3 minutes? Here's how."

**Churn Signal Triggers:**
- Fewer than 5 clock-ins in the past 14 days → flag as at-risk → outreach
- No timecards approved in 30+ days → check in
- QuickBooks sync error lasting 7+ days → proactive support contact

**Win-Back:**
Cancelled accounts receive a 30-day winback email sequence. After 60 days: offer 3 months at 50% off to re-engage.

---

## Financial Model (Year 1 Projections)

### Assumptions
- Month 1: 10 companies (from beta)
- Month 6: 100 companies
- Month 12: 400 companies
- Average plan: 60% Pro, 35% Starter, 5% Enterprise
- Average company size: 8 techs

### Monthly Metrics at Month 12

| Metric | Value |
|---|---|
| Total companies | 400 |
| Pro companies (60%) | 240 × $269/mo avg | = $64,560 |
| Starter companies (35%) | 140 × $143/mo avg | = $20,020 |
| Enterprise (5%) | 20 × $900/mo avg | = $18,000 |
| **Total MRR** | **$102,580** |
| **ARR Run Rate** | **$1.23M** |

### Infrastructure cost at this scale: ~$1,500/month
### Gross margin: ~85%+ (SaaS-standard)
### Target CAC: < $500 (via content marketing + referrals)
### Target LTV: > $5,000 (18+ month average retention × ARPU)
### LTV:CAC ratio: > 10:1

---

## Referral Program

**Structure:**
- Company refers another HVAC company → referring company gets 1 free month per conversion
- Referred company gets 15% off their first 3 months
- Max referral credits: 6 months free per year

**Why referrals work in HVAC:**
- HVAC owners talk to each other at ACCA events, online forums, Facebook groups
- Word-of-mouth is the #1 acquisition channel for SMB software
- A happy owner running 12 techs knows 10 other owners — each referral is high-quality

**Referral tracking:** Unique referral link per company, tracked in dashboard, credits applied automatically on month 2 of referred company.
