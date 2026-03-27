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
                  {hint}
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
                <span className="text-sm font-medium text-gray-900">{result.grade}/100</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{result.feedback}</p>
              {!result.correct && (
                <p className="text-xs text-gray-500">{result.improvement_tip}</p>
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
