export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#534AB7] mb-3">
            <span className="text-white text-lg">✨</span>
          </div>
          <h1 className="text-xl font-medium text-gray-900">EduSpark</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
