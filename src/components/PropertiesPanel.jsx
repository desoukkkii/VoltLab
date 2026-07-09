import { CloseIcon, SettingsIcon, INPUT_CLASS } from './shared.jsx'

export default function PropertiesPanel({ circuit, onClose }) {
  const comp = circuit.propertiesComp

  return (
    <aside className="w-[280px] max-w-[85vw] bg-[#11141c] border-l border-white/[0.07] shrink-0 h-full flex flex-col overflow-hidden scrollbar-thin" aria-label="Properties">
      <div className="shrink-0 flex items-center justify-between px-[18px] py-4 border-b border-white/[0.07] bg-[#11141c] z-[1]">
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
            <button onClick={onClose} className="p-1 rounded-[6px] text-[#6b7794] hover:text-[#f4f6fb] hover:bg-white/[0.05] transition-all btn-touch" aria-label="Close properties panel">
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className="p-[18px]">
          {!comp ? (
            <EmptyState />
          ) : (
            <PropertyFields key={comp.id} comp={comp} circuit={circuit} />
          )}
        </div>
      </div>
    </aside>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 px-2">
      <SettingsIcon size={32} className="opacity-40" />
      <p className="text-[13px] text-[#6b7794] text-center leading-relaxed">
        Select a component to edit its properties.
      </p>
    </div>
  )
}

function PropertyFields({ comp, circuit }) {
  return (
    <div>
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
          className={INPUT_CLASS}
        />
      </PropGroup>

      {comp.type === 'clock' && <ClockFrequencyField comp={comp} circuit={circuit} />}
      {comp.type === 'toggle-switch' && <InitialValueField comp={comp} circuit={circuit} />}
      {(comp.type === 'led' || comp.type === 'lamp') && <ColorField comp={comp} circuit={circuit} />}
    </div>
  )
}

function ClockFrequencyField({ comp, circuit }) {
  const handleInput = (e) => {
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
  }

  return (
    <PropGroup label="Clock Speed (Hz)">
      <input
        type="number"
        defaultValue={comp.clockFreq}
        key={comp.id + '-freq'}
        min="0.1"
        max="100"
        step="0.1"
        onInput={handleInput}
        className={INPUT_CLASS}
      />
    </PropGroup>
  )
}

function InitialValueField({ comp, circuit }) {
  const handleChange = (e) => {
    comp.initialValue = parseInt(e.target.value)
    comp.value = comp.initialValue
    circuit.propagateFromComponent(comp)
    circuit.triggerRender()
  }

  return (
    <PropGroup label="Initial Value">
      <select
        defaultValue={comp.initialValue}
        key={comp.id + '-init'}
        onChange={handleChange}
        className={INPUT_CLASS}
      >
        <option value="0">LOW (0)</option>
        <option value="1">HIGH (1)</option>
      </select>
    </PropGroup>
  )
}

function ColorField({ comp, circuit }) {
  const defaultColor = comp.color || (comp.type === 'lamp' ? '#22C55E' : '#EF4444')
  const handleInput = (e) => {
    comp.color = e.target.value
    circuit.triggerRender()
  }

  return (
    <PropGroup label="Color">
      <div className="flex items-center gap-2">
        <input
          type="color"
          defaultValue={defaultColor}
          key={comp.id + '-color'}
          onInput={handleInput}
          className="w-10 h-[38px] p-[3px] bg-[#0f1218] border border-white/[0.07] rounded-[8px] cursor-pointer outline-none transition-all duration-[180ms] focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.18)]"
        />
        <span className="text-[13px] text-[#93a0bb] font-mono">{defaultColor}</span>
      </div>
    </PropGroup>
  )
}

function PropGroup({ label, children }) {
  return (
    <div className="mb-4">
      <span className="block text-[11px] font-semibold text-[#6b7794] uppercase tracking-[0.06em] mb-[7px]">
        {label}
      </span>
      {children}
    </div>
  )
}
