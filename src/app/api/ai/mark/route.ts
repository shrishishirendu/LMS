import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db, exercises, masteryScores, supervisorQueue } from '@/db'
import { eq, and } from 'drizzle-orm'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { exerciseId, childId, question, correctAnswer, studentAnswer, subject, topic, yearLevel } = await req.json()

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
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
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
        eq(masteryScores.subject, subject),
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
