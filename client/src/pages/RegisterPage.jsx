/**
 * Registration page: reuse AuthForm with mode="register" to request a name
 * and apply registration validation. This preview does not create an account.
 */
import AuthForm from '../components/AuthForm.jsx'
import { Link } from 'react-router'

export default function RegisterPage() {
  return (
    <>
      <h1 id="auth-title" className="mb-2.5 text-[28px] font-medium leading-tight">Create an account</h1>
      <p className="mb-7.5 text-os-muted">Start managing your tasks and goals.</p>
      <AuthForm mode="register" />
      <p className="mt-6.5 text-center">
        Already have an account?{' '}
        <Link to="/login" className="inline-flex min-h-11 items-center rounded-[3px] px-2 underline underline-offset-4 hover:text-os-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-ink">
          Sign in
        </Link>
      </p>
      <p className="mt-5 text-center text-xs text-os-muted">Preview only · No account will be created</p>
    </>
  )
}
