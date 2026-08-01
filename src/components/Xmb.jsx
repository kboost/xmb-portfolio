import { useCallback, useEffect, useRef, useState } from 'react'
import { categories, profile, startCategory } from '../config.js'
import Icon from './Icon.jsx'
import BrandIcon from './BrandIcon.jsx'
import Clock from './Clock.jsx'
import WaveBackground, { PALETTE, THEME_NAMES } from './WaveBackground.jsx'

const nextColor = (c) => (c == null ? 0 : c >= PALETTE.length - 1 ? null : c + 1)
const swatch = (i) => {
  const [hh, s] = PALETTE[i][0]
  return `hsl(${hh}, ${Math.min(s + 25, 90)}%, 52%)`
}

const ITEM_H = 100
const SWIPE_MIN = 36
const LIST_BELOW = 96
const LIST_ABOVE = -8

const STATUS_COLORS = {
  LIVE: '#00ff41',
  BETA: '#3b82f6',
  DEMO: '#f59e0b',
  DEV: '#a855f7',
  IDEA: '#5a5a7a',
}

const START_INDEX = Math.max(0, categories.findIndex((c) => c.id === startCategory))

export default function Xmb() {
  const [catIndex, setCatIndex] = useState(START_INDEX)
  const [itemIndices, setItemIndices] = useState(() => categories.map(() => 0))
  const [opened, setOpened] = useState(null)
  const [colorIndex, setColorIndex] = useState(categories[START_INDEX].color ?? null)
  const [hintVisible, setHintVisible] = useState(true)

  const itemIndex = itemIndices[catIndex]
  const activeCat = categories[catIndex]

  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  const moveCat = useCallback((dir) => {
    setCatIndex((i) => {
      const next = Math.min(categories.length - 1, Math.max(0, i + dir))
      const catColor = categories[next].color
      if (catColor != null) setColorIndex(catColor)
      return next
    })
  }, [])

  const moveItem = useCallback(
    (dir) => {
      setItemIndices((arr) => {
        const cur = arr[catIndex]
        const max = categories[catIndex].items.length - 1
        const next = Math.min(max, Math.max(0, cur + dir))
        if (next === cur) return arr
        const copy = arr.slice()
        copy[catIndex] = next
        return copy
      })
    },
    [catIndex],
  )

  const openItem = useCallback(() => {
    setOpened(categories[catIndex].items[itemIndices[catIndex]])
  }, [catIndex, itemIndices])

  // ── Konami code ──
  const konamiRef = useRef([])
  const KONAMI_SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
  useEffect(() => {
    const onKey = (e) => {
      konamiRef.current.push(e.key)
      konamiRef.current = konamiRef.current.slice(-KONAMI_SEQ.length)
      if (konamiRef.current.length === KONAMI_SEQ.length &&
          konamiRef.current.every((k, i) => k === KONAMI_SEQ[i])) {
        setColorIndex(null)
        konamiRef.current = []
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Touch ──
  const touchRef = useRef(null)
  const onTouchStart = (e) => {
    if (opened) return
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    const start = touchRef.current
    touchRef.current = null
    if (!start || opened) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return
    e.preventDefault()
    if (Math.abs(dx) > Math.abs(dy)) moveCat(dx < 0 ? 1 : -1)
    else moveItem(dy < 0 ? 1 : -1)
  }

  // ── Keyboard navigation ──
  useEffect(() => {
    const onKey = (e) => {
      if (opened) {
        if (e.key === 'Escape' || e.key === 'Backspace' || e.key.toLowerCase() === 'q') {
          e.preventDefault()
          setOpened(null)
        }
        if (e.key === 'Enter' && opened.href) window.open(opened.href, '_blank', 'noopener')
        return
      }
      switch (e.key.length === 1 ? e.key.toLowerCase() : e.key) {
        case 'ArrowLeft': case 'a': e.preventDefault(); moveCat(-1); break
        case 'ArrowRight': case 'd': e.preventDefault(); moveCat(1); break
        case 'ArrowUp': case 'w': e.preventDefault(); moveItem(-1); break
        case 'ArrowDown': case 's': e.preventDefault(); moveItem(1); break
        case 'Enter': case ' ': e.preventDefault(); openItem(); break
        case 'h':
          if (e.ctrlKey) { e.preventDefault(); setHintVisible((v) => !v) }
          break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [opened, moveCat, moveItem, openItem])

  const barTransform = `translateX(calc(var(--bar-origin) - ${catIndex} * var(--slot)))`

  return (
    <div className="xmb" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <WaveBackground colorIndex={colorIndex} />

      <header className="xmb-top">
        <div className="xmb-id">
          <span className="xmb-name">{profile.name}</span>
          <span className="xmb-tag">{profile.tagline}</span>
        </div>
        <div className="xmb-top-right">
          <Clock />
        </div>
      </header>

      {/* Keyboard hint */}
      <div className={`xmb-hint ${hintVisible ? 'is-visible' : ''}`}>
        ← → navegar · ↑ ↓ seleccionar · Enter abrir · Ctrl+H ayuda
      </div>

      {/* Ambient category indicator */}
      <div className="xmb-ambient">
        <span className="xmb-ambient-dot" style={{ background: swatch(colorIndex ?? 0) }} />
        <span className="xmb-ambient-label">{colorIndex != null ? THEME_NAMES[colorIndex] : 'Auto'}</span>
      </div>

      <div className="xmb-cross">
        <div className="xmb-bar" style={{ transform: barTransform }}>
          {categories.map((cat, ci) => {
            const active = ci === catIndex
            return (
              <div key={cat.id} className={`xmb-col ${active ? 'is-active' : ''}`}>
                <button
                  className="xmb-cat"
                  onClick={() => {
                    if (active) openItem()
                    else {
                      setCatIndex(ci)
                      if (cat.color != null) setColorIndex(cat.color)
                    }
                  }}
                >
                  <span className="xmb-cat-icon"><Icon name={cat.icon} /></span>
                  <span className="xmb-cat-label">
                    {cat.label}
                    <span className="xmb-cat-count">{cat.items.length}</span>
                  </span>
                </button>

                {active && (
                  <ul className="xmb-items">
                    {cat.items.map((it, ii) => {
                      const rel = ii - itemIndex
                      const sel = rel === 0
                      const dist = Math.abs(rel)
                      const y = rel >= 0 ? LIST_BELOW + rel * ITEM_H : LIST_ABOVE + rel * ITEM_H
                      const delay = Math.abs(rel) * 0.03
                      const statusColor = STATUS_COLORS[it.status] || null
                      return (
                        <li
                          key={it.id}
                          className={`xmb-item ${sel ? 'is-sel' : ''}`}
                          style={{
                            transform: `translateY(${y}px) scale(${sel ? 1.06 : 1})`,
                            opacity: sel ? 1 : Math.max(0.16, 0.66 - dist * 0.16),
                            transitionDelay: `${delay}s`,
                          }}
                          onClick={() => {
                            if (sel) openItem()
                            else {
                              setItemIndices((arr) => { const c = arr.slice(); c[ci] = ii; return c })
                            }
                          }}
                        >
                          <div className="xmb-item-row">
                            {statusColor && (
                              <span className="xmb-item-dot" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
                            )}
                            <div className="xmb-item-text">
                              <span className="xmb-item-title">{it.title}</span>
                              {it.subtitle && <span className="xmb-item-sub">{it.subtitle}</span>}
                            </div>
                            {statusColor && (
                              <span className="xmb-item-status" style={{ color: statusColor }}>{it.status}</span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button
        className="theme-switch"
        onClick={() => setColorIndex(nextColor)}
        title="Switch wave color"
      >
        <span
          className={`theme-swatch ${colorIndex == null ? 'is-auto' : ''}`}
          style={colorIndex == null ? undefined : { background: swatch(colorIndex) }}
        />
        <span className="theme-label">
          {colorIndex == null ? 'Auto' : THEME_NAMES[colorIndex]}
        </span>
      </button>

      {opened && (
        <div className="detail" onClick={() => setOpened(null)}>
          <div className="detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="detail-head">
              <span className="detail-cat">{activeCat.label}</span>
              <button className="detail-close" onClick={() => setOpened(null)}>✕</button>
            </div>
            <h2 className="detail-title">
              {opened.logo && <BrandIcon name={opened.logo} size={26} />}
              {opened.title}
            </h2>
            {opened.subtitle && <div className="detail-sub">{opened.subtitle}</div>}
            {opened.status && STATUS_COLORS[opened.status] && (
              <div className="detail-status">
                <span className="detail-status-dot" style={{ background: STATUS_COLORS[opened.status] }} />
                <span style={{ color: STATUS_COLORS[opened.status], fontWeight: 600 }}>{opened.status}</span>
              </div>
            )}
            <p className="detail-body">{opened.body}</p>
            {opened.tags && opened.tags.length > 0 && (
              <div className="detail-tags">
                {opened.tags.map((t) => (
                  <span key={t} className="detail-tag">{t}</span>
                ))}
              </div>
            )}
            {opened.href && (
              <a className="detail-link" href={opened.href} target="_blank" rel="noopener noreferrer">
                Open ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Easter egg: click hint area 5x to unlock auto-cycle */}
      <div
        className="xmb-easter-egg"
        onClick={() => setColorIndex(null)}
        title="Click para auto-cycle"
      />
    </div>
  )
}
