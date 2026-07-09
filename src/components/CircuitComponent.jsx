import { useRef, useLayoutEffect } from 'react'
import { SEG_PATTERNS, SEG_CLASSES, gateBorderColors } from './shared.jsx'

function usePinRefs(comp) {
  const elRef = useRef(null)
  useLayoutEffect(() => {
    for (const pin of comp.pins) {
      pin.el = elRef.current?.querySelector(`[data-pin="${pin.id}"]`) || null
    }
  })
  return elRef
}

function getPinStyle(pin, comp) {
  const pos = pin.getPos()
  return {
    left: pin.type === 'input' ? -5 : undefined,
    right: pin.type === 'output' ? -5 : undefined,
    top: pos.y - comp.y - 5.5,
  }
}

export default function CircuitComponent({ comp, circuit }) {
  const elRef = usePinRefs(comp)
  const isSelected = circuit.selectedComponent === comp
  const borderColor = gateBorderColors[comp.type]

  return (
    <div
      ref={elRef}
      data-id={comp.id}
      className="absolute pointer-events-auto cursor-pointer select-none z-[1] transition-[filter,transform] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:z-[5] hover:brightness-110"
      style={{ left: comp.x, top: comp.y, width: comp.width, height: comp.height }}
    >
      <div
        className={`relative flex flex-col items-center justify-center w-full h-full rounded-[12px] px-[14px] py-2.5 min-w-[80px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-[180ms] ${
          isSelected
            ? 'border-blue-400 shadow-[0_0_0_1px_rgba(96,165,250,0.35),0_8px_32px_-8px_rgba(96,165,250,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]'
            : ''
        }`}
        style={{
          background: 'linear-gradient(180deg, #1b2030, #161b29)',
          border: `1px solid ${borderColor || 'rgba(255,255,255,0.07)'}`,
        }}
      >
        <ComponentBody comp={comp} circuit={circuit} />
      </div>

      {comp.pins.map(pin => (
        <div
          key={pin.id}
          data-pin={pin.id}
          className={`pin ${pin.value ? 'high' : ''}`}
          style={getPinStyle(pin, comp)}
        />
      ))}
    </div>
  )
}

function ComponentBody({ comp, circuit }) {
  const renderer = bodyRenderers[comp.type] || DefaultBody
  return renderer({ comp, circuit })
}

const DefaultBody = ({ comp }) => (
  <div className="text-[13px] font-semibold text-[#f4f6fb] tracking-[-0.005em] leading-tight">
    {comp.label}
  </div>
)

const renderLED = ({ comp }) => {
  const colorClass = comp.color === '#22C55E' ? 'green-led' : comp.color === '#0A84FF' ? 'blue-led' : ''
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className={`led-light ${comp.getInputValue(0) ? 'high ' + colorClass : ''}`} />
      <div className="text-[13px] font-semibold text-[#f4f6fb] tracking-[-0.005em] leading-tight">
        {comp.label}
      </div>
    </div>
  )
}

const renderLamp = ({ comp }) => {
  const colorClass = comp.color === '#0A84FF' ? 'blue-lamp' : comp.color !== '#22C55E' ? 'white-lamp' : ''
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className={`lamp-light ${comp.getInputValue(0) ? 'high ' + colorClass : ''}`} />
      <div className="text-[13px] font-semibold text-[#f4f6fb] tracking-[-0.005em] leading-tight">
        {comp.label}
      </div>
    </div>
  )
}

const renderSevenSegment = ({ comp }) => {
  const val = (comp.getInputValue(0) | (comp.getInputValue(1) << 1) | (comp.getInputValue(2) << 2) | (comp.getInputValue(3) << 3))
  const pattern = SEG_PATTERNS[val] || [0, 0, 0, 0, 0, 0, 0]
  return (
    <>
      <div className="relative w-[56px] h-24 mx-auto">
        {SEG_CLASSES.map((cls, i) => (
          <div key={cls} className={`ss-segment ${cls} ${pattern[i] ? 'on' : ''}`} />
        ))}
      </div>
      <div className="text-[13px] font-semibold text-[#f4f6fb] tracking-[-0.005em] leading-tight mt-1">
        {comp.label}
      </div>
      <div className="text-[12px] font-mono text-[#93a0bb] mt-1.5 text-center tabular-nums">
        {val}
      </div>
    </>
  )
}

const renderInput = ({ comp }) => {
  const isHigh = comp.type === 'push-button' ? (comp.pressed ? 1 : 0) : comp.value
  return (
    <div className="flex items-center gap-2.5">
      <div className="text-[13px] font-semibold text-[#f4f6fb] tracking-[-0.005em] leading-tight">
        {comp.label}
      </div>
      <span
        className={`inline-block w-[12px] h-[12px] rounded-full ml-2 align-middle transition-all duration-[180ms] ${
          isHigh
            ? comp.type === 'clock' && comp.clockRunning
              ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.55)] animate-clock-blink'
              : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.55)]'
            : 'bg-[#6b7794]'
        }`}
      />
    </div>
  )
}

const renderGate = ({ comp, circuit }) => {
  const sym = circuit.getTypeSymbol(comp.type)
  return (
    <>
      <div className="text-[13px] font-semibold text-[#f4f6fb] tracking-[-0.005em] leading-tight">
        {comp.label}
      </div>
      {sym && (
        <div className="text-[15px] font-bold text-[#93a0bb] mt-1 font-mono tracking-[0.02em]">
          {sym}
        </div>
      )}
    </>
  )
}

const bodyRenderers = {
  led: renderLED,
  lamp: renderLamp,
  'seven-segment': renderSevenSegment,
  'toggle-switch': renderInput,
  'push-button': renderInput,
  clock: renderInput,
  and: renderGate,
  or: renderGate,
  not: renderGate,
  nand: renderGate,
  nor: renderGate,
  xor: renderGate,
  xnor: renderGate,
  'half-adder': renderGate,
  'full-adder': renderGate,
  multiplexer: renderGate,
  decoder: renderGate,
  encoder: renderGate,
}
