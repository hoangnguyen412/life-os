/**
 * Shared Login/Register shell: illustration, logo, form area and preview link.
 * Outlet receives the matching auth page; importing PNGs lets Vite bundle them.
 */
import Brand from '../components/Brand.jsx'
import illustration from '../assets/login-illustration.png'
import { Link, Outlet } from 'react-router'

export default function AuthLayout() {
  // Tailwind's sm: classes switch from a stacked mobile layout to two columns.
  // The preview link opens the workspace without creating an authenticated session.
  return (
    <main className="grid min-h-dvh grid-cols-1 sm:grid-cols-2">
      <aside aria-label="Life OS illustration" className="flex items-center justify-center border-b border-os-line bg-[#dceee6] p-4 sm:border-r sm:border-b-0 sm:p-8 lg:p-11">
        <img src={illustration} alt="A checklist and calendar beside a winding path leading to a goal flag." width={1024} height={1536} fetchPriority="high" className="h-52 w-full max-w-xl rounded-2xl object-contain sm:h-auto sm:max-h-[calc(100dvh-5.5rem)]" />
      </aside>

      <section aria-labelledby="auth-title" className="flex items-center justify-center px-7 py-11 sm:px-8 sm:py-15 lg:px-12">
        <div className="w-full max-w-90">
          <Brand className="mb-9" />
          <Outlet />
          <div className="mt-6 border-t border-os-line pt-5 text-center">
            <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-4 py-2 font-medium text-os-primary hover:bg-os-primary-soft">
              Preview workspace <span aria-hidden="true">→</span>
            </Link>
            <p className="mt-1 text-xs text-os-muted">Explore Life OS without an account.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
