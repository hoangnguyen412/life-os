/**
 * Controlled form shared by Login and Register through the mode prop.
 * Validates input, submits credentials to the API and displays server errors.
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import FormField from './FormField.jsx'
import validateAuth from '../utils/validateAuth.js'
import useAuth from '../auth/useAuth.js'

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  // State holds field values, validation errors, password visibility and submit feedback.
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register } = useAuth()

  // Update only the changed field, and remove that field's old error.
  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
    setNotice('')
  }

  // Prevent a full-page form submission, validate, then focus the first invalid input.
  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateAuth(values, {
      isRegister,
      emailValid: event.currentTarget.elements.namedItem('email').validity.valid,
    })
    setErrors(nextErrors)
    setNotice('')

    const firstInvalidField = Object.keys(nextErrors)[0]
    if (firstInvalidField) {
      event.currentTarget.elements.namedItem(firstInvalidField).focus()
      return
    }

    setSubmitting(true)
    try {
      const action = isRegister ? register : login
      await action(isRegister
        ? { name: values.name.trim(), email: values.email.trim(), password: values.password }
        : { email: values.email.trim(), password: values.password })
      setValues((current) => ({ ...current, password: '' }))
      setShowPassword(false)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (error) {
      if (error.field && ['name', 'email', 'password'].includes(error.field)) setErrors({ [error.field]: error.message })
      else setNotice(error.message)
    } finally { setSubmitting(false) }
  }

  // noValidate disables browser popups so FormField can show consistent inline errors.
  // The visibility button uses type="button" to avoid accidentally submitting the form.
  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="space-y-5.5">
        {isRegister && (
          <FormField name="name" label="Name" type="text" autoComplete="name" autoFocus value={values.name} onChange={handleChange} error={errors.name} />
        )}
        <FormField name="email" label="Email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} autoFocus={!isRegister} value={values.email} onChange={handleChange} error={errors.email} />
        <FormField name="password" label="Password" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} value={values.password} onChange={handleChange} error={errors.password} hint={isRegister ? 'Use at least 8 characters.' : undefined}>
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-controls="auth-password"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 min-w-16 cursor-pointer rounded-[3px] px-3 text-xs text-os-muted hover:text-os-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-ink"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </FormField>
      </div>

      <button type="submit" disabled={submitting} className="mt-7 min-h-11 w-full cursor-pointer rounded-lg border border-os-primary bg-os-primary px-4 py-3 font-medium text-white transition-colors hover:bg-os-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-primary disabled:opacity-60">
        {submitting ? 'Please wait…' : isRegister ? 'Sign up' : 'Sign in'}
      </button>
      {notice && <p role="status" className="mt-5 border-l-2 border-os-ink bg-os-soft px-4 py-3 text-sm">{notice}</p>}
    </form>
  )
}
