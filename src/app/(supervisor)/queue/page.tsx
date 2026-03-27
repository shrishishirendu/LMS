import { db, supervisorQueue } from '@/db'
import { eq } from 'drizzle-orm'
import { resolveQueueItem } from '@/actions/supervisor'

export default async function QueuePage() {
  const items = await db.select()
    .from(supervisorQueue)
    .where(eq(supervisorQueue.resolved, false))
    .orderBy(supervisorQueue.priority, supervisorQueue.createdAt)

  const priorityColor: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-amber-100 text-amber-800',
    medium: 'bg-blue-100 text-blue-800',
    low: 'bg-gray-100 text-gray-800',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Review queue</h1>
        <p className="text-sm text-gray-500 mt-1">{items.length} items pending review</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">Queue is clear</p>
          <p className="text-sm text-gray-400 mt-1">No items need review right now</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor[item.priority]}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{item.itemType.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('en-AU')}</span>
                  </div>
                  <p className="text-sm text-gray-900">{item.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">Reference: {item.referenceTable} · {item.referenceId}</p>
                </div>
                <form action={resolveQueueItem.bind(null, item.id)}>
                  <button type="submit" className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-100">
                    Mark resolved
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
