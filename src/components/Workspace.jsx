import { useEffect, useState } from 'react'
import CircuitComponent from './CircuitComponent'

export default function Workspace({ circuit }) {
  const [hintDismissed, setHintDismissed] = useState(() => {
    return sessionStorage.getItem('workspace-hint-dismissed') === 'true'
  })

  useEffect(() => {
    if (circuit.stageRef.current) {
      circuit.stageRef.current.style.transform = 'translate(0px,0px) scale(1)'
    }
  }, [])

  useEffect(() => {
    if (circuit.components.length > 0 && !hintDismissed) {
      const timer = setTimeout(() => {
        setHintDismissed(true)
        sessionStorage.setItem('workspace-hint-dismissed', 'true')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [circuit.components.length, hintDismissed])

  const dismissHint = () => {
    setHintDismissed(true)
    sessionStorage.setItem('workspace-hint-dismissed', 'true')
  }

  return (
    <section
      ref={circuit.containerRef}
      className="relative flex-1 overflow-hidden dot-grid cursor-grab workspace-container min-w-0 touch-none"
      aria-label="Circuit workspace"
    >
      <div
        ref={circuit.stageRef}
        id="workspace-stage"
        className="absolute top-0 left-0 w-full h-full"
        style={{ transformOrigin: '0 0', willChange: 'transform' }}
      >
        <svg
          ref={circuit.wireLayerRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
          aria-hidden="true"
        >
          {circuit.wires.map(wire => {
            const tgt = wire.targetPin.getPos()
            return (
              <g key={wire.id}>
                <path d={wire.getPath()} className={`wire-line ${wire.value ? 'high' : 'low'}`} />
                <circle cx={tgt.x} cy={tgt.y} r="3" className={`wire-dot ${wire.value ? 'high' : 'low'}`} fill={wire.value ? '#22c55e' : 'rgba(255,255,255,0.22)'} />
              </g>
            )
          })}
        </svg>
        <div ref={circuit.componentLayerRef} className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {circuit.components.map(comp => (
            <CircuitComponent key={comp.id} comp={comp} circuit={circuit} />
          ))}
        </div>
      </div>

      <div
        id="selection-box"
        className="absolute border border-blue-400 bg-blue-400/10 rounded pointer-events-none hidden z-10"
        aria-hidden="true"
      />

      <div
        ref={circuit.wireDragIndicatorRef}
        className="absolute inset-0 pointer-events-none z-20 hidden"
        aria-hidden="true"
      >
        <svg className="w-full h-full">
          <line
            ref={circuit.dragLineRef}
            id="drag-line"
            stroke="#60A5FA"
            strokeWidth="2"
            strokeDasharray="5,3"
          />
        </svg>
      </div>

      <div
        className={`absolute left-1/2 bottom-[72px] md:bottom-6 -translate-x-1/2 z-[4] transition-all duration-300 ${
          hintDismissed
            ? 'opacity-0 pointer-events-none translate-y-2'
            : 'opacity-0 animate-hint-in pointer-events-auto'
        }`}
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(17,20,28,0.85)] backdrop-blur border border-white/[0.07] rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.35)] text-center max-w-[min(90vw,400px)]">
          <div className="flex-1 min-w-0">
            <strong className="text-[12.5px] font-semibold text-[#f4f6fb]">Build something logical.</strong>
            <span className="text-[11.5px] text-[#93a0bb] ml-1">Pick a component, click to place. Scroll to zoom, drag to pan.</span>
          </div>
          <button
            onClick={dismissHint}
            className="shrink-0 p-1 rounded-full text-[#6b7794] hover:text-[#f4f6fb] hover:bg-white/[0.08] transition-all"
            aria-label="Dismiss hint"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
