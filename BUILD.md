# EduSpark — Complete Build Specification
> **For Claude Code:** Read this entire document before writing a single line of code.
> Execute every section in order. Verify each section before proceeding to the next.
> This document builds the complete EduSpark AI-native learning platform from scratch.

---

## HOW TO USE THIS DOCUMENT

You are Claude Code. Your job is to build the complete EduSpark platform by following
this document from top to bottom. Every section has a clear task, exact code to produce,
and a verification checklist. Do not skip ahead. Do not build section 3 before section 2
is verified. Ask for confirmation after each major section if unsure.

The product: An AI-native B2C subscription learning platform.
- Parents subscribe and pay
- Children learn through an AI tutor called Lumi
- A human Supervisor oversees the AI via an admin console
- No human teacher in the daily loop — Lumi IS the teacher

---

## SECTION 0 — PREREQUISITES (verify before starting)

Before writing any code, confirm these files exist in the project:
- `CLAUDE.md` in the project root
- `src/lib/ai/prompts/tutor.ts`
- `.env.local` with all API keys filled in

If any are missing, stop and tell the user which file is missing.

---

## SECTION 1 — PROJECT INITIALISATION

### 1.1 Install all dependencies

Run these commands in order:

```bash
npm install drizzle-orm @neondatabase/serverless drizzle-kit
npm install @clerk/nextjs stripe @stripe/stripe-js
npm install @anthropic-ai/sdk ai
npm install resend @upstash/redis bullmq
npm install react-hook-form zod @hookform/resolvers
npm install zustand lucide-react recharts date-fns
npm install -D @types/node tsx
npx shadcn@latest init --defaults
npx shadcn@latest add button input label select textarea card badge progress avatar separator skeleton tabs
```

### 1.2 Create project configuration files

**File: `drizzle.config.ts`**
```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
} satisfies Config
```

**File: `next.config.ts`**
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig
```

**File: `src/middleware.ts`**
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

### 1.3 Verification
- [ ] `npm run dev` starts without errors
- [ ] shadcn/ui components are in `src/components/ui/`
- [ ] `drizzle.config.ts` exists in project root

---

## SECTION 2 — DATABASE SCHEMA

### 2.1 Create database connection

**File: `src/db/index.ts`**
```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })

export * from './schema'
```

### 2.2 Create complete schema

**File: `src/db/schema.ts`**
```typescript
import {
  pgTable, uuid, text, integer, real, boolean,
  timestamp, date, jsonb, pgEnum, uniqueIndex, index
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────
export const planEnum = pgEnum('plan', ['free_trial', 'explorer', 'scholar', 'family'])
export const planStatusEnum = pgEnum('plan_status', ['trialling', 'active', 'cancelled', 'past_due'])
export const curriculumEnum = pgEnum('curriculum', ['ACARA'])
export const subjectEnum = pgEnum('subject', ['mathematics', 'english', 'science', 'history', 'geography'])
export const sessionTypeEnum = pgEnum('session_type', ['lesson', 'exercise', 'diagnostic', 'revision'])
export const bloomEnum = pgEnum('bloom_level', ['remember', 'understand', 'apply', 'analyse'])
export const consentTypeEnum = pgEnum('consent_type', ['platform_use', 'data_processing', 'ai_interaction'])
export const queueItemTypeEnum = pgEnum('queue_item_type', ['grade_review', 'content_review', 'safeguarding', 'parent_complaint'])
export const queuePriorityEnum = pgEnum('queue_priority', ['low', 'medium', 'high', 'urgent'])

// ─── Parents ──────────────────────────────────────────────────────────────────
export const parents = pgTable('parents', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').unique().notNull(),
  fullName: text('full_name').notNull(),
  plan: planEnum('plan').default('free_trial').notNull(),
  planStatus: planStatusEnum('plan_status').default('trialling').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  trialEndsAt: timestamp('trial_ends_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Children ─────────────────────────────────────────────────────────────────
export const children = pgTable('children', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id').references(() => parents.id, { onDelete: 'cascade' }).notNull(),
  firstName: text('first_name').notNull(),
  yearLevel: integer('year_level').notNull(),
  curriculum: curriculumEnum('curriculum').default('ACARA').notNull(),
  onboardingComplete: boolean('onboarding_complete').default(false).notNull(),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastActiveAt: timestamp('last_active_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  parentIdx: index('children_parent_idx').on(t.parentId),
}))

// ─── Consents ─────────────────────────────────────────────────────────────────
export const consents = pgTable('consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id').references(() => parents.id, { onDelete: 'cascade' }).notNull(),
  childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }).notNull(),
  consentType: consentTypeEnum('consent_type').notNull(),
  agreed: boolean('agreed').default(true).notNull(),
  agreedAt: timestamp('agreed_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  termsVersion: text('terms_version').default('v1.0').notNull(),
})

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }).notNull(),
  subject: subjectEnum('subject').notNull(),
  topic: text('topic').notNull(),
  yearLevel: integer('year_level').notNull(),
  sessionType: sessionTypeEnum('session_type').notNull(),
  messagesCount: integer('messages_count').default(0).notNull(),
  aiModelUsed: text('ai_model_used'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  childIdx: index('sessions_child_idx').on(t.childId),
}))

// ─── Exercises ────────────────────────────────────────────────────────────────
export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }).notNull(),
  subject: subjectEnum('subject').notNull(),
  topic: text('topic').notNull(),
  yearLevel: integer('year_level').notNull(),
  bloomLevel: bloomEnum('bloom_level').default('understand').notNull(),
  question: text('question').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  hints: jsonb('hints').$type<string[]>().default([]).notNull(),
  explanation: text('explanation').notNull(),
  studentAnswer: text('student_answer'),
  aiGrade: integer('ai_grade'),
  aiGradeConfidence: real('ai_grade_confidence'),
  aiFeedback: text('ai_feedback'),
  supervisorReviewed: boolean('supervisor_reviewed').default(false).notNull(),
  supervisorOverrideGrade: integer('supervisor_override_grade'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  childIdx: index('exercises_child_idx').on(t.childId),
  subjectIdx: index('exercises_subject_idx').on(t.subject, t.topic),
}))

// ─── Mastery Scores ───────────────────────────────────────────────────────────
export const masteryScores = pgTable('mastery_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }).notNull(),
  subject: subjectEnum('subject').notNull(),
  topic: text('topic').notNull(),
  yearLevel: integer('year_level').notNull(),
  masteryLevel: real('mastery_level').default(0).notNull(),
  attemptsCount: integer('attempts_count').default(0).notNull(),
  lastAssessedAt: timestamp('last_assessed_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  childSubjectIdx: index('mastery_child_subject_idx').on(t.childId, t.subject),
  uniqueTopicIdx: uniqueIndex('mastery_unique_topic_idx').on(t.childId, t.subject, t.topic, t.yearLevel),
}))

// ─── Parent Reports ───────────────────────────────────────────────────────────
export const parentReports = pgTable('parent_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }).notNull(),
  parentId: uuid('parent_id').references(() => parents.id, { onDelete: 'cascade' }).notNull(),
  weekStarting: date('week_starting').notNull(),
  reportText: text('report_text').notNull(),
  highlights: jsonb('highlights').$type<{
    achievements: string[]
    struggles: string[]
    nextSteps: string[]
  }>().notNull(),
  supervisorApproved: boolean('supervisor_approved').default(false).notNull(),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Supervisor Queue ─────────────────────────────────────────────────────────
export const supervisorQueue = pgTable('supervisor_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemType: queueItemTypeEnum('item_type').notNull(),
  referenceId: uuid('reference_id').notNull(),
  referenceTable: text('reference_table').notNull(),
  priority: queuePriorityEnum('priority').default('medium').notNull(),
  reason: text('reason').notNull(),
  resolved: boolean('resolved').default(false).notNull(),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  resolutionNote: text('resolution_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  resolvedIdx: index('queue_resolved_idx').on(t.resolved, t.priority),
}))

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type Parent = typeof parents.$inferSelect
export type NewParent = typeof parents.$inferInsert
export type Child = typeof children.$inferSelect
export type NewChild = typeof children.$inferInsert
export type Consent = typeof consents.$inferSelect
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Exercise = typeof exercises.$inferSelect
export type NewExercise = typeof exercises.$inferInsert
export type MasteryScore = typeof masteryScores.$inferSelect
export type ParentReport = typeof parentReports.$inferSelect
export type SupervisorQueueItem = typeof supervisorQueue.$inferSelect
```

### 2.3 Run migration

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 2.4 Verification
- [ ] All 8 tables created in Neon console
- [ ] `npx drizzle-kit studio` shows all tables with correct columns
- [ ] No TypeScript errors in schema.ts

---

## SECTION 3 — AUTHENTICATION (Clerk)

### 3.1 Update middleware (already done in Section 1)

### 3.2 Create auth pages

**File: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`**
```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignIn />
    </div>
  )
}
```

**File: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`**
```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignUp />
    </div>
  )
}
```

### 3.3 Create Clerk webhook handler

**File: `src/app/api/webhooks/clerk/route.ts`**
```typescript
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db, parents } from '@/db'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) throw new Error('Missing CLERK_WEBHOOK_SECRET')

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses[0]?.email_address ?? ''
    const fullName = [first_name, last_name].filter(Boolean).join(' ') || 'Parent'
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.insert(parents).values({
      clerkId: id,
      email,
      fullName,
      plan: 'free_trial',
      planStatus: 'trialling',
      trialEndsAt,
    })
  }

  return new Response('OK', { status: 200 })
}
```

### 3.4 Create auth server actions

**File: `src/actions/auth.ts`**
```typescript
'use server'

import { auth } from '@clerk/nextjs/server'
import { db, parents, children } from '@/db'
import { eq } from 'drizzle-orm'

export async function getCurrentParent() {
  const { userId } = await auth()
  if (!userId) return null
  const [parent] = await db.select().from(parents).where(eq(parents.clerkId, userId))
  return parent ?? null
}

export async function getChildrenForParent() {
  const parent = await getCurrentParent()
  if (!parent) return []
  return db.select().from(children).where(eq(children.parentId, parent.id))
}
```

### 3.5 Verification
- [ ] `/sign-in` and `/sign-up` pages render Clerk components
- [ ] Clerk webhook URL added in Clerk dashboard: `{your-url}/api/webhooks/clerk`
- [ ] Signing up creates a row in the `parents` table

---

## SECTION 4 — STRIPE BILLING

### 4.1 Create Stripe client

**File: `src/lib/stripe.ts`**
```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export const PLANS = {
  explorer: {
    priceId: process.env.STRIPE_EXPLORER_PRICE_ID!,
    name: 'Explorer',
    price: 19,
    maxChildren: 1,
  },
  scholar: {
    priceId: process.env.STRIPE_SCHOLAR_PRICE_ID!,
    name: 'Scholar',
    price: 39,
    maxChildren: 1,
  },
  family: {
    priceId: process.env.STRIPE_FAMILY_PRICE_ID!,
    name: 'Family',
    price: 59,
    maxChildren: 4,
  },
}
```

### 4.2 Create Stripe webhook handler

**File: `src/app/api/webhooks/stripe/route.ts`**
```typescript
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { db, parents } from '@/db'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const headerPayload = await headers()
  const signature = headerPayload.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const parentId = session.metadata?.parentId
      if (!parentId) break
      await db.update(parents)
        .set({
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          plan: session.metadata?.plan as any ?? 'scholar',
          planStatus: 'active',
          updatedAt: new Date(),
        })
        .where(eq(parents.id, parentId))
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      await db.update(parents)
        .set({ planStatus: sub.status === 'active' ? 'active' : 'past_due', updatedAt: new Date() })
        .where(eq(parents.stripeSubscriptionId, sub.id))
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await db.update(parents)
        .set({ planStatus: 'cancelled', updatedAt: new Date() })
        .where(eq(parents.stripeSubscriptionId, sub.id))
      break
    }
  }

  return new Response('OK', { status: 200 })
}
```

### 4.3 Billing server actions

**File: `src/actions/subscriptions.ts`**
```typescript
'use server'

import { stripe, PLANS } from '@/lib/stripe'
import { getCurrentParent } from './auth'
import { redirect } from 'next/navigation'

export async function createCheckoutSession(plan: keyof typeof PLANS) {
  const parent = await getCurrentParent()
  if (!parent) redirect('/sign-in')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent/billing`,
    metadata: { parentId: parent.id, plan },
  })

  redirect(session.url!)
}

export async function createPortalSession() {
  const parent = await getCurrentParent()
  if (!parent?.stripeCustomerId) redirect('/parent/billing')

  const session = await stripe.billingPortal.sessions.create({
    customer: parent.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/parent/billing`,
  })

  redirect(session.url)
}
```

### 4.4 Verification
- [ ] Stripe webhook endpoint added in Stripe dashboard
- [ ] Test checkout with Stripe test card `4242 4242 4242 4242`
- [ ] Plan updates in `parents` table after checkout

---

## SECTION 5 — ONBOARDING FLOW (4 screens)

### 5.1 Onboarding layout

**File: `src/app/(auth)/onboarding/layout.tsx`**
```typescript
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#534AB7] mb-3">
            <span className="text-white text-lg">✨</span>
          </div>
          <h1 className="text-xl font-medium text-gray-900">EduSpark</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
```

### 5.2 Child profile screen

**File: `src/app/(auth)/onboarding/child-profile/page.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createChildProfile } from '@/actions/children'

const YEAR_LEVELS = [
  { value: '1', label: 'Year 1  (age 6–7)' },
  { value: '2', label: 'Year 2  (age 7–8)' },
  { value: '3', label: 'Year 3  (age 8–9)' },
  { value: '4', label: 'Year 4  (age 9–10)' },
  { value: '5', label: 'Year 5  (age 10–11)' },
  { value: '6', label: 'Year 6  (age 11–12)' },
  { value: '7', label: 'Year 7  (age 12–13)' },
  { value: '8', label: 'Year 8  (age 13–14)' },
  { value: '9', label: 'Year 9  (age 14–15)' },
  { value: '10', label: 'Year 10  (age 15–16)' },
]

export default function ChildProfilePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [loading, setLoading] = useState(false)

  const canContinue = firstName.trim().length > 0 && yearLevel !== ''

  async function handleSubmit() {
    if (!canContinue) return
    setLoading(true)
    await createChildProfile(firstName.trim(), parseInt(yearLevel))
    router.push('/onboarding/consent')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      <div className="w-full bg-gray-100 rounded-full h-1 mb-8">
        <div className="bg-[#534AB7] h-1 rounded-full w-1/3" />
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-1">Tell us about your child</h2>
      <p className="text-sm text-gray-500 mb-6">Just two things — that's all Lumi needs to get started.</p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="firstName" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Child's first name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Jamie"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">School grade / year level</Label>
          <Select onValueChange={setYearLevel}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select grade..." />
            </SelectTrigger>
            <SelectContent>
              {YEAR_LEVELS.map((y) => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-4">
        We only collect your child's first name and grade. No email, date of birth, or photo required.
      </p>

      <Button
        onClick={handleSubmit}
        disabled={!canContinue || loading}
        className="w-full mt-6 bg-[#534AB7] hover:bg-[#3C3489]"
      >
        {loading ? 'Saving...' : 'Continue →'}
      </Button>
    </div>
  )
}
```

### 5.3 Consent screen

**File: `src/app/(auth)/onboarding/consent/page.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { recordConsent } from '@/actions/consent'

export default function ConsentPage() {
  const router = useRouter()
  const [c1, setC1] = useState(false)
  const [c2, setC2] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAgree() {
    setLoading(true)
    await recordConsent()
    router.push('/onboarding/complete')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      <div className="w-full bg-gray-100 rounded-full h-1 mb-8">
        <div className="bg-[#534AB7] h-1 rounded-full w-2/3" />
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-1">One important step</h2>
      <p className="text-sm text-gray-500 mb-4">Your consent is required before your child uses the platform.</p>

      <div className="border border-gray-200 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto bg-gray-50">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong className="text-gray-900">Parental Consent Agreement</strong><br /><br />
          By ticking the boxes below, you confirm that you are the parent or legal guardian of the child named in this account, and you are at least 18 years old.<br /><br />
          You give permission for your child to use this AI-powered learning platform, including interacting with Lumi (our AI tutor), completing AI-generated exercises, and receiving AI-assessed feedback.<br /><br />
          You understand that all tutoring sessions are conducted by an AI, overseen by a qualified human Supervisor who reviews flagged content and can intervene at any time.<br /><br />
          The platform collects only your child's first name, school grade, and learning activity data. No other personal data is collected from your child.<br /><br />
          You can view all data, request deletion, or close the account at any time from your parent dashboard.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'c1', checked: c1, onChange: setC1, label: 'I am the parent or legal guardian of this child and I give my consent for them to use this platform.' },
          { id: 'c2', checked: c2, onChange: setC2, label: 'I have read and agree to the Privacy Policy and Terms of Service.' },
        ].map(({ id, checked, onChange, label }) => (
          <label key={id} className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => onChange(!checked)}
              className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center cursor-pointer transition-colors ${checked ? 'bg-[#534AB7] border-[#534AB7]' : 'border-gray-300'}`}
            >
              {checked && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <span className="text-xs text-gray-600 leading-relaxed">{label}</span>
          </label>
        ))}
      </div>

      <Button
        onClick={handleAgree}
        disabled={!c1 || !c2 || loading}
        className="w-full bg-[#534AB7] hover:bg-[#3C3489]"
      >
        {loading ? 'Recording consent...' : 'I agree — start the free trial →'}
      </Button>
    </div>
  )
}
```

### 5.4 Complete screen

**File: `src/app/(auth)/onboarding/complete/page.tsx`**
```typescript
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getChildrenForParent } from '@/actions/auth'

export default async function CompletePage() {
  const children = await getChildrenForParent()
  const child = children[0]
  if (!child) redirect('/onboarding/child-profile')

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      <div className="w-full bg-gray-100 rounded-full h-1 mb-8">
        <div className="bg-[#534AB7] h-1 rounded-full w-full" />
      </div>
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-emerald-700 text-2xl font-bold">✓</span>
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-2">You're all set!</h2>
      <p className="text-sm text-gray-500 mb-6">
        Your 7-day free trial has started. Let's build {child.firstName}'s personalised learning plan.
      </p>
      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#EEEDFE] flex items-center justify-center text-[#534AB7] font-medium text-sm">
          {child.firstName[0].toUpperCase()}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900">{child.firstName}</p>
          <p className="text-xs text-gray-500">Year {child.yearLevel} — ACARA</p>
        </div>
      </div>
      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6">
        Lumi will now run a short, friendly diagnostic to understand exactly where {child.firstName} is — and build their learning path from there.
      </p>
      <Link href="/student/diagnostic">
        <Button className="w-full bg-[#534AB7] hover:bg-[#3C3489]">
          Start Lumi's diagnostic →
        </Button>
      </Link>
    </div>
  )
}
```

### 5.5 Onboarding server actions

**File: `src/actions/children.ts`**
```typescript
'use server'

import { db, children } from '@/db'
import { getCurrentParent } from './auth'

export async function createChildProfile(firstName: string, yearLevel: number) {
  const parent = await getCurrentParent()
  if (!parent) throw new Error('Not authenticated')

  const [child] = await db.insert(children).values({
    parentId: parent.id,
    firstName,
    yearLevel,
    curriculum: 'ACARA',
  }).returning()

  return child
}
```

**File: `src/actions/consent.ts`**
```typescript
'use server'

import { headers } from 'next/headers'
import { db, consents } from '@/db'
import { getCurrentParent, getChildrenForParent } from './auth'

export async function recordConsent() {
  const parent = await getCurrentParent()
  const children = await getChildrenForParent()
  const child = children[0]
  if (!parent || !child) throw new Error('Missing parent or child')

  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for') ?? 'unknown'
  const userAgent = headersList.get('user-agent') ?? 'unknown'

  const consentTypes = ['platform_use', 'data_processing', 'ai_interaction'] as const

  await db.insert(consents).values(
    consentTypes.map((consentType) => ({
      parentId: parent.id,
      childId: child.id,
      consentType,
      agreed: true,
      ipAddress,
      userAgent,
      termsVersion: 'v1.0',
    }))
  )
}
```

### 5.6 Verification
- [ ] Sign-up → onboarding flow completes end-to-end
- [ ] `children` table has a row after step 1
- [ ] `consents` table has 3 rows (one per consent type) after step 2
- [ ] Complete screen shows child's name and year level correctly

---

## SECTION 6 — AI DIAGNOSTIC

**File: `src/app/api/ai/diagnostic/route.ts`**
```typescript
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db, masteryScores, sessions } from '@/db'
import { eq } from 'drizzle-orm'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { childId, yearLevel, subject, previousQA } = await req.json()

  const isComplete = previousQA.length >= 8

  const systemPrompt = `You are Lumi, a warm AI tutor. Run a gentle adaptive diagnostic for a Year ${yearLevel} student on ${subject}.

${isComplete ? `
The diagnostic is complete. Based on these Q&A pairs, respond with ONLY valid JSON:
{
  "topicScores": [{"topic": string, "estimatedMastery": number}],
  "recommendedStartingTopic": string,
  "overallLevel": number
}
No other text. Only JSON.
` : `
Ask ONE question at a time. Start at mid-difficulty for Year ${yearLevel}.
If the previous answer was correct, increase difficulty slightly.
If incorrect, decrease difficulty.
Frame questions conversationally and encouragingly.
Never say "diagnostic" or "test" — say "I'd love to find out what you know".
Respond with just the question — no preamble.
`}`

  const messages = previousQA.map((qa: { role: string; content: string }) => ({
    role: qa.role as 'user' | 'assistant',
    content: qa.content,
  }))

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: messages.length > 0 ? messages : [{ role: 'user', content: 'Start the diagnostic' }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  if (isComplete) {
    try {
      const result = JSON.parse(text)
      const sessionId = crypto.randomUUID()

      await db.insert(sessions).values({
        id: sessionId,
        childId,
        subject,
        topic: result.recommendedStartingTopic,
        yearLevel,
        sessionType: 'diagnostic',
        aiModelUsed: 'claude-haiku-4-5-20251001',
      })

      if (result.topicScores?.length > 0) {
        await db.insert(masteryScores).values(
          result.topicScores.map((ts: { topic: string; estimatedMastery: number }) => ({
            childId,
            subject,
            topic: ts.topic,
            yearLevel,
            masteryLevel: Math.max(0, Math.min(1, ts.estimatedMastery)),
          }))
        ).onConflictDoUpdate({
          target: [masteryScores.childId, masteryScores.subject, masteryScores.topic, masteryScores.yearLevel],
          set: { masteryLevel: masteryScores.masteryLevel, updatedAt: new Date() },
        })
      }

      return Response.json({ complete: true, result })
    } catch {
      return Response.json({ complete: false, message: text })
    }
  }

  return Response.json({ complete: false, message: text })
}
```

**File: `src/app/(student)/diagnostic/page.tsx`**
```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getChildrenForParent } from '@/actions/auth'

type Message = { role: 'user' | 'assistant'; content: string }

export default function DiagnosticPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [childId, setChildId] = useState<string | null>(null)
  const [yearLevel, setYearLevel] = useState(5)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/ai/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: 'temp', yearLevel: 5, subject: 'mathematics', previousQA: [] }),
      })
      const data = await res.json()
      setMessages([{ role: 'assistant', content: data.message }])
    }
    init()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)
    setLoading(true)
    const newCount = questionCount + 1
    setQuestionCount(newCount)

    const res = await fetch('/api/ai/diagnostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: childId ?? 'temp',
        yearLevel,
        subject: 'mathematics',
        previousQA: newMessages,
      }),
    })
    const data = await res.json()

    if (data.complete) {
      router.push('/student/learn')
      return
    }

    setMessages([...newMessages, { role: 'assistant', content: data.message }])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm">✨</div>
        <div>
          <p className="text-sm font-medium text-gray-900">Lumi</p>
          <p className="text-xs text-gray-500">Question {Math.min(questionCount + 1, 8)} of 8</p>
        </div>
        <div className="ml-auto w-24 bg-gray-100 rounded-full h-1.5">
          <div className="bg-[#534AB7] h-1.5 rounded-full transition-all" style={{ width: `${(questionCount / 8) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs flex-shrink-0 mt-1">✨</div>
            )}
            <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-[#534AB7] text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs">✨</div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your answer..."
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={!input.trim() || loading} className="bg-[#534AB7] hover:bg-[#3C3489]">
          Send
        </Button>
      </div>
    </div>
  )
}
```

---

## SECTION 7 — LIVE LUMI TUTOR CHAT

**File: `src/app/api/ai/tutor/route.ts`**
```typescript
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db, sessions, masteryScores, supervisorQueue, children } from '@/db'
import { eq, and } from 'drizzle-orm'
import { buildTutorSystemPrompt } from '@/lib/ai/prompts/tutor'
import { scanForSafeguardingKeywords } from '@/lib/ai/prompts/tutor'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { childId, sessionId, message, conversationHistory } = await req.json()

  // Safeguarding scan BEFORE sending to Claude
  if (scanForSafeguardingKeywords(message)) {
    await db.insert(supervisorQueue).values({
      itemType: 'safeguarding',
      referenceId: sessionId,
      referenceTable: 'sessions',
      priority: 'urgent',
      reason: 'Safeguarding keyword detected in student message',
    })
  }

  // Fetch child context
  const [child] = await db.select().from(children).where(eq(children.id, childId))
  if (!child) return new Response('Child not found', { status: 404 })

  const topicScores = await db.select().from(masteryScores)
    .where(and(eq(masteryScores.childId, childId)))
    .limit(20)

  const recentWins = topicScores
    .filter(s => s.masteryLevel >= 0.85)
    .map(s => s.topic)
    .slice(0, 3)

  const recentStruggles = topicScores
    .filter(s => s.masteryLevel < 0.5)
    .map(s => s.topic)
    .slice(0, 3)

  const currentTopic = topicScores[0]?.topic ?? 'general'
  const masteryLevel = topicScores[0]?.masteryLevel ?? 0

  const studentContext = {
    firstName: child.firstName,
    yearLevel: child.yearLevel,
    subject: 'mathematics' as const,
    currentTopic,
    masteryLevel,
    sessionType: 'lesson' as const,
    recentStruggles,
    recentWins,
    streakDays: child.currentStreak,
    totalSessionsCount: 1,
  }

  const systemPrompt = buildTutorSystemPrompt(studentContext)

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }] as any,
    messages: [
      ...conversationHistory,
      { role: 'user', content: message },
    ],
  })

  // Increment message count
  await db.update(sessions)
    .set({ messagesCount: sessions.messagesCount })
    .where(eq(sessions.id, sessionId))

  const response = stream.toReadableStream()
  return new Response(response, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}
```

**File: `src/app/(student)/tutor/page.tsx`**
```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

type Message = { role: 'user' | 'assistant'; content: string }

export default function TutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Lumi ✨ I'm here to help you learn. What would you like to work on today, or shall we pick up where we left off?" }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || streaming) return
    const userMessage = input.trim()
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setStreaming(true)

    const assistantMessage: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMessage])

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: 'temp',
          sessionId: 'temp',
          message: userMessage,
          conversationHistory: newMessages.slice(-10),
        }),
      })

      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullText += data.delta.text
              setMessages([...newMessages, { role: 'assistant', content: fullText }])
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/student/learn" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm">✨</div>
        <div>
          <p className="text-sm font-medium text-gray-900">Lumi</p>
          <p className="text-xs text-gray-500">Your AI tutor</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm flex-shrink-0 mt-1">✨</div>
            )}
            <div className={`max-w-sm rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#534AB7] text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
              {msg.content || (streaming && i === messages.length - 1 ? (
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              ) : '')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-4 max-w-2xl mx-auto w-full flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask Lumi anything..."
          className="flex-1"
          disabled={streaming}
        />
        <Button onClick={sendMessage} disabled={!input.trim() || streaming} className="bg-[#534AB7] hover:bg-[#3C3489]">
          {streaming ? '...' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
```

---

## SECTION 8 — EXERCISE GENERATION + MARKING

**File: `src/app/api/ai/exercises/route.ts`**
```typescript
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { subject, topic, yearLevel, masteryLevel, count = 3 } = await req.json()

  const difficulty = masteryLevel < 0.4 ? 'beginner' : masteryLevel < 0.7 ? 'intermediate' : 'advanced'

  const systemPrompt = `You are Lumi's exercise generator. Create ${count} ${difficulty} ${subject} exercises for a Year ${yearLevel} student on the topic: ${topic}.

Respond with ONLY a valid JSON array. No other text. Format:
[{
  "question": "string",
  "correct_answer": "string",
  "bloom_level": "remember|understand|apply|analyse",
  "difficulty": 1-10,
  "hints": ["hint1", "hint2", "hint3"],
  "explanation": "full worked solution"
}]

Rules:
- Make each question unique
- Hints should be progressive (small → bigger → near-answer)
- Explanation shows complete working
- Language appropriate for Year ${yearLevel}`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }] as any,
    messages: [{ role: 'user', content: `Generate ${count} exercises on ${topic} for Year ${yearLevel} ${subject}` }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'

  try {
    const exercises = JSON.parse(text)
    return Response.json({ exercises })
  } catch {
    return Response.json({ exercises: [] }, { status: 500 })
  }
}
```

**File: `src/app/api/ai/mark/route.ts`**
```typescript
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db, exercises, masteryScores, supervisorQueue } from '@/db'
import { eq, and } from 'drizzle-orm'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { exerciseId, childId, question, correctAnswer, studentAnswer, subject, topic, yearLevel, bloomLevel } = await req.json()

  const systemPrompt = `You are Lumi's marking system. Mark this ${subject} exercise and respond with ONLY valid JSON:
{
  "grade": 0-100,
  "confidence": 0.0-1.0,
  "correct": true|false,
  "partial_credit": true|false,
  "feedback": "warm, specific, encouraging feedback addressed to the student",
  "improvement_tip": "one specific, actionable tip"
}

Be generous with partial credit. Confidence < 0.7 means you're unsure of the grade.
Feedback tone: warm and encouraging, never harsh. Address the student directly.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }] as any,
    messages: [{
      role: 'user',
      content: `Question: ${question}\nExpected answer: ${correctAnswer}\nStudent answered: ${studentAnswer}`
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  try {
    const result = JSON.parse(text)

    // Update exercise record
    await db.update(exercises)
      .set({
        studentAnswer,
        aiGrade: result.grade,
        aiGradeConfidence: result.confidence,
        aiFeedback: result.feedback,
      })
      .where(eq(exercises.id, exerciseId))

    // Flag low confidence for supervisor review
    if (result.confidence < 0.7) {
      await db.insert(supervisorQueue).values({
        itemType: 'grade_review',
        referenceId: exerciseId,
        referenceTable: 'exercises',
        priority: 'medium',
        reason: `AI confidence ${(result.confidence * 100).toFixed(0)}% — below 70% threshold`,
      })
    }

    // Update mastery score (weighted rolling average)
    const [existing] = await db.select()
      .from(masteryScores)
      .where(and(
        eq(masteryScores.childId, childId),
        eq(masteryScores.subject, subject as any),
        eq(masteryScores.topic, topic),
        eq(masteryScores.yearLevel, yearLevel),
      ))

    const currentMastery = existing?.masteryLevel ?? 0
    const newMastery = (currentMastery * 0.7) + ((result.grade / 100) * 0.3)

    await db.insert(masteryScores).values({
      childId,
      subject,
      topic,
      yearLevel,
      masteryLevel: Math.max(0, Math.min(1, newMastery)),
      attemptsCount: (existing?.attemptsCount ?? 0) + 1,
    }).onConflictDoUpdate({
      target: [masteryScores.childId, masteryScores.subject, masteryScores.topic, masteryScores.yearLevel],
      set: {
        masteryLevel: Math.max(0, Math.min(1, newMastery)),
        attemptsCount: (existing?.attemptsCount ?? 0) + 1,
        updatedAt: new Date(),
      },
    })

    return Response.json(result)
  } catch {
    return Response.json({ error: 'Marking failed' }, { status: 500 })
  }
}
```

---

## SECTION 9 — PARENT DASHBOARD

**File: `src/app/(parent)/layout.tsx`**
```typescript
import { redirect } from 'next/navigation'
import { getCurrentParent, getChildrenForParent } from '@/actions/auth'
import Link from 'next/link'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const parent = await getCurrentParent()
  if (!parent) redirect('/sign-in')

  const childList = await getChildrenForParent()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col p-4 fixed h-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-[#534AB7] flex items-center justify-center text-white text-xs">✨</div>
          <span className="text-sm font-medium text-gray-900">EduSpark</span>
        </div>
        <nav className="space-y-1 flex-1">
          {[
            { href: '/parent/dashboard', label: 'Dashboard' },
            { href: '/parent/progress', label: 'Progress' },
            { href: '/parent/reports', label: 'Reports' },
            { href: '/parent/billing', label: 'Billing' },
            { href: '/parent/settings', label: 'Settings' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-500">{parent.fullName}</p>
          {childList[0] && (
            <p className="text-xs font-medium text-gray-900 mt-0.5">{childList[0].firstName} · Year {childList[0].yearLevel}</p>
          )}
        </div>
      </aside>
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  )
}
```

**File: `src/app/(parent)/dashboard/page.tsx`**
```typescript
import { getChildrenForParent, getCurrentParent } from '@/actions/auth'
import { db, masteryScores, sessions } from '@/db'
import { eq, desc, and, gte } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default async function ParentDashboard() {
  const parent = await getCurrentParent()
  if (!parent) redirect('/sign-in')
  const childList = await getChildrenForParent()
  if (!childList.length) redirect('/onboarding/child-profile')
  const child = childList[0]

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [topicScores, recentSessions] = await Promise.all([
    db.select().from(masteryScores).where(eq(masteryScores.childId, child.id)),
    db.select().from(sessions)
      .where(and(eq(sessions.childId, child.id), gte(sessions.startedAt, sevenDaysAgo)))
      .orderBy(desc(sessions.startedAt))
      .limit(5),
  ])

  const masteredTopics = topicScores.filter(t => t.masteryLevel >= 0.85).length
  const avgMastery = topicScores.length > 0
    ? topicScores.reduce((sum, t) => sum + t.masteryLevel, 0) / topicScores.length
    : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-gray-900">{child.firstName}'s Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Year {child.yearLevel} · ACARA curriculum</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Current streak</p>
          <p className="text-3xl font-medium text-gray-900">{child.currentStreak} <span className="text-lg">🔥</span></p>
          <p className="text-xs text-gray-400 mt-1">days in a row</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Topics mastered</p>
          <p className="text-3xl font-medium text-gray-900">{masteredTopics}</p>
          <p className="text-xs text-gray-400 mt-1">of {topicScores.length} total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Sessions this week</p>
          <p className="text-3xl font-medium text-gray-900">{recentSessions.length}</p>
          <p className="text-xs text-gray-400 mt-1">learning sessions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Overall progress</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-[#534AB7] h-2 rounded-full transition-all" style={{ width: `${Math.round(avgMastery * 100)}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{Math.round(avgMastery * 100)}%</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Recent sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions yet — Lumi is waiting!</p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map(session => (
              <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm text-gray-900 capitalize">{session.subject} · {session.topic}</p>
                  <p className="text-xs text-gray-400">{new Date(session.startedAt).toLocaleDateString('en-AU')}</p>
                </div>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full capitalize">{session.sessionType}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## SECTION 10 — SUPERVISOR CONSOLE

**File: `src/app/(supervisor)/layout.tsx`**
```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== 'supervisor') redirect('/sign-in')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col p-4 fixed h-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white text-xs">👁️</div>
          <span className="text-sm font-medium text-gray-900">Supervisor</span>
        </div>
        <nav className="space-y-1">
          {[
            { href: '/supervisor/dashboard', label: 'Overview' },
            { href: '/supervisor/queue', label: 'Review queue' },
            { href: '/supervisor/students', label: 'Students' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  )
}
```

**File: `src/app/(supervisor)/queue/page.tsx`**
```typescript
import { db, supervisorQueue, exercises } from '@/db'
import { eq, and } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { resolveQueueItem } from '@/actions/supervisor'

export default async function QueuePage() {
  const items = await db.select()
    .from(supervisorQueue)
    .where(eq(supervisorQueue.resolved, false))
    .orderBy(supervisorQueue.priority, supervisorQueue.createdAt)

  const priorityColor: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-amber-100 text-amber-800',
    medium: 'bg-blue-100 text-blue-800',
    low: 'bg-gray-100 text-gray-800',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Review queue</h1>
        <p className="text-sm text-gray-500 mt-1">{items.length} items pending review</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm font-medium text-gray-900">Queue is clear</p>
          <p className="text-sm text-gray-400 mt-1">No items need review right now</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor[item.priority]}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{item.itemType.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('en-AU')}</span>
                  </div>
                  <p className="text-sm text-gray-900">{item.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">Reference: {item.referenceTable} · {item.referenceId}</p>
                </div>
                <form action={resolveQueueItem.bind(null, item.id)}>
                  <button type="submit" className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-100">
                    Mark resolved
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**File: `src/actions/supervisor.ts`**
```typescript
'use server'

import { db, supervisorQueue } from '@/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function resolveQueueItem(id: string) {
  await db.update(supervisorQueue)
    .set({ resolved: true, resolvedAt: new Date() })
    .where(eq(supervisorQueue.id, id))
  revalidatePath('/supervisor/queue')
}
```

---

## SECTION 11 — STUDENT LEARNING SCREEN

**File: `src/app/(student)/learn/page.tsx`**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

type Exercise = {
  id?: string
  question: string
  correct_answer: string
  hints: string[]
  explanation: string
  bloom_level: string
}

type MarkingResult = {
  grade: number
  feedback: string
  improvement_tip: string
  correct: boolean
}

export default function LearnPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<MarkingResult | null>(null)
  const [hintsShown, setHintsShown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(true)

  useEffect(() => {
    generateExercises()
  }, [])

  async function generateExercises() {
    setGenerating(true)
    const res = await fetch('/api/ai/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'mathematics', topic: 'fractions', yearLevel: 5, masteryLevel: 0.4, count: 3 }),
    })
    const data = await res.json()
    setExercises(data.exercises ?? [])
    setGenerating(false)
  }

  async function submitAnswer() {
    if (!answer.trim() || loading) return
    setLoading(true)
    const ex = exercises[current]
    const res = await fetch('/api/ai/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseId: ex.id ?? crypto.randomUUID(),
        childId: 'temp',
        question: ex.question,
        correctAnswer: ex.correct_answer,
        studentAnswer: answer,
        subject: 'mathematics',
        topic: 'fractions',
        yearLevel: 5,
        bloomLevel: ex.bloom_level,
      }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  function nextQuestion() {
    setCurrent(c => c + 1)
    setAnswer('')
    setResult(null)
    setHintsShown(0)
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl mx-auto mb-3 animate-pulse">✨</div>
          <p className="text-sm text-gray-600">Lumi is preparing your exercises...</p>
        </div>
      </div>
    )
  }

  if (current >= exercises.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm">
          <p className="text-4xl mb-3">🎉</p>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Session complete!</h2>
          <p className="text-sm text-gray-500 mb-6">Great work today. Lumi has recorded your progress.</p>
          <Button onClick={generateExercises} className="w-full bg-[#534AB7] hover:bg-[#3C3489] mb-3">
            More exercises
          </Button>
          <Link href="/student/tutor">
            <Button variant="outline" className="w-full">Ask Lumi a question</Button>
          </Link>
        </div>
      </div>
    )
  }

  const ex = exercises[current]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm">✨</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">Mathematics · Fractions</p>
          <div className="flex gap-1 mt-1">
            {exercises.map((_, i) => (
              <div key={i} className={`h-1 rounded-full flex-1 ${i < current ? 'bg-[#534AB7]' : i === current ? 'bg-amber-400' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
        <Link href="/student/tutor" className="text-xs text-gray-500 hover:text-gray-700">Ask Lumi</Link>
      </div>

      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <p className="text-xs text-gray-400 mb-3">Question {current + 1} of {exercises.length}</p>
          <p className="text-base text-gray-900 leading-relaxed mb-6">{ex.question}</p>

          {!result && (
            <>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write your answer here..."
                className="mb-3 resize-none"
                rows={3}
              />
              {hintsShown < ex.hints.length && (
                <button
                  onClick={() => setHintsShown(h => h + 1)}
                  className="text-xs text-[#534AB7] hover:underline mb-3 block"
                >
                  Need a hint? ({ex.hints.length - hintsShown} remaining)
                </button>
              )}
              {ex.hints.slice(0, hintsShown).map((hint, i) => (
                <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                  💡 {hint}
                </div>
              ))}
              <Button onClick={submitAnswer} disabled={!answer.trim() || loading} className="w-full bg-[#534AB7] hover:bg-[#3C3489]">
                {loading ? 'Lumi is marking...' : 'Submit answer'}
              </Button>
            </>
          )}

          {result && (
            <div className={`rounded-xl p-4 mb-4 ${result.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{result.correct ? '✅' : '💛'}</span>
                <span className="text-sm font-medium text-gray-900">{result.grade}/100</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{result.feedback}</p>
              {!result.correct && (
                <p className="text-xs text-gray-500">💡 {result.improvement_tip}</p>
              )}
            </div>
          )}

          {result && (
            <Button onClick={nextQuestion} className="w-full bg-[#534AB7] hover:bg-[#3C3489]">
              {current < exercises.length - 1 ? 'Next question →' : 'Finish session →'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## SECTION 12 — HOMEPAGE

**File: `src/app/page.tsx`**
```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#534AB7] flex items-center justify-center text-white">✨</div>
          <span className="text-sm font-medium text-gray-900">EduSpark</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-gray-500 hover:text-gray-700">Sign in</Link>
          <Link href="/sign-up">
            <Button className="bg-[#534AB7] hover:bg-[#3C3489] text-sm">Start free trial</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-xs text-amber-700 mb-8">
          ✨ Meet Lumi — your child's AI tutor
        </div>
        <h1 className="text-5xl font-medium text-gray-900 leading-tight mb-6">
          A world-class tutor for your child.<br />
          <span className="text-[#534AB7]">Available 24 hours a day.</span>
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          Lumi teaches, sets exercises, marks work, and tracks progress — 
          automatically. Personalised for your child. Costs less than one tutoring session per month.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="bg-[#534AB7] hover:bg-[#3C3489] px-8">
              Start 7-day free trial →
            </Button>
          </Link>
          <p className="text-sm text-gray-400">No credit card required</p>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-20">
          {[
            { icon: '🌙', title: '24/7 available', desc: 'Lumi never sleeps. Learning happens whenever your child is ready.' },
            { icon: '♾️', title: 'Unlimited learning', desc: 'Every subject, every topic. One subscription covers everything.' },
            { icon: '🚀', title: 'No ceiling', desc: 'Gifted learners can advance years ahead. Nothing holds them back.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="text-left p-6 rounded-2xl border border-gray-100 bg-gray-50">
              <span className="text-2xl mb-3 block">{icon}</span>
              <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
```

---

## SECTION 13 — FINAL VERIFICATION CHECKLIST

Run through every item below. Fix any failure before marking the build complete.

### Full end-to-end flow
- [ ] `/` homepage loads and looks correct
- [ ] `/sign-up` creates a parent + row in `parents` table
- [ ] Onboarding step 1: child name + grade → row in `children` table
- [ ] Onboarding step 2: both checkboxes → 3 rows in `consents` table
- [ ] Onboarding step 3: confirmation screen shows child's name correctly
- [ ] `/student/diagnostic`: Lumi runs 8 questions → `mastery_scores` populated
- [ ] `/student/learn`: exercises generate, submit, mark correctly
- [ ] `/student/tutor`: Lumi chat streams responses in real time
- [ ] Low-confidence mark (<0.7): row appears in `supervisor_queue`
- [ ] `/parent/dashboard`: shows real streak, mastery %, recent sessions
- [ ] `/supervisor/queue`: shows pending items, resolve button works
- [ ] Stripe test checkout: plan updates in `parents` table

### Code quality
- [ ] `npm run build` completes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] No `any` types in any file (check with `npx tsc --noEmit`)
- [ ] No API keys hardcoded anywhere (grep the codebase)
- [ ] `.env.local` is in `.gitignore` and NOT committed

### Deploy
- [ ] All environment variables set in Vercel dashboard
- [ ] Production URL added to Clerk allowed origins
- [ ] Stripe webhook updated to production URL
- [ ] Production end-to-end flow tested on live URL

---

## BUILD COMPLETE

When all items in Section 13 are checked, the EduSpark platform is ready for beta users.

**Product:** EduSpark — AI-native learning platform
**AI Tutor:** Lumi (claude-sonnet-4-6 for chat, claude-haiku-4-5-20251001 for exercises/marking)
**Stack:** Next.js 15 · TypeScript · Tailwind · Neon · Clerk · Stripe · Vercel
**Curriculum:** ACARA (Australia) · Year 1–10 · Mathematics and English (Phase 1)
