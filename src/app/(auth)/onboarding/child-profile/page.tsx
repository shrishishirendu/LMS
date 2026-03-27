'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createChildProfile } from '@/actions/children'

const YEAR_LEVELS = [
  { value: '1', label: 'Year 1  (age 6–7)' },
  { value: '2', label: 'Year 2  (age 7–8)' },
  { value: '3', label: 'Year 3  (age 8–9)' },
  { value: '4', label: 'Year 4  (age 9–10)' },
  { value: '5', label: 'Year 5  (age 10–11)' },
  { value: '6', label: 'Year 6  (age 11–12)' },
  { value: '7', label: 'Year 7  (age 12–13)' },
  { value: '8', label: 'Year 8  (age 13–14)' },
  { value: '9', label: 'Year 9  (age 14–15)' },
  { value: '10', label: 'Year 10  (age 15–16)' },
]

export default function ChildProfilePage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [loading, setLoading] = useState(false)

  const canContinue = firstName.trim().length > 0 && yearLevel !== ''

  async function handleSubmit() {
    if (!canContinue) return
    setLoading(true)
    await createChildProfile(firstName.trim(), parseInt(yearLevel))
    router.push('/onboarding/consent')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      <div className="w-full bg-gray-100 rounded-full h-1 mb-8">
        <div className="bg-[#534AB7] h-1 rounded-full w-1/3" />
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-1">Tell us about your child</h2>
      <p className="text-sm text-gray-500 mb-6">Just two things — that&apos;s all Lumi needs to get started.</p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="firstName" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Child&apos;s first name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Jamie"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">School grade / year level</Label>
          <Select onValueChange={setYearLevel}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select grade..." />
            </SelectTrigger>
            <SelectContent>
              {YEAR_LEVELS.map((y) => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-4">
        We only collect your child&apos;s first name and grade. No email, date of birth, or photo required.
      </p>

      <Button
        onClick={handleSubmit}
        disabled={!canContinue || loading}
        className="w-full mt-6 bg-[#534AB7] hover:bg-[#3C3489]"
      >
        {loading ? 'Saving...' : 'Continue →'}
      </Button>
    </div>
  )
}
