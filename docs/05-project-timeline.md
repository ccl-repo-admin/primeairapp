# Prime Air Condition — Project Timeline & Phases

## Team Assumptions

| Role | Count | Notes |
|---|---|---|
| Full-Stack Developer | 2 | React Native + Next.js + Node.js |
| UI/UX Designer | 1 | Part-time; designs in Figma before dev builds |
| QA Engineer | 1 | Joins Phase 2; manual + automated testing |
| Project Lead | 1 | Product decisions, customer interviews, documentation |

Timeline assumes 40-hour work weeks. Adjust proportionally for different team sizes.

---

## Phase 0: Foundation (Weeks 1–3)

**Goal:** Development environment, monorepo, auth, and base UI shell running.

| Task | Owner | Days |
|---|---|---|
| Monorepo setup (pnpm workspaces + Turborepo) | Dev 1 | 1 |
| Supabase project + Prisma schema + initial migration | Dev 1 | 2 |
| tRPC server + Next.js integration | Dev 1 | 1 |
| Auth: SMS OTP via Twilio + NextAuth sessions | Dev 1 | 3 |
| Auth: Email/password + 2FA (admin) | Dev 2 | 2 |
| Expo project setup + Expo Router file structure | Dev 2 | 2 |
| Design system: Tailwind config + shadcn/ui setup (web) | Dev 1 | 1 |
| Design system: React Native Paper / NativeWind (mobile) | Dev 2 | 1 |
| Company registration wizard (web, 5 steps) | Dev 1 | 3 |
| Admin shell layout: sidebar nav, header, breadcrumbs | Dev 1 | 2 |
| Mobile shell: tab navigator, protected routes | Dev 2 | 2 |
| CI/CD: GitHub Actions, Vercel deploy, EAS setup | Dev 1 | 1 |
| Dev seed data: demo company, 5 users, 10 work orders | Dev 2 | 1 |

**Phase 0 Deliverable:** Monorepo builds; SMS login works on mobile + web; admin dashboard shell loads; Expo app runs on device.

---

## Phase 1: Core Time Tracking + GPS (Weeks 4–9)

**Goal:** The Workyard feature parity layer — ship what replaces Workyard entirely.

### Week 4–5: Mobile Time Clock
| Task | Owner | Days |
|---|---|---|
| Clock in/out screen (large button, project selector) | Dev 2 | 3 |
| GPS background tracking (expo-location) | Dev 2 | 3 |
| Offline time entry queue (expo-sqlite) | Dev 2 | 2 |
| Location ping API endpoint + ingestion | Dev 1 | 2 |
| Facial photo capture at clock-in | Dev 2 | 1 |
| Break recording (start/end, type) | Dev 2 | 1 |

### Week 5–6: Geofencing + Auto Detection
| Task | Owner | Days |
|---|---|---|
| Geofence creation UI (admin web + map picker) | Dev 1 | 2 |
| Geofence detection on mobile (enter/exit events) | Dev 2 | 2 |
| Auto clock-in prompt on geofence entry | Dev 2 | 1 |
| Auto project/cost code assignment from geofence | Dev 1 | 1 |
| Drive detection algorithm (speed threshold) | Dev 2 | 2 |

### Week 6–7: Admin Timecard Management
| Task | Owner | Days |
|---|---|---|
| Timecard list view (web): filter, sort, bulk select | Dev 1 | 2 |
| Timecard edit modal (with audit log entry) | Dev 1 | 2 |
| Bulk approve timecards | Dev 1 | 1 |
| Overtime calculation engine (federal + top 5 states) | Dev 1 | 3 |
| Break compliance engine + reminders | Dev 1 | 2 |
| Clock-out compliance questionnaire + signature | Dev 2 | 2 |

### Week 7–8: Crew Map + Supervisor Tools
| Task | Owner | Days |
|---|---|---|
| Live crew map (Google Maps, real-time WebSocket pins) | Dev 1 | 3 |
| Socket.io server setup + Redis adapter | Dev 1 | 2 |
| Supervisor bulk clock in/out (mobile) | Dev 2 | 2 |
| Switch crew between projects mid-shift | Dev 2 | 1 |
| Historical map view (replay any past date) | Dev 1 | 2 |

### Week 8–9: Projects, Cost Codes, Reporting
| Task | Owner | Days |
|---|---|---|
| Project management CRUD (web) | Dev 1 | 2 |
| Cost code management | Dev 1 | 1 |
| Labor cost report (pivot by employee/project/code) | Dev 1 | 3 |
| Payroll export: QuickBooks + CSV | Dev 1 | 2 |
| Time-off request + approval flow | Dev 2 | 3 |
| Timecard PDF export | Dev 1 | 1 |

**Phase 1 Deliverable:** Full Workyard replacement. Field techs can clock in/out with GPS, geofencing works, admins can see crew map and approve timecards, payroll exports to QuickBooks. **Ready for pilot with first HVAC company.**

---

## Phase 2: HVAC Operations Core (Weeks 10–18)

**Goal:** Complete field service management — work orders, customers, dispatch, and forms.

### Week 10–11: Customer & Asset Management
| Task | Owner | Days |
|---|---|---|
| Customer list + search (web) | Dev 1 | 2 |
| Customer detail page (history, assets, agreements) | Dev 1 | 3 |
| Customer create/edit form | Dev 1 | 1 |
| Asset management (CRUD + service history log) | Dev 1 | 3 |
| Customer address management + map preview | Dev 1 | 1 |
| Customer search on mobile app | Dev 2 | 2 |

### Week 11–13: Work Order Management
| Task | Owner | Days |
|---|---|---|
| Work order create form (all fields) | Dev 1 | 3 |
| Work order list with filters + status columns | Dev 1 | 2 |
| Work order detail page (web) | Dev 1 | 3 |
| Work order status state machine + transitions | Dev 1 | 2 |
| Work order status history timeline | Dev 1 | 1 |
| Photo upload to work order | Dev 2 | 2 |
| Checklist templates + completion tracking | Dev 2 | 2 |
| Part usage recording on work order | Dev 2 | 2 |

### Week 13–14: Tech Mobile Job Flow
| Task | Owner | Days |
|---|---|---|
| Today's jobs list (mobile home screen) | Dev 2 | 2 |
| Job detail screen (mobile): full work order | Dev 2 | 2 |
| Navigate button → opens Maps | Dev 2 | 0.5 |
| Accept job / en route / arrived / complete flow | Dev 2 | 2 |
| Photo capture and upload from mobile | Dev 2 | 1 |
| Checklist completion on mobile | Dev 2 | 1 |
| Customer signature capture (react-native-signature-canvas) | Dev 2 | 1 |
| Parts recording from mobile | Dev 2 | 1 |
| Push notifications for job assignment/updates | Dev 2 | 2 |

### Week 14–15: Dispatch Board
| Task | Owner | Days |
|---|---|---|
| Dispatch board layout: tech columns + job cards | Dev 1 | 3 |
| Drag-and-drop job assignment (dnd-kit) | Dev 1 | 2 |
| Unassigned jobs queue | Dev 1 | 1 |
| Smart dispatch: nearest available tech suggestion | Dev 1 | 2 |
| Customer "tech en route" SMS with ETA | Dev 1 | 1 |
| Live ETA calculation (Google Directions API) | Dev 1 | 1 |

### Week 15–16: Smart Forms
| Task | Owner | Days |
|---|---|---|
| Form builder UI (drag-and-drop fields, web) | Dev 1 | 4 |
| Form schema storage (JSONB) and validation | Dev 1 | 1 |
| Form renderer component (mobile + web) | Dev 2 | 3 |
| 20 pre-built HVAC form templates | Designer | 3 |
| Form submission API + PDF generation | Dev 1 | 2 |
| Auto-assign forms on job start/complete | Dev 1 | 1 |
| Conditional field logic engine | Dev 2 | 2 |
| Flagged response alerts | Dev 1 | 1 |

### Week 16–18: Scheduling Calendar
| Task | Owner | Days |
|---|---|---|
| Calendar view: day/week/month (react-big-calendar) | Dev 1 | 3 |
| Group by technician view | Dev 1 | 2 |
| Drag-and-drop rescheduling | Dev 1 | 2 |
| Recurring work order generation engine | Dev 1 | 2 |
| Task creation + assignment | Dev 1 | 2 |
| Schedule notification push/email to techs | Dev 1 | 1 |
| Mobile schedule view (tech) | Dev 2 | 2 |
| Service agreement → recurring work order auto-gen | Dev 1 | 2 |

**Phase 2 Deliverable:** Full HVAC FSM platform. Dispatchers can manage job lifecycle, techs have complete mobile workflow, forms/checklists work, smart dispatch operational. **Ready for full company onboarding.**

---

## Phase 3: Revenue & Customer Experience (Weeks 19–26)

**Goal:** Estimates, invoicing, payments, and customer portal. Platform becomes a complete business management tool.

### Week 19–20: Estimates
| Task | Owner | Days |
|---|---|---|
| Estimate builder with tiered options (Good/Better/Best) | Dev 1 | 4 |
| Line item editor (labor, parts, materials) | Dev 1 | 2 |
| Estimate PDF generation (React PDF) | Dev 1 | 2 |
| Send estimate by email (Resend + template) | Dev 1 | 1 |
| Customer estimate approval page (public, no login) | Dev 1 | 2 |
| Customer digital signature on approval | Dev 1 | 1 |
| Auto-convert approved estimate to work order | Dev 1 | 1 |

### Week 20–22: Invoicing
| Task | Owner | Days |
|---|---|---|
| Invoice auto-generation from completed work order | Dev 1 | 2 |
| Invoice editor (add/remove line items) | Dev 1 | 2 |
| Invoice PDF generation + email delivery | Dev 1 | 2 |
| Stripe payment integration (online payment link) | Dev 1 | 3 |
| Stripe Terminal / Tap-to-Pay (mobile, iOS) | Dev 2 | 3 |
| Cash/check payment recording | Dev 1 | 1 |
| Invoice aging report | Dev 1 | 2 |
| Automated past-due reminders (BullMQ job) | Dev 1 | 2 |
| Partial payments support | Dev 1 | 1 |

### Week 22–23: Inventory
| Task | Owner | Days |
|---|---|---|
| Parts catalog CRUD | Dev 1 | 2 |
| Truck stock management per tech | Dev 1 | 2 |
| Warehouse stock management | Dev 1 | 1 |
| Low stock alerts (push + email) | Dev 1 | 1 |
| Parts usage auto-deducts from truck stock | Dev 1 | 1 |
| Purchase order generation (PDF) | Dev 1 | 2 |

### Week 23–24: Customer Portal
| Task | Owner | Days |
|---|---|---|
| Customer portal Next.js layout + magic link auth | Dev 1 | 2 |
| Portal dashboard: upcoming jobs, estimates, invoices | Dev 1 | 2 |
| Estimate approval UI (portal) | Dev 1 | 1 |
| Invoice view + Stripe payment in portal | Dev 1 | 2 |
| Service history view | Dev 1 | 1 |
| Equipment list with next service due dates | Dev 1 | 1 |
| Self-service booking form → creates lead | Dev 1 | 2 |

### Week 24–25: Internal Chat
| Task | Owner | Days |
|---|---|---|
| Chat UI (web): channel list + message thread | Dev 1 | 3 |
| Chat UI (mobile): DM + job-linked threads | Dev 2 | 3 |
| Socket.io real-time message delivery | Dev 1 | 1 |
| Photo + voice memo messages | Dev 2 | 2 |
| Unread counts + push notifications on new message | Dev 2 | 1 |

### Week 25–26: Service Agreements + Admin Dashboard
| Task | Owner | Days |
|---|---|---|
| Service agreement CRUD + asset coverage | Dev 1 | 3 |
| Renewal reminder email automation (60/30/7 days) | Dev 1 | 1 |
| Agreement → auto-schedule PM visits | Dev 1 | 2 |
| Admin KPI dashboard (recharts) | Dev 1 | 3 |
| Revenue, utilization, job pipeline charts | Dev 1 | 2 |

**Phase 3 Deliverable:** End-to-end business management. Estimates → invoicing → payment in one platform. Customer portal live. Service agreements auto-scheduling PM visits. **Production-ready for market launch.**

---

## Phase 4: Integrations & Polish (Weeks 27–32)

**Goal:** QuickBooks deep integration, payroll systems, app store submission, and launch-ready polish.

### Week 27–28: QuickBooks Integration
| Task | Owner | Days |
|---|---|---|
| QBO OAuth connection flow | Dev 1 | 2 |
| Customer sync (QBO ↔ Prime Air) | Dev 1 | 2 |
| Invoice sync to QBO | Dev 1 | 2 |
| Payment sync from QBO | Dev 1 | 1 |
| Time activities export to QBO | Dev 1 | 2 |
| QBO webhook handling (payment received) | Dev 1 | 1 |
| QuickBooks Desktop sync agent (Electron app or installer) | Dev 2 | 5 |

### Week 28–29: Payroll Integrations
| Task | Owner | Days |
|---|---|---|
| Gusto export format + API integration | Dev 1 | 3 |
| ADP Run export | Dev 1 | 2 |
| Paychex Flex export | Dev 1 | 2 |
| Rippling integration | Dev 2 | 2 |

### Week 29–30: Customer Communication Automation
| Task | Owner | Days |
|---|---|---|
| Appointment reminder SMS (24hr before) | Dev 1 | 1 |
| "Tech en route" SMS with live tracking link | Dev 1 | 1 |
| Live tech tracking page (public, job-duration only) | Dev 1 | 2 |
| Job complete + follow-up survey SMS | Dev 1 | 1 |
| Inbound SMS routing to admin portal | Dev 1 | 2 |
| Online booking widget (embeddable on company website) | Dev 1 | 3 |

### Week 30–31: QA & Polish
| Task | Owner | Days |
|---|---|---|
| Full regression test suite (Vitest + Playwright E2E) | QA | 5 |
| Performance profiling + optimization (Core Web Vitals) | Dev 1 | 3 |
| Offline mode stress testing | Dev 2 | 2 |
| Accessibility audit (WCAG 2.1 AA) | QA | 2 |
| Mobile app performance profiling | Dev 2 | 2 |

### Week 31–32: App Store Submission + Go-Live
| Task | Owner | Days |
|---|---|---|
| App Store assets: icon, screenshots, description | Designer | 3 |
| App Store review submission (Apple) | Dev 2 | 1 |
| Google Play submission | Dev 2 | 1 |
| Production Supabase setup + migration | Dev 1 | 1 |
| DNS, SSL, email domain verification | Dev 1 | 1 |
| Stripe live mode + compliance review | Dev 1 | 2 |
| Beta onboarding: 3–5 HVAC companies | Lead | 5 |
| Beta feedback integration | Dev 1 + Dev 2 | 5 |

---

## Milestone Summary

| Milestone | Week | Description |
|---|---|---|
| Foundation Ready | 3 | Monorepo, auth, CI/CD live |
| Phase 1 Beta | 9 | GPS time tracking, crew map, payroll export |
| First Paying Pilot | 10 | Onboard 1–2 HVAC companies on Phase 1 |
| Phase 2 Beta | 18 | Full work order + dispatch + forms |
| Phase 3 Beta | 26 | Estimates, invoicing, payments, customer portal |
| App Store Submission | 31 | iOS + Android submitted for review |
| Public Launch | 32 | Full production launch, marketing begins |

---

## Budget Estimates

### One-Time Costs
| Item | Cost |
|---|---|
| Apple Developer Account | $99/year |
| Google Play Developer Account | $25 one-time |
| Domain + SSL (Cloudflare) | ~$15/year |
| Design assets (icons, illustrations) | $500–$2,000 |
| Legal: Terms of Service, Privacy Policy | $1,500–$3,000 |
| Stripe Terminal Reader (S700, for demo) | $249 |

### Monthly Infrastructure Costs (Launch Stage, ~50 active companies)
| Service | Monthly Cost |
|---|---|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Upstash Redis | $10 |
| Railway (background workers) | $20 |
| Cloudflare R2 (file storage) | ~$5 |
| Google Maps Platform | ~$50 |
| Twilio (SMS) | ~$30 (varies by usage) |
| Resend (email) | $20 |
| Sentry | $26 |
| Stripe (processing) | 2.9% + $0.30 per transaction |
| **Total infra** | **~$206/month** |

### Revenue Model Assumptions
- Starter: $79/mo base + $8/tech/mo → avg 8 techs = $143/mo per company
- Pro: $149/mo base + $15/tech/mo → avg 8 techs = $269/mo per company
- Break-even: 50 companies on Starter = $7,150 MRR (covers infra + minimal team)
- Growth target: 500 companies by Month 18 = ~$100K MRR

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Apple App Store rejection (GPS background, photos) | Medium | High | Use Apple-compliant privacy strings, submit purpose-built privacy policy, test with TestFlight first |
| Stripe Terminal iOS review | Low | Medium | Stripe handles Apple compliance; Tap-to-Pay requires Apple MFi approval |
| QuickBooks API rate limits | Medium | Medium | Implement exponential backoff + async queue for all QBO requests |
| GPS battery drain complaints | Medium | Medium | Optimize tracking interval; let company configure tracking frequency |
| Offline sync conflicts | Medium | High | Server-authoritative conflict resolution; surface conflicts to user for manual resolution |
| Tech-unfamiliar HVAC users | High | Medium | Simplified mobile UI; in-app video tutorials; phone-based onboarding support |
| Competition from ServiceTitan | Low | Low | ServiceTitan targets enterprise ($1M+ revenue shops); Prime Air targets SMB ($250K–$5M) |
