import { redirect } from 'next/navigation'
import { getCurrentParent, getChildrenForParent } from '@/actions/auth'
import Link from 'next/link'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const parent = await getCurrentParent()
  if (!parent) redirect('/sign-in')

  const childList = await getChildrenForParent()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col p-4 fixed h-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-[#534AB7] flex items-center justify-center text-white text-xs">✨</div>
          <span className="text-sm font-medium text-gray-900">EduSpark</span>
        </div>
        <nav className="space-y-1 flex-1">
          {[
            { href: '/parent/dashboard', label: 'Dashboard' },
            { href: '/parent/progress', label: 'Progress' },
            { href: '/parent/reports', label: 'Reports' },
            { href: '/parent/billing', label: 'Billing' },
            { href: '/parent/settings', label: 'Settings' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-500">{parent.fullName}</p>
          {childList[0] && (
            <p className="text-xs font-medium text-gray-900 mt-0.5">{childList[0].firstName} · Year {childList[0].yearLevel}</p>
          )}
        </div>
      </aside>
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  )
}
