/** Return only known workspace routes; never follow an external or auth-page redirect. */
export function authRedirect(from) {
  return typeof from === 'string' && /^\/(dashboard|tasks|goals|calendar)(?:[?#]|$)/.test(from) ? from : '/dashboard'
}
