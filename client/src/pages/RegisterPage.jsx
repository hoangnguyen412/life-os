/**
 * Registration page: reuse AuthForm with mode="register" to request a name
 * and apply registration validation before creating a real backend account.
 */
import AuthForm from '../components/AuthForm.jsx'
import { Link, useLocation } from 'react-router'

export default function RegisterPage() {
  const { state } = useLocation()
  return (
    <>
      <h1 id="auth-title" className="mb-2 text-[28px] font-medium leading-tight sm:mb-2.5">Create an account</h1>
      <p className="mb-5 text-os-muted sm:mb-7.5">Start managing your tasks and goals.</p>
      <AuthForm mode="register" />
      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1 text-center sm:mt-6.5 sm:block">
        <span>Already have an account?</span>{' '}
        <Link to="/login" state={state} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-[3px] px-2 underline underline-offset-4 hover:text-os-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-ink">
          Sign in
        </Link>
      </p>
    </>
  )
}
