export default function SetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            The Anti-Agency
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Your website, built in minutes
          </p>
        </div>

        {/* Wizard Content */}
        {children}
      </div>
    </div>
  )
}
