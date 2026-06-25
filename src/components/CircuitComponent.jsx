import { useRef, useEffect } from 'react'

const gateBorderColors = {
  and: 'rgba(96,165,250,0.28)',
  or: 'rgba(34,197,94,0.28)',
  not: 'rgba(239,68,68,0.28)',
  nand: 'rgba(245,158,11,0.28)',
  nor: 'rgba(168,85,247,0.28)',
  xor: 'rgba(236,72,153,0.28)',
  xnor: 'rgba(6,182,212,0.28)',
}

export default function CircuitComponent({ comp, circuit }) {
  const elRef = useRef(null)

  useEffect(() => {
    for (const pin of comp.pins) {
      pin.el = elRef.current?.querySelector(`[data-pin="${pin.id}"]`) || null
    }
  })

  const isSelected = circuit.selectedComponent === comp
  const gateBorder = gateBorderColors[comp.type]

  const pinPositions = comp.pins.map(pin => {
    if (pin.type === 'input') {
      const total = comp.inputPins.length
      const yOff = total > 1 ? ((pin.index + 0.5) / total) * comp.height : comp.height / 2
      return { id: pin.id, type: 'input', x: -5, y: yOff - 5.5, value: pin.value }
    } else {
      const total = comp.outputPins.length
      const yOff = total > 1 ? ((pin.index + 0.5) / total) * comp.height : comp.height / 2
      return { id: pin.id, type: 'output', x: comp.width - 5, y: yOff - 5.5, value: pin.value }
    }
  })

  return (
    <div
      ref={elRef}
      data-id={comp.id}
      className="absolute pointer-events-auto cursor-pointer select-none z-[1] transition-[filter,transform] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:z-[5] hover:brightness-110"
      style={{
        left: comp.x,
        top: comp.y,
        width: comp.width,
        height: comp.height,
      }}
    >
      <div
        className={`relative flex flex-col items-center justify-center w-full h-full rounded-[12px] px-[14px] py-2.5 min-w-[80px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-[180ms] ${
          isSelected
            ? 'border-blue-400 shadow-[0_0_0_1px_rgba(96,165,250,0.35),0_8px_32px_-8px_rgba(96,165,250,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]'
            : ''
        }`}
        style={{
          background: 'linear-gradient(180deg, #1b2030, #161b29)',
          border: `1px solid ${gateBorder || 'rgba(255,255,255,0.07)'}`,
        }}
      >
        <ComponentBody comp={comp} circuit={circuit} />
      </div>

      {pinPositions.map(p => (
        <div
          key={p.id}
          data-pin={p.id}
          className={`pin ${p.value ? 'high' : ''}`}
          style={{
            left: p.type === 'input' ? -5 : undefined,
            right: p.type === 'output' ? -5 : undefined,
            top: p.y,
          }}
        />
      ))}
    </div>
  )
}

function ComponentBody({ comp, circuit }) {
  if (comp.type === 'led') {
    const colorClass = comp.value ? (comp.color === '#22C55E' ? 'green-led' : comp.color === '#0A84FF' ? 'blue-led' : '') : ''
    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className={`led-light ${comp.getInputValue(0) ? 'high ' + colorClass : ''}`} />
        <div className="text-[13px] font-semibold text-[#f4f6fb] tracking-[-0.005em] leading-tight">
          {comp.label}
        </div>
      </div>
    )
  }

  if (comp.type === 'lamp') {
    const colorClass = comp.getInputValue(0) ? (
      comp.color === '#0A84FF' ? 'blue-lamp' :
      comp.color !== '#22C55E' ? 'white-lamp' : ''
    ) : ''
    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className={`lamp-light ${comp.getInputValue(0) ? 'high ' + colorClass : ''}`} />
        <div className="text-[13px] font-semibold text-[#f4f6fb] tracking-[-0.005em] leading-tight">
          {comp.label}
        </div>
      </div>
    )
  }

  if (comp.type === 'seven-segment') {
    const val = comp.getInputValue(0) | (comp.getInputValue(1) << 1) | (comp.getInputValue(2) << 2) | (comp.getInputValue(3) << 3)
    const pattern = SEVEN_SEG_PATTERNS[val] || [0, 0, 0, 0, 0, 0, 0]
    return (
      <>
        <div className="relative w-[56px] h-24 mx-auto">
          {SEG_CLASSES_ARR.map((cls, i) => (
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

  if (['toggle-switch', 'push-button', 'clock'].includes(comp.type)) {
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

  const gateTypes = ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor', 'half-adder', 'full-adder', 'multiplexer', 'decoder', 'encoder']
  if (gateTypes.includes(comp.type)) {
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

  return (
    <div className="text-[13px] font-semibold text-[#f4f6fb] tracking-[-0.005em] leading-tight">
      {comp.label}
    </div>
  )
}

const SEVEN_SEG_PATTERNS = {
  0: [1, 1, 1, 1, 1, 1, 0],
  1: [0, 1, 1, 0, 0, 0, 0],
  2: [1, 1, 0, 1, 1, 0, 1],
  3: [1, 1, 1, 1, 0, 0, 1],
  4: [0, 1, 1, 0, 0, 1, 1],
  5: [1, 0, 1, 1, 0, 1, 1],
  6: [1, 0, 1, 1, 1, 1, 1],
  7: [1, 1, 1, 0, 0, 0, 0],
  8: [1, 1, 1, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1],
}

const SEG_CLASSES_ARR = ['ss-a', 'ss-b', 'ss-c', 'ss-d', 'ss-e', 'ss-f', 'ss-g']
