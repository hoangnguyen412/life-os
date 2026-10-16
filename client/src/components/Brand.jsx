/**
 * One shared logo for auth pages, Sidebar and the 404 screen.
 * Intrinsic dimensions preserve its aspect ratio; className controls outer spacing.
 */
import logo from '../assets/life-os-logo.png'

export default function Brand({ className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <img src={logo} alt="Life OS" width={2172} height={724} className="block h-auto w-44 max-w-full" />
    </div>
  )
}
