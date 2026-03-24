'use client'

import { useEffect } from 'react'

interface LayoutClientProps {
  children: React.ReactNode
}

export function LayoutClient({ children }: LayoutClientProps) {
  useEffect(() => {
    const canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement
    const ctx = canvas?.getContext('2d')
    const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&'
    let cells: any = []
    let mouse = { x: -9999, y: -9999 }
    const CELL = 24
    const RADIUS = 80
    const DECAY = 0.01
    const FS = 11
    let matrixVisible = true

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      buildGrid()
    }

    function buildGrid() {
      if (!canvas) return
      const cols = Math.ceil(canvas.width / CELL)
      const rows = Math.ceil(canvas.height / CELL)
      cells = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
          char: randomChar(),
          heat: 0,
        }))
      )
    }

    function randomChar() {
      return CHARS[Math.floor(Math.random() * CHARS.length)]
    }

    let lastSh = 0
    function drawMatrix(ts: number) {
      if (!matrixVisible) {
        requestAnimationFrame(drawMatrix)
        return
      }
      if (!ctx || !canvas) return

      if (ts - lastSh > 110) {
        const shuffleRows = Math.floor(cells.length * 0.1)
        for (let i = 0; i < shuffleRows; i++) {
          const r = Math.floor(Math.random() * cells.length)
          const c = Math.floor(Math.random() * cells[r].length)
          cells[r][c].char = randomChar()
        }
        lastSh = ts
      }

      ctx.fillStyle = 'rgba(10,8,5,0.88)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${FS}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (let r = 0; r < cells.length; r++) {
        for (let c = 0; c < cells[r].length; c++) {
          const cell = cells[r][c]
          const x = c * CELL + CELL / 2
          const y = r * CELL + CELL / 2
          const dist = Math.hypot(x - mouse.x, y - mouse.y)

          if (dist < RADIUS) {
            cell.heat = 0.12
          } else {
            cell.heat = Math.max(0, cell.heat - DECAY)
          }

          ctx.globalAlpha = cell.heat
          ctx.fillStyle = '#f2ede6'
          ctx.fillText(cell.char, x, y)
        }
      }
      ctx.globalAlpha = 1
      requestAnimationFrame(drawMatrix)
    }

    window.addEventListener('mousemove', (e) => {
      mouse = { x: e.clientX, y: e.clientY }
    })
    window.addEventListener('mouseleave', () => {
      mouse = { x: -9999, y: -9999 }
    })
    window.addEventListener('resize', resize)

    resize()
    requestAnimationFrame(drawMatrix)

    // Navigation handler
    const handlePageChange = (pageId: string) => {
      document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'))
      document.getElementById(pageId)?.classList.add('active')

      document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'))
      const pageMap: { [key: string]: number } = { landing: 0, updater: 1, roadmap: 2, roast: 3, interview: 4 }
      if (pageMap[pageId] !== undefined) {
        const navBtns = document.querySelectorAll('.nav-btn')
        navBtns[pageMap[pageId]]?.classList.add('active')
      }

      const mainEl = document.getElementById('main')
      if (mainEl) mainEl.scrollTop = 0

      // Hide matrix on non-landing pages
      if (pageId === 'landing') {
        canvas.classList.remove('hidden')
      } else {
        canvas.classList.add('hidden')
      }
    }

    // Attach to window for HTML onclick handlers
    (window as any).goTo = handlePageChange
  }, [])

  return (
    <>
      <canvas id="matrix-canvas"></canvas>

      {/* SIDEBAR */}
      <nav id="sidebar">
        <div className="logo-mark" onClick={() => (window as any).goTo('landing')}>
          Rizz<span>u</span>me
        </div>

        <div className="nav-items">
          <div
            className="nav-btn active"
            onClick={() => (window as any).goTo('landing')}
          >
            <div className="nav-num">01</div>
            <div className="nav-label">Home</div>
            <div className="nav-dot"></div>
          </div>
          <div
            className="nav-btn"
            onClick={() => (window as any).goTo('updater')}
          >
            <div className="nav-num">02</div>
            <div className="nav-label">Polish</div>
            <div className="nav-dot"></div>
          </div>
          <div
            className="nav-btn"
            onClick={() => (window as any).goTo('roadmap')}
          >
            <div className="nav-num">03</div>
            <div className="nav-label">Plan</div>
            <div className="nav-dot"></div>
          </div>
          <div
            className="nav-btn"
            onClick={() => (window as any).goTo('roast')}
          >
            <div className="nav-num">04</div>
            <div className="nav-label">Roast</div>
            <div className="nav-dot"></div>
          </div>
          <div
            className="nav-btn"
            onClick={() => (window as any).goTo('interview')}
          >
            <div className="nav-num">05</div>
            <div className="nav-label">Interview</div>
            <div className="nav-dot"></div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div id="main">
        {children}
      </div>

      {/* TICKER BAR */}
      <div className="ticker-bar">
        <div className="ticker-inner">
          rizzume  <span>•</span>  ai job prep  <span>•</span>  resume polish  <span>•</span>  skill roadmap  <span>•</span>  mock interview  <span>•</span>  rizzume  <span>•</span>  ai job prep  <span>•</span>  resume polish  <span>•</span>  skill roadmap  <span>•</span>  mock interview
        </div>
      </div>
    </>
  )
}
