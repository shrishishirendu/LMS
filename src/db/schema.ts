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
