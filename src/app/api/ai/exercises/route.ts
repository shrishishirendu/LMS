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
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
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
