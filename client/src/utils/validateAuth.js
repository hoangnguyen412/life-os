/**
 * Pure auth validation: return an error object keyed by form field name.
 * Email validity comes from the native email input; registration requires 8 characters.
 * This checks input format, not credentials, account existence or server authorization.
 */
export default function validateAuth(values, { isRegister, emailValid }) {
  const errors = {}

  if (isRegister && !values.name.trim()) {
    errors.name = 'Name is required.'
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!emailValid) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.password) {
    errors.password = 'Password is required.'
  } else if (isRegister && values.password.length < 8) {
    errors.password = 'Use at least 8 characters.'
  }

  // An empty object means the client-side checks passed.
  return errors
}
