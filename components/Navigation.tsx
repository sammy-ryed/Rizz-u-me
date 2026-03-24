'use client'

type Page = 'updater' | 'roadmap' | 'roast' | 'interview'

interface NavigationProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const navItems: { id: Page; label: string }[] = [
    { id: 'updater', label: 'Resume Updater' },
    { id: 'roadmap', label: 'Roadmap' },
    { id: 'roast', label: 'Roast Me' },
    { id: 'interview', label: 'Interview Sim' },
  ]

  return (
    <div className="sidebar">
      <div className="logo">
        Rizz<span>u</span>me
      </div>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onPageChange(item.id)}
          className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
        >
          <span className="dot" />
          {item.label}
        </button>
      ))}
    </div>
  )
}
