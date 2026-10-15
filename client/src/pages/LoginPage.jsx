/**
 * Login page copy and navigation; AuthForm owns input state and validation.
 * AuthLayout supplies the logo and illustration around this routed page.
 */
import AuthForm from '../components/AuthForm.jsx'
import { Link } from 'react-router'

export default function LoginPage() {
  return (
    <>
      <h1 id="auth-title" className="mb-2.5 text-[28px] font-medium leading-tight">Sign in</h1>
      <p className="mb-7.5 text-os-muted">Continue managing your tasks and goals.</p>
      <AuthForm mode="login" />
      <p className="mt-6.5 text-center">
        New to Life OS?{' '}
        <Link to="/register" className="inline-flex min-h-11 items-center rounded-[3px] px-2 underline underline-offset-4 hover:text-os-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-ink">
          Sign up
        </Link>
      </p>
      <p className="mt-5 text-center text-xs text-os-muted">Preview only · No account needed</p>
    </>
  )
}
