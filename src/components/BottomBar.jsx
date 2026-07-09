import { PlusIcon, PlayIcon } from './shared.jsx'

export default function BottomBar({ circuit, onToggleSidebar, onToggleProperties }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[100] flex items-center justify-around gap-1 px-1 py-1.5 bg-gradient-to-t from-[rgba(17,20,28,0.98)] to-[rgba(22,26,36,0.95)] backdrop-blur-md border-t border-white/[0.07] safe-area-bottom" aria-label="Mobile toolbar">
      <BottomBarBtn onClick={onToggleSidebar} label="Components">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      </BottomBarBtn>

      <BottomBarBtn onClick={() => circuit.newCircuit()} label="New">
        <PlusIcon size={20} />
      </BottomBarBtn>

      <BottomBarBtn onClick={circuit.toggleRun} label={circuit.isRunning ? 'Stop' : 'Run'} active={circuit.isRunning}>
        <div className="relative">
          <PlayIcon size={20} />
          {circuit.isRunning && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-ping" />
          )}
        </div>
      </BottomBarBtn>

      <button
        onClick={() => circuit.fitAll()}
        className="flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-[8px] border-none bg-transparent cursor-pointer transition-all duration-[180ms] min-w-0 text-[#6b7794] hover:text-[#f4f6fb] hover:bg-white/[0.05] active:scale-95"
        aria-label="Fit to view"
      >
        <span className="text-[11px] font-semibold tabular-nums">{circuit.zoomLevel}</span>
        <span className="text-[8px] font-semibold uppercase tracking-[0.05em]">Zoom</span>
      </button>

      <BottomBarBtn onClick={onToggleProperties} label="Properties">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </BottomBarBtn>
    </nav>
  )
}

function BottomBarBtn({ onClick, label, children, active = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-[8px] border-none bg-transparent cursor-pointer transition-all duration-[180ms] min-w-0 ${
        active
          ? 'text-blue-400 scale-110'
          : 'text-[#6b7794] hover:text-[#f4f6fb] hover:bg-white/[0.05]'
      } active:scale-95`}
      aria-label={label}
    >
      {children}
      <span className="text-[9px] font-semibold uppercase tracking-[0.05em]">{label}</span>
    </button>
  )
}
