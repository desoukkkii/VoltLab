export default function PropertiesPanel({ circuit, onClose }) {
  const comp = circuit.propertiesComp

  return (
    <aside className="w-[280px] max-w-[85vw] bg-[#11141c] border-l border-white/[0.07] shrink-0 flex flex-col overflow-y-auto scrollbar-thin" aria-label="Properties">
      <div className="flex items-center justify-between px-[18px] py-4 border-b border-white/[0.07] sticky top-0 bg-[#11141c] z-[1]">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6b7794]">Properties</h3>
        <div className="flex items-center gap-2">
          {comp && (
            <button
              onClick={() => circuit.removeComponent(comp)}
              className="text-[11px] font-semibold text-red-500/70 hover:text-red-500 px-2 py-1 rounded-[6px] hover:bg-red-500/8 transition-all"
              title="Delete component"
            >
              Delete
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-[6px] text-[#6b7794] hover:text-[#f4f6fb] hover:bg-white/[0.05] transition-all" aria-label="Close properties panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="p-[18px] flex-1">
        {!comp ? (
          <div className="flex flex-col items-center gap-3 py-10 px-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7794" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <p className="text-[13px] text-[#6b7794] text-center leading-relaxed">
              Select a component to edit its properties.
            </p>
          </div>
        ) : (
          <div key={comp.id}>
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-white/[0.05]">
              <div className="w-8 h-8 rounded-[8px] bg-blue-400/10 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[#f4f6fb]">{comp.label}</div>
                <div className="text-[11px] text-[#6b7794] capitalize">{comp.type.replace(/-/g, ' ')}</div>
              </div>
            </div>

            <PropGroup label="Label">
              <input
                type="text"
                defaultValue={comp.label}
                key={comp.id + '-label'}
                onInput={(e) => { comp.label = e.target.value; circuit.triggerRender() }}
                className="w-full px-2.5 py-[9px] bg-[#0f1218] border border-white/[0.07] rounded-[8px] text-[13px] text-[#f4f6fb] font-inherit outline-none transition-all duration-[180ms] focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.18)]"
              />
            </PropGroup>

            {comp.type === 'clock' && (
              <PropGroup label="Clock Speed (Hz)">
                <input
                  type="number"
                  defaultValue={comp.clockFreq}
                  key={comp.id + '-freq'}
                  min="0.1"
                  max="100"
                  step="0.1"
                  onInput={(e) => {
                    const f = parseFloat(e.target.value)
                    if (!isNaN(f) && f > 0) {
                      comp.clockFreq = f
                      if (comp.clockRunning) {
                        if (comp.clockTimer) clearInterval(comp.clockTimer)
                        const tick = () => {
                          if (!comp.clockRunning) return
                          comp.value = comp.value ? 0 : 1
                          circuit.propagateFromComponent(comp)
                          circuit.triggerRender()
                        }
                        const interval = Math.max(50, Math.round(1000 / comp.clockFreq / 2))
                        comp.clockTimer = setInterval(tick, interval)
                      }
                    }
                  }}
                  className="w-full px-2.5 py-[9px] bg-[#0f1218] border border-white/[0.07] rounded-[8px] text-[13px] text-[#f4f6fb] font-inherit outline-none transition-all duration-[180ms] focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.18)]"
                />
              </PropGroup>
            )}

            {comp.type === 'toggle-switch' && (
              <PropGroup label="Initial Value">
                <select
                  defaultValue={comp.initialValue}
                  key={comp.id + '-init'}
                  onChange={(e) => {
                    comp.initialValue = parseInt(e.target.value)
                    comp.value = comp.initialValue
                    circuit.propagateFromComponent(comp)
                    circuit.triggerRender()
                  }}
                  className="w-full px-2.5 py-[9px] bg-[#0f1218] border border-white/[0.07] rounded-[8px] text-[13px] text-[#f4f6fb] font-inherit outline-none transition-all duration-[180ms] focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.18)]"
                >
                  <option value="0">LOW (0)</option>
                  <option value="1">HIGH (1)</option>
                </select>
              </PropGroup>
            )}

            {(comp.type === 'led' || comp.type === 'lamp') && (
              <PropGroup label="Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    defaultValue={comp.color || (comp.type === 'lamp' ? '#22C55E' : '#EF4444')}
                    key={comp.id + '-color'}
                    onInput={(e) => {
                      comp.color = e.target.value
                      circuit.triggerRender()
                    }}
                    className="w-10 h-[38px] p-[3px] bg-[#0f1218] border border-white/[0.07] rounded-[8px] cursor-pointer outline-none transition-all duration-[180ms] focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.18)]"
                  />
                  <span className="text-[13px] text-[#93a0bb] font-mono">{comp.color || (comp.type === 'lamp' ? '#22C55E' : '#EF4444')}</span>
                </div>
              </PropGroup>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

function PropGroup({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-semibold text-[#6b7794] uppercase tracking-[0.06em] mb-[7px]">
        {label}
      </label>
      {children}
    </div>
  )
}
