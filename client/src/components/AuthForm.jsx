/**
 * Controlled form shared by Login and Register through the mode prop.
 * Validates input, submits to the real Auth API and maps server errors to fields.
 */
import { useState } from 'react'
import FormField from './FormField.jsx'
import validateAuth from '../utils/validateAuth.js'
import useAuth from '../hooks/useAuth.js'

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register'
  const auth = useAuth()
  // State holds field values, validation errors, password visibility and submit feedback.
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

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
    if (pending) return
    const form = event.currentTarget
    const nextErrors = validateAuth(values, {
      isRegister,
      emailValid: form.elements.namedItem('email').validity.valid,
    })
    setErrors(nextErrors)
    setNotice('')

    const firstInvalidField = Object.keys(nextErrors)[0]
    if (firstInvalidField) {
      form.elements.namedItem(firstInvalidField).focus()
      return
    }

    setPending(true)
    setShowPassword(false)
    try {
      const credentials = { email: values.email.trim(), password: values.password }
      if (isRegister) {
        await auth.register({ ...credentials, name: values.name.trim() })
      } else {
        await auth.login(credentials)
      }
      // AuthLayout redirects only after the API confirms an authenticated user.
      setValues((current) => ({ ...current, password: '' }))
    } catch (error) {
      const field = ['email', 'password', ...(isRegister ? ['name'] : [])].includes(error.field) ? error.field : null
      if (field) {
        setErrors({ [field]: error.message })
      } else {
        setNotice(error.message || 'Could not sign in. Please try again.')
      }
    } finally {
      setPending(false)
    }
  }

  // noValidate disables browser popups so FormField can show consistent inline errors.
  // The visibility button uses type="button" to avoid accidentally submitting the form.
  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={pending}>
      <fieldset disabled={pending} className="min-w-0 space-y-5.5">
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
      </fieldset>

      <button type="submit" disabled={pending} className="mt-7 min-h-11 w-full cursor-pointer rounded-lg border border-os-primary bg-os-primary px-4 py-3 font-medium text-white transition-colors hover:bg-os-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-os-primary disabled:cursor-wait disabled:opacity-60">
        {pending ? (isRegister ? 'Creating account…' : 'Signing in…') : isRegister ? 'Sign up' : 'Sign in'}
      </button>
      {pending && <p role="status" className="mt-4 text-sm text-os-muted">Please wait…</p>}
      {notice && <p role="alert" className="mt-5 border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-700">{notice}</p>}
    </form>
  )
}
