# EduSpark — CLAUDE.md
> **Read this file at the start of every session before writing any code.**
> This is the single source of truth for architecture, conventions, and decisions.
> Never deviate from these rules without explicit instruction.

---

## 1. What We Are Building

EduSpark is an **AI-native, B2C subscription learning platform** sold to parents.

A child logs in and interacts entirely with an AI tutor — which teaches, sets exercises, marks work, and tracks progress autonomously. Parents receive weekly AI-generated progress reports and have a real-time dashboard. A human Supervisor oversees the AI via an admin console.

**There is no human teacher in the loop for daily operations.** The AI IS the teacher.

### Core personas
| Persona | Role | Primary interface |
|---|---|---|
| Parent | Customer — pays, monitors | Parent dashboard + email reports |
| Child / Student | User — learns daily | Student learning app |
| Supervisor | Governor — oversees AI quality | Admin console |

### Launch market
- **Country:** Australia
- **Curriculum standard:** ACARA (Australian Curriculum, Assessment and Reporting Authority)
- **Year levels:** Year 1 – Year 10 (ages 6–16)
- **Phase 1 subjects:** Mathematics, English
- **Phase 2 subjects:** Science, History, Geography (add after Phase 1 is live)

---

## 2. Technology Stack

### Frontend
| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Use server components by default. Client components only when necessary. |
| Language | TypeScript | Strict mode enabled. No `any` types ever. |
| Styling | Tailwind CSS v3 | Utility classes only. No custom CSS files unless unavoidable. |
| UI components | shadcn/ui | Use shadcn components as the base. Customise with Tailwind. |
| Icons | Lucide React | Consistent icon set throughout. |
| Forms | React Hook Form + Zod | All forms validated with Zod schemas. Never trust raw user input. |
| State | Zustand | For client-side global state only. Prefer server state where possible. |

### Backend
| Layer | Technology | Notes |
|---|---|---|
| API routes | Next.js Route Handlers | `/app/api/` directory. Use server actions for mutations. |
| ORM | Drizzle ORM | Type-safe SQL. Schema lives in `/src/db/schema.ts`. |
| Database | Neon (PostgreSQL) | Serverless Postgres. Use connection pooling URL for app, direct URL for migrations. |
| Vector search | pgvector (via Neon) | For student knowledge graph embeddings. Already available in Neon. |
| Cache / queues | Upstash Redis | Session cache, rate limiting, streak counters, background job queues via BullMQ. |
| File storage | Cloudflare R2 | Student submissions, AI-generated content, report PDFs. |
| Background jobs | BullMQ | Weekly report generation, batch exercise creation, re-scoring. |

### AI Layer
| Model | Use case | Reason |
|---|---|---|
| `claude-haiku-4-5-20251001` | Exercise generation, auto-marking, parent reports, diagnostics | Fast + cheap — use for 80% of all AI calls |
| `claude-sonnet-4-6` | Live tutor chat sessions | Nuanced reasoning for real-time student interaction |

**AI cost rules — always follow these:**
- Use **Haiku** for: generating exercises, marking submissions, writing parent reports, running diagnostics, curriculum planning
- Use **Sonnet** for: live tutoring chat only (streaming responses to the student)
- Always use **prompt caching** (`cache_control: { type: "ephemeral" }`) on system prompts — cache the student profile and curriculum context
- Never call the AI API from a client component — always from server actions or API routes
- Always stream Sonnet responses to the UI using Vercel AI SDK `streamText`

### Auth, Payments, Communications
| Service | Use | Package |
|---|---|---|
| Clerk | Authentication, parent + child sessions, role management | `@clerk/nextjs` |
| Stripe | Subscriptions, billing, webhooks | `stripe`, `@stripe/stripe-js` |
| Resend | Transactional email (weekly reports, alerts) | `resend` |
| Expo Push / OneSignal | Mobile push notifications (Phase 3) | TBD |

### Deployment
| Service | Purpose |
|---|---|
| Vercel | App hosting, edge functions, preview deployments |
| GitHub | Source control — all code committed before sessions end |

---

## 3. Project File Structure

```
/
├── CLAUDE.md                    ← This file — read first every session
├── .env.local                   ← API keys — NEVER commit to Git
├── .env.example                 ← Template with key names, no values
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
│
├── src/
│   ├── app/                     ← Next.js App Router
│   │   ├── (auth)/              ← Auth pages (login, register, consent)
│   │   │   ├── sign-in/
│   │   │   ├── sign-up/
│   │   │   └── consent/
│   │   ├── (parent)/            ← Parent dashboard (protected)
│   │   │   ├── dashboard/
│   │   │   ├── progress/
│   │   │   └── settings/
│   │   ├── (student)/           ← Student learning app (protected)
│   │   │   ├── learn/
│   │   │   ├── tutor/
│   │   │   └── exercises/
│   │   ├── (supervisor)/        ← Supervisor admin console (protected)
│   │   │   ├── dashboard/
│   │   │   ├── queue/
│   │   │   └── guardrails/
│   │   └── api/                 ← API routes
│   │       ├── ai/
│   │       │   ├── tutor/       ← Live tutor streaming endpoint
│   │       │   ├── exercises/   ← Exercise generation
│   │       │   ├── mark/        ← Auto-marking
│   │       │   └── report/      ← Parent report generation
│   │       ├── webhooks/
│   │       │   ├── stripe/
│   │       │   └── clerk/
│   │       └── ...
│   │
│   ├── components/              ← Shared UI components
│   │   ├── ui/                  ← shadcn/ui base components (auto-generated)
│   │   ├── parent/              ← Parent-specific components
│   │   ├── student/             ← Student-specific components
│   │   └── shared/              ← Used across personas
│   │
│   ├── db/
│   │   ├── schema.ts            ← ALL Drizzle table definitions — single source of truth
│   │   ├── index.ts             ← DB connection export
│   │   └── migrations/          ← Auto-generated by Drizzle Kit
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── tutor.ts         ← Sonnet tutor chat logic + system prompt
│   │   │   ├── exercises.ts     ← Haiku exercise generation logic
│   │   │   ├── marking.ts       ← Haiku auto-marking logic
│   │   │   ├── reports.ts       ← Haiku parent report generation
│   │   │   └── prompts/         ← All system prompt templates as .ts files
│   │   ├── stripe.ts            ← Stripe client + helper functions
│   │   ├── resend.ts            ← Email sending functions
│   │   ├── redis.ts             ← Upstash Redis client
│   │   ├── r2.ts                ← Cloudflare R2 client
│   │   └── utils.ts             ← Shared utilities (cn, formatters, etc.)
│   │
│   ├── actions/                 ← Next.js Server Actions (mutations)
│   │   ├── auth.ts
│   │   ├── children.ts
│   │   ├── exercises.ts
│   │   ├── subscriptions.ts
│   │   └── consent.ts
│   │
│   ├── types/                   ← TypeScript type definitions
│   │   ├── db.ts                ← Inferred types from Drizzle schema
│   │   ├── ai.ts                ← AI request/response types
│   │   └── index.ts             ← Shared app types
│   │
│   └── hooks/                   ← Custom React hooks (client only)
│
└── public/                      ← Static assets
```

---

## 4. Database Schema

All tables are defined in `/src/db/schema.ts`. This is the canonical schema for Phase 1.

### Core tables

```typescript
// Parents — the account holders (customers)
parents {
  id: uuid PK
  clerk_id: text UNIQUE          // Clerk user ID
  email: text UNIQUE
  full_name: text
  plan: enum('free_trial', 'explorer', 'scholar', 'family')
  plan_status: enum('active', 'cancelled', 'past_due', 'trialling')
  stripe_customer_id: text
  stripe_subscription_id: text
  trial_ends_at: timestamp
  created_at: timestamp
  updated_at: timestamp
}

// Children — the learners (users)
children {
  id: uuid PK
  parent_id: uuid FK → parents.id
  first_name: text               // ONLY personal data collected from child
  year_level: integer            // 1–10 (ACARA year)
  curriculum: enum('ACARA')      // Phase 1 = ACARA only
  onboarding_complete: boolean
  current_streak: integer
  longest_streak: integer
  last_active_at: timestamp
  created_at: timestamp
}

// Consents — legal record of parental consent
consents {
  id: uuid PK
  parent_id: uuid FK → parents.id
  child_id: uuid FK → children.id
  consent_type: enum('platform_use', 'data_processing', 'ai_interaction')
  agreed: boolean
  agreed_at: timestamp           // Immutable — never update
  ip_address: text               // For audit trail
  user_agent: text
  terms_version: text            // e.g. "v1.0" — track policy versions
}

// Learning sessions — every time a child interacts with the tutor
sessions {
  id: uuid PK
  child_id: uuid FK → children.id
  subject: enum('mathematics', 'english')
  topic: text                    // e.g. "fractions", "comprehension"
  year_level: integer
  session_type: enum('lesson', 'exercise', 'diagnostic', 'revision')
  started_at: timestamp
  ended_at: timestamp
  messages_count: integer        // How many tutor exchanges
  ai_model_used: text            // Track which model was used
  created_at: timestamp
}

// Exercises — individual practice questions
exercises {
  id: uuid PK
  session_id: uuid FK → sessions.id
  child_id: uuid FK → children.id
  subject: enum('mathematics', 'english')
  topic: text
  year_level: integer
  bloom_level: enum('remember', 'understand', 'apply', 'analyse')
  question: text
  correct_answer: text           // Expected/model answer
  student_answer: text
  ai_grade: integer              // 0–100
  ai_grade_confidence: real      // 0.0–1.0 — flag for human review if < 0.7
  ai_feedback: text              // Personalised feedback to student
  supervisor_reviewed: boolean
  supervisor_override_grade: integer
  created_at: timestamp
}

// Mastery scores — the Student Knowledge Graph
mastery_scores {
  id: uuid PK
  child_id: uuid FK → children.id
  subject: enum('mathematics', 'english')
  topic: text                    // Granular topic e.g. "fractions/addition"
  year_level: integer
  mastery_level: real            // 0.0–1.0 (0 = not started, 1 = mastered)
  attempts_count: integer
  last_assessed_at: timestamp
  updated_at: timestamp
  UNIQUE(child_id, subject, topic, year_level)
}

// Parent reports — weekly AI-generated summaries
parent_reports {
  id: uuid PK
  child_id: uuid FK → children.id
  parent_id: uuid FK → parents.id
  week_starting: date
  report_text: text              // Full AI-generated narrative
  highlights: jsonb              // { achievements: [], struggles: [], next_steps: [] }
  supervisor_approved: boolean
  sent_at: timestamp
  created_at: timestamp
}

// Supervisor queue — items flagged for human review
supervisor_queue {
  id: uuid PK
  item_type: enum('grade_review', 'content_review', 'safeguarding', 'parent_complaint')
  reference_id: uuid             // FK to exercises.id, sessions.id, etc.
  reference_table: text
  priority: enum('low', 'medium', 'high', 'urgent')
  reason: text                   // Why it was flagged
  resolved: boolean
  resolved_by: text              // Supervisor user ID
  resolved_at: timestamp
  resolution_note: text
  created_at: timestamp
}
```

### Schema rules
- Always use `uuid` for primary keys — never auto-increment integers
- Always include `created_at` on every table
- Add `updated_at` to tables that get updated (not append-only tables)
- All timestamps are UTC
- Use `jsonb` for flexible structured data (report highlights, session metadata)
- Foreign keys always have explicit `ON DELETE` behaviour defined

---

## 5. AI System Architecture

### Model routing — always follow this

```typescript
// Use this decision rule for every AI call:
const AI_ROUTING = {
  // Haiku — fast, cheap, background tasks
  EXERCISE_GENERATION: 'claude-haiku-4-5-20251001',
  AUTO_MARKING:        'claude-haiku-4-5-20251001',
  PARENT_REPORT:       'claude-haiku-4-5-20251001',
  DIAGNOSTIC:          'claude-haiku-4-5-20251001',
  CURRICULUM_PLANNING: 'claude-haiku-4-5-20251001',

  // Sonnet — reserved for live student interaction only
  LIVE_TUTOR_CHAT:     'claude-sonnet-4-6',
}
```

### Prompt caching rule
Always cache the system prompt on AI calls. The student profile context (name, year level, mastery summary) and the curriculum context are expensive to re-send. Use `cache_control`:

```typescript
const messages = [
  {
    role: 'user',
    content: [
      {
        type: 'text',
        text: systemPromptWithStudentContext,
        cache_control: { type: 'ephemeral' }  // ← always include this
      },
      {
        type: 'text',
        text: userMessage
      }
    ]
  }
]
```

### AI response structure
All AI endpoints return structured JSON for non-streaming calls:

```typescript
// Exercise generation response
{
  question: string
  correct_answer: string
  bloom_level: BloomLevel
  difficulty: number        // 1–10
  hints: string[]           // 3 progressive hints
  explanation: string       // Full worked solution
}

// Marking response
{
  grade: number             // 0–100
  confidence: number        // 0.0–1.0
  feedback: string          // Personalised, encouraging feedback
  correct: boolean
  partial_credit: boolean
  improvement_tip: string
}
```

### Safeguarding rule
If ANY AI response (tutor chat, exercise, marking) contains a confidence score below 0.7 OR any of the safeguarding keywords defined in `/src/lib/ai/prompts/safeguarding-keywords.ts`, automatically insert a row into `supervisor_queue` with priority `'urgent'` BEFORE returning the response to the client.

---

## 6. Authentication & Role System

Clerk manages all authentication. Three roles are defined as Clerk organisation roles:

| Role | Clerk metadata | Access |
|---|---|---|
| `parent` | `role: 'parent'` | `/parent/*` routes, own children's data only |
| `student` | `role: 'student'` | `/student/*` routes, own data only |
| `supervisor` | `role: 'supervisor'` | `/supervisor/*` routes, all data read access |

### Child session rules
- Children do NOT have their own email/password
- A child's session is created by the parent — parent logs in, switches to child view
- Child sessions are scoped with `child_id` stored in Clerk session claims
- A parent can only access data where `parent_id = their own clerk_id`

### Route protection
- All `(parent)`, `(student)`, `(supervisor)` route groups are protected with Clerk middleware
- Never trust client-side role checks — always verify role in server actions and API routes
- Use `auth()` from `@clerk/nextjs/server` in all server-side code

---

## 7. Subscription & Billing Rules

### Plans
```typescript
const PLANS = {
  free_trial:  { price_id: 'price_xxx', children: 1,  trial_days: 7  },
  explorer:    { price_id: 'price_xxx', children: 1,  monthly: 19    },
  scholar:     { price_id: 'price_xxx', children: 1,  monthly: 39    },
  family:      { price_id: 'price_xxx', children: 4,  monthly: 59    },
}
```

### Billing rules
- Always use Stripe Checkout for initial subscription — never build a custom payment form
- Stripe Customer Portal for all plan changes and cancellations — never build this UI
- Listen to these Stripe webhook events:
  - `checkout.session.completed` → activate subscription in DB
  - `customer.subscription.updated` → update plan in DB
  - `customer.subscription.deleted` → set status to `cancelled` in DB
  - `invoice.payment_failed` → set status to `past_due`, send parent email
- Always verify Stripe webhook signatures — never process unverified webhooks
- Store `stripe_customer_id` and `stripe_subscription_id` on the `parents` table

### Access control by plan
```typescript
// Check this in server actions before allowing AI calls
function canAccessSubject(plan: Plan, subject: string): boolean {
  if (plan === 'free_trial' || plan === 'explorer') {
    return ['mathematics', 'english'].includes(subject)
  }
  return true  // scholar and family get all subjects
}
```

---

## 8. Coding Conventions

### TypeScript rules
- Strict mode always on (`"strict": true` in tsconfig)
- No `any` types — use `unknown` and narrow, or define proper types
- All Drizzle table types inferred with `typeof table.$inferSelect` and `$inferInsert`
- Zod schemas for all API input validation — no raw request body access

### Component rules
- Server components by default — add `'use client'` only when needed
- Never fetch data in client components — use server components or server actions
- Keep components small — if a component exceeds 150 lines, split it
- Co-locate component-specific types with the component file

### Server action rules
- All data mutations go through server actions in `/src/actions/`
- Always validate input with Zod at the top of every server action
- Always check auth at the top of every server action — `const { userId } = auth()`
- Return typed responses: `{ success: true, data: T }` or `{ success: false, error: string }`
- Never expose raw database errors to the client

### API route rules
- Use for: Stripe webhooks (need raw body), streaming AI responses, external service callbacks
- Everything else → server actions
- Always return proper HTTP status codes
- Always handle errors gracefully — never let a 500 reach the client unhandled

### Database rules
- All queries through Drizzle — no raw SQL strings
- Always use transactions for multi-table writes
- Never expose database IDs in URLs — use UUIDs (already enforced by schema)
- Add indexes on any column used in WHERE clauses: `parent_id`, `child_id`, `subject`, `topic`

### Naming conventions
```
Files:          kebab-case        (user-profile.tsx, exercise-card.tsx)
Components:     PascalCase        (UserProfile, ExerciseCard)
Functions:      camelCase         (generateExercise, markSubmission)
Constants:      SCREAMING_SNAKE   (MAX_CHILDREN_PER_PLAN, AI_MODELS)
DB tables:      snake_case        (mastery_scores, parent_reports)
DB columns:     snake_case        (created_at, year_level)
Env vars:       SCREAMING_SNAKE   (ANTHROPIC_API_KEY, STRIPE_SECRET_KEY)
```

### Error handling
- Use try/catch in all server actions and API routes
- Log errors server-side with context (user ID, action name, input summary)
- Never log sensitive data (passwords, API keys, full request bodies)
- Return user-friendly error messages — never raw error objects

---

## 9. Environment Variables

These must exist in `.env.local` before any development starts.
Never commit `.env.local` to Git — it is in `.gitignore`.

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_NAME=EduSpark

# Anthropic AI
ANTHROPIC_API_KEY=

# Database (Neon)
DATABASE_URL=                    # Pooled connection (for app)
DATABASE_URL_UNPOOLED=           # Direct connection (for migrations)

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Payments (Stripe)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@yourdomain.com

# Cache (Upstash Redis)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# File storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

---

## 10. Build Order for Phase 1

Complete these in order. Do not skip ahead.

```
Week 1 — Foundation
  Day 1:  [ ] Drizzle schema (all tables above) + Neon connection
  Day 1:  [ ] Run first migration, verify tables in Neon console
  Day 2:  [ ] Clerk auth setup — sign-up, sign-in, middleware
  Day 2:  [ ] Parent registration flow (4 screens per the mockup)
  Day 3:  [ ] Consent flow + consent table writes
  Day 3:  [ ] Stripe subscription — Checkout, webhook handler, plan activation
  Day 4:  [ ] Child profile creation (name + grade only)
  Day 4:  [ ] Parent dashboard shell — layout, nav, empty states

Week 2 — AI Core
  Day 5:  [ ] AI diagnostic — Haiku generates questions, builds initial mastery_scores
  Day 6:  [ ] Exercise generation API — Haiku, per subject + topic + year level
  Day 7:  [ ] Student learning UI — exercise display, answer submission
  Day 8:  [ ] Auto-marking API — Haiku marks submission, writes to exercises table
  Day 8:  [ ] Confidence flagging → supervisor_queue insert when confidence < 0.7
  Day 9:  [ ] Live tutor chat — Sonnet streaming, session tracking
  Day 10: [ ] Mastery score updates after each exercise

Week 3 — Parent & Supervisor
  Day 11: [ ] Parent dashboard — progress charts, recent activity, mastery map
  Day 12: [ ] Weekly report generation — Haiku, parent_reports table, Resend email
  Day 13: [ ] Supervisor console — queue view, grade override, approve/reject
  Day 14: [ ] Streak system — calculate + display streak, Redis for fast access
  Day 15: [ ] End-to-end test — full parent → child → AI → marking → report flow

Week 4 — Polish & Beta
  Day 16: [ ] Mobile responsive passes on all key screens
  Day 17: [ ] Error states, loading states, empty states everywhere
  Day 18: [ ] Stripe portal (plan changes + cancellation)
  Day 19: [ ] Beta onboarding — invite 20 families, collect feedback
  Day 20: [ ] Fix top 10 issues from beta feedback
```

---

## 11. What Claude Code Should Never Do

- Never use `any` TypeScript type
- Never write raw SQL strings — always use Drizzle query builder
- Never put API keys or secrets in code — always use environment variables
- Never trust client-side data in server actions — always re-validate
- Never call Anthropic API from a client component
- Never store the child's date of birth, email, or photo — not collected
- Never display a raw database error to the user
- Never commit `.env.local` or any file containing real API keys
- Never create a new component over 150 lines without splitting it
- Never use `localStorage` or `sessionStorage` for sensitive data
- Never skip the Stripe webhook signature verification
- Never process AI output as trusted — always sanitise before rendering

---

## 12. Quick Reference — Key Commands

```bash
# Development
npm run dev                          # Start dev server

# Database
npx drizzle-kit generate             # Generate migration from schema changes
npx drizzle-kit migrate              # Run pending migrations
npx drizzle-kit studio               # Open Drizzle Studio (DB browser)

# Code quality
npm run lint                         # ESLint
npm run typecheck                    # TypeScript type check
npm run build                        # Production build check

# Stripe (local webhook testing)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

*Last updated: Phase 1 kickoff*
*Product: EduSpark — AI-native learning platform*
*Stack: Next.js 15 · TypeScript · Claude AI · Neon · Clerk · Stripe · Vercel*
