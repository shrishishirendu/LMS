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
          Meet Lumi — your child&apos;s AI tutor
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
              Start 7-day free trial
            </Button>
          </Link>
          <p className="text-sm text-gray-400">No credit card required</p>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-20">
          {[
            { title: '24/7 available', desc: 'Lumi never sleeps. Learning happens whenever your child is ready.' },
            { title: 'Unlimited learning', desc: 'Every subject, every topic. One subscription covers everything.' },
            { title: 'No ceiling', desc: 'Gifted learners can advance years ahead. Nothing holds them back.' },
          ].map(({ title, desc }) => (
            <div key={title} className="text-left p-6 rounded-2xl border border-gray-100 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
