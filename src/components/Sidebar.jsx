import { useState, useMemo } from 'react'
import { CloseIcon, SearchIcon } from './shared.jsx'

const sections = [
  {
    title: 'Inputs',
    items: [
      { type: 'toggle-switch', label: 'Toggle Switch', icon: 'io' },
      { type: 'push-button', label: 'Push Button', icon: 'io' },
      { type: 'clock', label: 'Clock', icon: 'io' },
    ],
  },
  {
    title: 'Outputs',
    items: [
      { type: 'led', label: 'LED', icon: 'out' },
      { type: 'lamp', label: 'Lamp', icon: 'out' },
      { type: 'seven-segment', label: '7-Segment Display', icon: 'out' },
    ],
  },
  {
    title: 'Logic Gates',
    items: [
      { type: 'and', label: 'AND', icon: 'gate' },
      { type: 'or', label: 'OR', icon: 'gate' },
      { type: 'not', label: 'NOT', icon: 'gate' },
      { type: 'nand', label: 'NAND', icon: 'gate' },
      { type: 'nor', label: 'NOR', icon: 'gate' },
      { type: 'xor', label: 'XOR', icon: 'gate' },
      { type: 'xnor', label: 'XNOR', icon: 'gate' },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { type: 'half-adder', label: 'Half Adder', icon: 'adv' },
      { type: 'full-adder', label: 'Full Adder', icon: 'adv' },
      { type: 'multiplexer', label: 'Multiplexer', icon: 'adv' },
      { type: 'decoder', label: 'Decoder', icon: 'adv' },
      { type: 'encoder', label: 'Encoder', icon: 'adv' },
    ],
  },
  {
    title: 'Examples',
    items: [
      { example: 'half-adder', label: 'Half Adder', icon: 'ex' },
      { example: 'full-adder', label: 'Full Adder', icon: 'ex' },
      { example: 'xor-gate', label: 'XOR Gate', icon: 'ex' },
      { example: 'sr-latch', label: 'SR Latch', icon: 'ex' },
      { example: '4bit-counter', label: '4-bit Counter', icon: 'ex' },
    ],
  },
]

const iconRenderers = {
  io: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  out: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-8M18 8l4 4-4 4"/><path d="M2 6v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>,
  gate: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h6a6 6 0 0 1 0 12H6V4z"/><path d="M2 4v12"/><path d="M18 8h4"/><path d="M18 16h4"/></svg>,
  adv: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  ex: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/></svg>,
}

function getIcon(icon, color) {
  const c = color || '#93a0bb'
  const render = iconRenderers[icon] || iconRenderers.ex
  return render(c)
}

export default function Sidebar({ circuit, onClose }) {
  const [search, setSearch] = useState('')

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections
    const q = search.toLowerCase()
    return sections
      .map(section => ({
        ...section,
        items: section.items.filter(item => item.label.toLowerCase().includes(q)),
      }))
      .filter(section => section.items.length > 0)
  }, [search])

  return (
    <aside className="w-[260px] bg-[#11141c] border-r border-white/[0.07] shrink-0 h-full flex flex-col overflow-hidden scrollbar-thin" aria-label="Component library">
      <div className="shrink-0 px-3 pb-3 border-b border-white/[0.07] mx-2 pt-3">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7794]">Components</h3>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-[6px] text-[#6b7794] hover:text-[#f4f6fb] hover:bg-white/[0.05] transition-all btn-touch" aria-label="Close component library">
              <CloseIcon />
            </button>
          )}
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b7794] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="w-full pl-8 pr-3 py-[9px] text-[14px] bg-[#0f1218] border border-white/[0.07] rounded-[8px] text-[#f4f6fb] placeholder-[#6b7794] outline-none transition-all focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.18)]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[#6b7794] hover:text-[#f4f6fb]"
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 scrollbar-thin">
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <div key={section.title} className="mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b7794] px-[18px] py-[6px_18px_6px]">
                {section.title}
              </h3>
              <div className="flex flex-col gap-0.5 px-2">
                {section.items.map((item) => {
                  const isExample = 'example' in item
                  const isActive = !isExample && circuit.activeType === item.type
                  return (
                    <div
                      key={item.label}
                      tabIndex={0}
                      role="button"
                      onClick={() => {
                        if (isExample) {
                          circuit.loadExample(item.example)
                          onClose?.()
                        } else {
                          circuit.setActiveType(circuit.activeType === item.type ? null : item.type)
                        }
                      }}
                      className={`group flex items-center gap-2.5 relative px-3 py-[9px] text-[13px] cursor-pointer rounded-[6px] select-none transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        isExample
                          ? 'hover:bg-green-500/8 active:bg-green-500/12'
                          : isActive
                            ? 'bg-blue-400/10'
                            : 'hover:bg-white/[0.04] active:bg-white/[0.06]'
                      }`}
                    >
                      <span className={`shrink-0 w-7 h-7 rounded-[6px] flex items-center justify-center transition-all duration-[180ms] ${
                        isExample
                          ? 'bg-green-500/10 group-hover:bg-green-500/15'
                          : isActive
                            ? 'bg-blue-400/15'
                            : 'bg-white/[0.04] group-hover:bg-white/[0.07]'
                      }`}>
                        {getIcon(item.icon || 'gate', isExample ? '#22c55e' : isActive ? '#60a5fa' : '#93a0bb')}
                      </span>
                      <span className={`font-medium transition-colors duration-[180ms] ${
                        isExample
                          ? 'text-green-400'
                          : isActive
                            ? 'text-blue-400'
                            : 'text-[#93a0bb] group-hover:text-[#f4f6fb]'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full min-h-[120px] px-4">
            <p className="text-[13px] text-[#6b7794] text-center">No components found.</p>
          </div>
        )}
      </div>
      <div className="shrink-0 pt-3.5 pb-5 border-t border-white/[0.07] mx-2">
        <p className="text-[11.5px] text-[#6b7794] leading-relaxed px-3">
          Tip: tap a component, then tap the canvas to place. Drag from an output pin to wire it up.
        </p>
      </div>
    </aside>
  )
}
