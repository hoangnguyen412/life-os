/**
 * Local SVG icon library: each name selects a list of vector path commands.
 * Decorative icons are hidden from screen readers; their controls provide labels.
 */
const paths = {
  dashboard: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  tasks: ['M9 6h12M9 12h12M9 18h12', 'm3 6 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2'],
  goals: ['M20.5 9a9 9 0 1 1-5.5-5.5', 'M16.5 11a5 5 0 1 1-3.5-3.5', 'm12 12 8-8m-4 0h4v4'],
  calendar: ['M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M16 2v4M8 2v4M3 10h18M8 14h2m4 0h2m-8 4h2'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  close: ['m6 6 12 12M6 18 18 6'],
  logout: ['M9 5H5v14h4M13 12h8m-4-4 4 4-4 4'],
  arrow: ['M5 12h14m-6-6 6 6-6 6'],
}

// Reusing one SVG renderer keeps stroke style and sizing consistent throughout the UI.
export default function Icon({ name, className = 'size-5' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]?.map((path) => <path key={path} d={path} />)}
    </svg>
  )
}
