import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db, masteryScores, sessions } from '@/db'

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
