/**
 * Shared workspace route metadata used by App, AppLayout and Sidebar.
 * IDs connect routes to components; icon names connect links to the SVG library.
 * Headline/description copy remains metadata from the initial layout preview.
 */
const workspaceNavigation = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: 'dashboard', headline: 'A clear view of your day.', description: 'Your tasks, goals, and progress will come together here.' },
  { id: 'tasks', path: '/tasks', label: 'Tasks', icon: 'tasks', headline: 'Make room for what matters.', description: 'Your tasks and upcoming deadlines will appear here.' },
  { id: 'goals', path: '/goals', label: 'Goals', icon: 'goals', headline: 'Keep your next milestone in sight.', description: 'Your goals and their progress will appear here.' },
  { id: 'calendar', path: '/calendar', label: 'Calendar', icon: 'calendar', headline: 'Give your plans a place.', description: 'Your events and schedule will appear here.' },
]

export default workspaceNavigation
