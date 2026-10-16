/**
 * Client-side fallback for URLs not matched by App's route table.
 * Recovery links navigate to known pages without reloading the whole application.
 * This screen is separate from a hosting server's missing-route HTTP response.
 */
import { Link } from 'react-router'
import Brand from '../components/Brand.jsx'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-os-canvas px-6 py-12">
      <section aria-labelledby="not-found-title" className="w-full max-w-lg rounded-2xl border border-os-line bg-os-bg p-8 sm:p-12">
        <Brand className="mb-9" />
        <p className="mb-3 text-sm font-semibold text-os-primary">404</p>
        <h1 id="not-found-title" className="text-3xl font-medium">Page not found</h1>
        <p className="mt-4 leading-relaxed text-os-muted">We could not find this page. Return to your workspace or sign in to get started.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/dashboard" className="inline-flex min-h-11 items-center rounded-lg bg-os-primary px-5 py-3 font-medium text-white hover:bg-os-primary-hover">Go to Dashboard</Link>
          <Link to="/login" className="inline-flex min-h-11 items-center rounded-lg border border-os-line px-5 py-3 text-os-primary hover:bg-os-soft">Sign in</Link>
        </div>
      </section>
    </main>
  )
}
