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
          The platform collects only your child&apos;s first name, school grade, and learning activity data. No other personal data is collected from your child.<br /><br />
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
