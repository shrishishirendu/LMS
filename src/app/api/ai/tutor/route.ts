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
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }] as Anthropic.Messages.TextBlockParam[],
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
