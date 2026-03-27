import { getChildrenForParent, getCurrentParent } from '@/actions/auth'
import { db, masteryScores, sessions } from '@/db'
import { eq, desc, and, gte } from 'drizzle-orm'
import { redirect } from 'next/navigation'

export default async function ParentDashboard() {
  const parent = await getCurrentParent()
  if (!parent) redirect('/sign-in')
  const childList = await getChildrenForParent()
  if (!childList.length) redirect('/onboarding/child-profile')
  const child = childList[0]

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [topicScores, recentSessions] = await Promise.all([
    db.select().from(masteryScores).where(eq(masteryScores.childId, child.id)),
    db.select().from(sessions)
      .where(and(eq(sessions.childId, child.id), gte(sessions.startedAt, sevenDaysAgo)))
      .orderBy(desc(sessions.startedAt))
      .limit(5),
  ])

  const masteredTopics = topicScores.filter(t => t.masteryLevel >= 0.85).length
  const avgMastery = topicScores.length > 0
    ? topicScores.reduce((sum, t) => sum + t.masteryLevel, 0) / topicScores.length
    : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-gray-900">{child.firstName}&apos;s Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Year {child.yearLevel} · ACARA curriculum</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Current streak</p>
          <p className="text-3xl font-medium text-gray-900">{child.currentStreak}</p>
          <p className="text-xs text-gray-400 mt-1">days in a row</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Topics mastered</p>
          <p className="text-3xl font-medium text-gray-900">{masteredTopics}</p>
          <p className="text-xs text-gray-400 mt-1">of {topicScores.length} total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Sessions this week</p>
          <p className="text-3xl font-medium text-gray-900">{recentSessions.length}</p>
          <p className="text-xs text-gray-400 mt-1">learning sessions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Overall progress</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-[#534AB7] h-2 rounded-full transition-all" style={{ width: `${Math.round(avgMastery * 100)}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{Math.round(avgMastery * 100)}%</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Recent sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions yet — Lumi is waiting!</p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map(session => (
              <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm text-gray-900 capitalize">{session.subject} · {session.topic}</p>
                  <p className="text-xs text-gray-400">{new Date(session.startedAt).toLocaleDateString('en-AU')}</p>
                </div>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full capitalize">{session.sessionType}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
