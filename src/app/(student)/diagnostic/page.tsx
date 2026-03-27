'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Message = { role: 'user' | 'assistant'; content: string }

export default function DiagnosticPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
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
        childId: 'temp',
        yearLevel: 5,
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
