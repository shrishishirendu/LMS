import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const { sessionClaims } = await auth()
  const metadata = sessionClaims?.metadata as Record<string, string> | undefined
  if (metadata?.role !== 'supervisor') redirect('/sign-in')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col p-4 fixed h-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white text-xs">S</div>
          <span className="text-sm font-medium text-gray-900">Supervisor</span>
        </div>
        <nav className="space-y-1">
          {[
            { href: '/supervisor/dashboard', label: 'Overview' },
            { href: '/supervisor/queue', label: 'Review queue' },
            { href: '/supervisor/students', label: 'Students' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  )
}
