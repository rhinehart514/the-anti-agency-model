import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <span className="text-white font-semibold">The Anti-Agency</span>
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-white transition-colors text-sm"
        >
          My Sites →
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            The Anti-Agency
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            No agency fees. No complicated tools. Just your professional website, built in minutes.
          </p>
        </header>

        {/* Main CTA */}
        <div className="text-center mb-16">
          <Link
            href="/setup"
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-600/25"
          >
            Create Your Site
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-slate-500 mt-4 text-sm">
            Free to start. No credit card required.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Your AI Agent
            </h3>
            <p className="text-slate-400 text-sm">
              Not just a builder—an ongoing partner that helps you maintain and improve your site.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Built in Minutes
            </h3>
            <p className="text-slate-400 text-sm">
              Answer a few questions and watch your professional site come to life.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl mb-4">✏️</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Easy to Edit
            </h3>
            <p className="text-slate-400 text-sm">
              Click anywhere to edit. Use AI to refine your content instantly.
            </p>
          </div>
        </div>

        {/* Demo Link */}
        <div className="text-center">
          <p className="text-slate-500 mb-3">Want to see an example?</p>
          <Link
            href="/sites/smith-johnson-law"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-4"
          >
            View Demo Site →
          </Link>
        </div>
      </div>
    </div>
  )
}
