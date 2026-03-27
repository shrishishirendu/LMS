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
      <h2 className="text-lg font-medium text-gray-900 mb-2">You&apos;re all set!</h2>
      <p className="text-sm text-gray-500 mb-6">
        Your 7-day free trial has started. Let&apos;s build {child.firstName}&apos;s personalised learning plan.
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
          Start Lumi&apos;s diagnostic →
        </Button>
      </Link>
    </div>
  )
}
