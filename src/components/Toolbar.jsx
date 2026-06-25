export default function Toolbar({ circuit, onToggleSidebar, onToggleProperties }) {
  return (
    <header className="flex items-center justify-between gap-1.5 sm:gap-3 px-3 sm:px-5 h-[60px] bg-gradient-to-b from-[rgba(22,26,36,0.95)] to-[rgba(17,20,28,0.95)] backdrop-saturate-[1.4] backdrop-blur-md border-b border-white/[0.07] shrink-0 z-[100]">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-transparent border border-white/[0.07] text-[#93a0bb] hover:text-[#f4f6fb] hover:bg-white/[0.05] transition-all shrink-0"
          aria-label="Toggle component library"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="grid place-items-center w-9 h-9 rounded-[10px] bg-blue-400/8 border border-blue-400/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] shrink-0" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
            <path d="M4 6h6a6 6 0 0 1 0 12H4V6z" stroke="url(#lg)" strokeWidth="2" fill="none" strokeLinejoin="round" />
            <path d="M16 12h3" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold tracking-[-0.015em] text-[#f4f6fb] whitespace-nowrap flex items-baseline gap-2">
            Logiq
            <span className="text-xs font-medium text-[#93a0bb] hidden md:inline">Circuit Simulator</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap" role="toolbar" aria-label="Circuit actions">
        <ToolbarBtn onClick={() => circuit.newCircuit()} title="Start a new circuit (Ctrl+N)" svg={<path d="M12 5v14M5 12h14" />}>
          New
        </ToolbarBtn>
        <ToolbarBtn onClick={() => circuit.showSave()} title="Save circuit (Ctrl+S)" svg={<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>}>
          Save
        </ToolbarBtn>
        <ToolbarBtn onClick={() => circuit.showLoad()} title="Load saved circuit (Ctrl+O)" svg={<path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H3z"/>}>
          Load
        </ToolbarBtn>
        <div className="w-px h-[22px] bg-white/[0.07] mx-1.5" aria-hidden="true" />
        <ToolbarBtn onClick={() => circuit.clear()} title="Clear workspace" svg={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>}>
          Clear
        </ToolbarBtn>
        <button
          onClick={circuit.toggleRun}
          title="Start / stop clock components"
          className={`inline-flex items-center gap-2 px-4 py-[9px] rounded-[8px] text-[14px] font-medium cursor-pointer whitespace-nowrap select-none border transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            circuit.isRunning
              ? 'bg-gradient-to-b from-red-500 to-red-700 border-transparent text-white shadow-[0_6px_22px_-10px_rgba(239,68,68,0.7)]'
              : 'bg-gradient-to-b from-blue-400 to-violet-600 border-transparent text-white shadow-[0_6px_22px_-10px_rgba(124,58,237,0.6),inset_0_1px_0_rgba(255,255,255,0.18)] hover:brightness-110'
          } active:translate-y-[1px] active:scale-[0.99]`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-85">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="hidden sm:inline">{circuit.isRunning ? 'Stop' : 'Start Clocks'}</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggleProperties}
          className="xl:hidden inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-transparent border border-white/[0.07] text-[#93a0bb] hover:text-[#f4f6fb] hover:bg-white/[0.05] transition-all shrink-0"
          aria-label="Toggle properties panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <div className="flex items-center gap-1 bg-[#161a24] border border-white/[0.07] rounded-[10px] p-[3px]">
          <button
            onClick={circuit.zoomOut}
            className="inline-flex items-center justify-center p-[6px_12px] text-sm bg-transparent border-none rounded-[8px] text-[#f4f6fb] cursor-pointer whitespace-nowrap transition-all duration-[180ms] hover:bg-white/[0.05]"
            aria-label="Zoom out"
          >
            &minus;
          </button>
          <span className="text-sm font-semibold text-[#93a0bb] min-w-[44px] text-center tabular-nums" aria-live="polite">
            {circuit.zoomLevel}
          </span>
          <button
            onClick={circuit.zoomIn}
            className="inline-flex items-center justify-center p-[6px_12px] text-sm bg-transparent border-none rounded-[8px] text-[#f4f6fb] cursor-pointer whitespace-nowrap transition-all duration-[180ms] hover:bg-white/[0.05]"
            aria-label="Zoom in"
          >
            +
          </button>
          <div className="w-px h-[24px] bg-white/[0.07] mx-2" aria-hidden="true" />
          <button
            onClick={circuit.fitAll}
            className="inline-flex items-center gap-1.5 px-4 py-[7px] bg-transparent border border-white/[0.07] rounded-[8px] text-[14px] font-medium text-[#f4f6fb] cursor-pointer whitespace-nowrap transition-all duration-[180ms] hover:bg-white/[0.05] active:translate-y-[1px] active:scale-[0.99]"
            title="Fit to view"
          >
            Fit
          </button>
        </div>
      </div>
    </header>
  )
}

function ToolbarBtn({ onClick, title, svg, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="group inline-flex items-center gap-2 px-4 py-[9px] bg-transparent border border-white/[0.07] rounded-[8px] text-[14px] font-medium text-[#f4f6fb] cursor-pointer whitespace-nowrap select-none transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.05] hover:border-white/[0.14] active:translate-y-[1px] active:scale-[0.99]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-85 group-hover:opacity-100">
        {svg}
      </svg>
      <span className="hidden sm:inline">{children}</span>
    </button>
  )
}
