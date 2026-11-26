import { MAX_MEMBERS } from '../constants.js'
import ResetButton from './ResetButton.jsx'

function NavIcon({ name }) {
  switch (name) {
    case 'overview':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </svg>
      )
    case 'expenses':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h12a1 1 0 0 1 1 1v16l-3-2-2 2-2-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1Z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      )
    case 'settle':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v18M5 7h14M4 14l3-7 3 7a3 3 0 0 1-6 0ZM14 14l3-7 3 7a3 3 0 0 1-6 0Z" />
        </svg>
      )
    case 'history':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'members':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 19a6 6 0 0 1 12 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M16.5 14.5A5 5 0 0 1 21 19" />
        </svg>
      )
    default:
      return null
  }
}

function SidebarNav({
  activePage,
  onNavigate,
  counts,
  isEmpty,
  onReset,
}) {
  const navItems = [
    { id: 'overview', label: 'Overview', badge: null },
    { id: 'expenses', label: 'Expenses', badge: counts.expenses || null },
    { id: 'settle', label: 'Settle Up', badge: counts.pending || null },
    { id: 'history', label: 'History', badge: counts.history || null },
    {
      id: 'members',
      label: 'Members',
      badge: `${counts.members}/${MAX_MEMBERS}`,
    },
  ]

  return (
    <>
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            ₹
          </div>
          <div>
            <div className="brand-name">Expense Splitter</div>
            <div className="brand-tag">Group ledger</div>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon">
                  <NavIcon name={item.id} />
                </span>
                <span className="nav-label">{item.label}</span>
                {item.badge !== null && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-label">Group controls</div>
          <ResetButton disabled={isEmpty} onReset={onReset} />
        </div>
      </aside>

      <div className="mobile-header">
        <div className="mobile-top-row">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              ₹
            </div>
            <div className="brand-name">Expense Splitter</div>
          </div>
          <ResetButton disabled={isEmpty} onReset={onReset} />
        </div>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const isActive = activePage === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-nav-pill ${isActive ? 'mobile-nav-pill-active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span className="mobile-nav-badge">{item.badge}</span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}

export default SidebarNav
