import { useState, useRef, useCallback, useEffect } from 'react'

import { SEG_PATTERNS, SEG_CLASSES } from '../components/shared.jsx'

const GRID_SIZE = 20
const COMP_WIDTH = 100
const COMP_HEIGHT = 60
const PIN_RADIUS = 5
const MAX_DEPTH = 100
const SOURCE_TYPES = ['clock', 'toggle-switch', 'push-button']
const GATE_TYPES = ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor']

function snap(v) { return Math.round(v / GRID_SIZE) * GRID_SIZE }
function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1) }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function pushWireValue(pin, wire) {
  wire.targetPin.setValue(pin.value)
  wire.setValue(pin.value)
}

function evalGate(type, inputs) {
  const a = inputs[0] || 0
  const b = inputs.length > 1 ? inputs[1] || 0 : 0
  switch (type) {
    case 'and': return a & b
    case 'or': return a | b
    case 'not': return a ^ 1
    case 'nand': return (a & b) ^ 1
    case 'nor': return (a | b) ^ 1
    case 'xor': return a ^ b
    case 'xnor': return a ^ b ^ 1
    default: return 0
  }
}

class Pin {
  constructor(component, id, type, index) {
    this.component = component
    this.id = id
    this.type = type
    this.index = index
    this.value = 0
    this.wires = []
    this.el = null
  }
  addWire(wire) { this.wires.push(wire) }
  removeWire(wire) { this.wires = this.wires.filter(w => w !== wire) }
  setValue(val) {
    if (this.value === val) return false
    this.value = val
    return true
  }
  getPos() {
    const c = this.component
    const idx = this.index || 0
    if (this.type === 'input') {
      const total = c.inputPins.length
      const yOff = total > 1 ? ((idx + 0.5) / total) * c.height : c.height / 2
      return { x: c.x, y: c.y + yOff }
    }
    const total = c.outputPins.length
    const yOff = total > 1 ? ((idx + 0.5) / total) * c.height : c.height / 2
    return { x: c.x + c.width, y: c.y + yOff }
  }
}

class Wire {
  constructor(id, sourcePin, targetPin) {
    this.id = id
    this.sourcePin = sourcePin
    this.targetPin = targetPin
    this.value = 0
    sourcePin.addWire(this)
    targetPin.addWire(this)
  }
  setValue(val) {
    if (this.value === val) return false
    this.value = val
    return true
  }
  remove() {
    this.sourcePin.removeWire(this)
    this.targetPin.removeWire(this)
  }
  getPath() {
    const src = this.sourcePin.getPos()
    const tgt = this.targetPin.getPos()
    const dx = tgt.x - src.x
    const cpx = src.x + dx * 0.5
    return `M${src.x},${src.y} C${cpx},${src.y} ${cpx},${tgt.y} ${tgt.x},${tgt.y}`
  }
}

const COMPONENT_CONFIG = {
  not: { inputs: [0], outputs: [0], height: 50 },
  and: { inputs: [0, 1], outputs: [0], height: 70 },
  or: { inputs: [0, 1], outputs: [0], height: 70 },
  nand: { inputs: [0, 1], outputs: [0], height: 70 },
  nor: { inputs: [0, 1], outputs: [0], height: 70 },
  xor: { inputs: [0, 1], outputs: [0], height: 70 },
  xnor: { inputs: [0, 1], outputs: [0], height: 70 },
  'toggle-switch': { outputs: [0], height: 54, init: (c) => { c.value = c.initialValue } },
  'push-button': { outputs: [0], height: 54, init: (c) => { c.pressed = false } },
  clock: { outputs: [0], height: 54, init: (c) => { c.value = c.initialValue; c.clockRunning = false } },
  led: { inputs: [0], width: 90, height: 54 },
  lamp: { inputs: [0], width: 100, height: 60, init: (c) => { c.color = '#22C55E' } },
  'seven-segment': { inputs: [0, 1, 2, 3], width: 100, height: 120, init: (c) => { c.segments = [0, 0, 0, 0, 0, 0, 0] } },
  'half-adder': { inputs: [0, 1], outputs: [0, 1], height: 70, width: 110 },
  'full-adder': { inputs: [0, 1, 2], outputs: [0, 1], height: 90, width: 120 },
  multiplexer: { inputs: [0, 1, 2], outputs: [0], height: 80, width: 110 },
  decoder: { inputs: [0, 1], outputs: [0, 1, 2, 3], height: 90, width: 110 },
  encoder: { inputs: [0, 1, 2, 3], outputs: [0, 1], height: 90, width: 110 },
}

function createPins(c, cfg) {
  for (const idx of cfg.inputs || []) c.createPin('input', idx)
  for (const idx of cfg.outputs || []) c.createPin('output', idx)
}

function createComponent(type, x, y) {
  const cfg = COMPONENT_CONFIG[type]
  if (!cfg) return null
  const c = new Component(type, x, y)
  createPins(c, cfg)
  if (cfg.width) c.width = cfg.width
  if (cfg.height) c.height = cfg.height
  if (cfg.init) cfg.init(c)
  return c
}

class Component {
  constructor(type, x, y) {
    this.id = uid()
    this.type = type
    this.x = x
    this.y = y
    this.width = COMP_WIDTH
    this.height = COMP_HEIGHT
    this.label = type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    this.inputPins = []
    this.outputPins = []
    this.pins = []
    this.selected = false
    this.value = 0
    this.clockTimer = null
    this.clockRunning = false
    this.clockFreq = 1
    this.initialValue = 0
    this.color = '#EF4444'
  }
  createPin(type, index) {
    const id = this.id + '-' + type + index
    const pin = new Pin(this, id, type, index)
    this.pins.push(pin)
    if (type === 'input') this.inputPins.push(pin)
    else this.outputPins.push(pin)
    return pin
  }
  getPinAt(wx, wy) {
    for (const pin of this.pins) {
      const pos = pin.getPos()
      if (dist(wx, wy, pos.x, pos.y) < 10) return pin
    }
    return null
  }
  getInputValue(index) {
    if (index < this.inputPins.length) return this.inputPins[index].value
    return 0
  }
  setOutputValue(index, val) {
    if (index < this.outputPins.length) this.outputPins[index].setValue(val)
  }
  evaluate() {
    if (GATE_TYPES.includes(this.type)) {
      const inputs = this.inputPins.map(p => p.value)
      this.setOutputValue(0, evalGate(this.type, inputs))
    } else if (this.type === 'toggle-switch') {
      this.setOutputValue(0, this.value)
    } else if (this.type === 'push-button') {
      this.setOutputValue(0, this.pressed ? 1 : 0)
    } else if (this.type === 'clock') {
      this.setOutputValue(0, this.value)
    } else if (this.type === 'led' || this.type === 'lamp') {
    } else if (this.type === 'seven-segment') {
    } else if (this.type === 'half-adder') {
      const a = this.getInputValue(0)
      const b = this.getInputValue(1)
      this.setOutputValue(0, a ^ b)
      this.setOutputValue(1, a & b)
    } else if (this.type === 'full-adder') {
      const a = this.getInputValue(0)
      const b = this.getInputValue(1)
      const cin = this.getInputValue(2)
      this.setOutputValue(0, a ^ b ^ cin)
      this.setOutputValue(1, (a & b) | (cin & (a ^ b)))
    } else if (this.type === 'multiplexer') {
      const a = this.getInputValue(0)
      const b = this.getInputValue(1)
      const sel = this.getInputValue(2)
      this.setOutputValue(0, sel ? b : a)
    } else if (this.type === 'decoder') {
      const a = this.getInputValue(0)
      const b = this.getInputValue(1)
      const val = a | (b << 1)
      for (let i = 0; i < 4; i++) this.setOutputValue(i, val === i ? 1 : 0)
    } else if (this.type === 'encoder') {
      let val = 0
      for (let i = 0; i < 4; i++) { if (this.getInputValue(i)) val = i }
      this.setOutputValue(0, val & 1)
      this.setOutputValue(1, (val >> 1) & 1)
    }
  }
  serialize() {
    return {
      id: this.id, type: this.type, x: this.x, y: this.y,
      label: this.label, clockFreq: this.clockFreq,
      initialValue: this.initialValue, color: this.color, value: this.value,
    }
  }
  deserialize(data) {
    this.id = data.id
    for (const pin of this.pins) {
      const idx = pin.index || 0
      pin.id = this.id + '-' + pin.type + idx
    }
    this.x = data.x; this.y = data.y
    if (data.label) this.label = data.label
    if (data.clockFreq) this.clockFreq = data.clockFreq
    if (data.initialValue !== undefined) this.initialValue = data.initialValue
    if (data.color) this.color = data.color
    if (data.value !== undefined) this.value = data.value
  }
  destroy() {
    if (this.clockTimer) { clearInterval(this.clockTimer); this.clockTimer = null }
  }
}

function getTypeSymbol(type) {
  const symbols = {
    and: '&', or: '\u22651', not: '1', nand: '&', nor: '\u22651', xor: '=1', xnor: '=1',
    'half-adder': 'HA', 'full-adder': 'FA', multiplexer: 'MUX', decoder: 'DEC', encoder: 'ENC',
  }
  return symbols[type] || ''
}

const EXAMPLE_CIRCUITS = {
  'half-adder': (ws) => {
    const a = ws.addComponent('toggle-switch', 40, 100)
    const b = ws.addComponent('toggle-switch', 40, 200)
    const xor = ws.addComponent('xor', 200, 100)
    const and = ws.addComponent('and', 200, 200)
    const sum = ws.addComponent('led', 380, 100)
    const carry = ws.addComponent('led', 380, 200)
    if (a) a.label = 'A'; if (b) b.label = 'B'; if (sum) sum.label = 'Sum'; if (carry) carry.label = 'Carry'
    ws.addWire(a.outputPins[0], xor.inputPins[0])
    ws.addWire(a.outputPins[0], and.inputPins[0])
    ws.addWire(b.outputPins[0], xor.inputPins[1])
    ws.addWire(b.outputPins[0], and.inputPins[1])
    ws.addWire(xor.outputPins[0], sum.inputPins[0])
    ws.addWire(and.outputPins[0], carry.inputPins[0])
  },
  'full-adder': (ws) => {
    const a = ws.addComponent('toggle-switch', 40, 60); if (a) a.label = 'A'
    const b = ws.addComponent('toggle-switch', 40, 160); if (b) b.label = 'B'
    const cin = ws.addComponent('toggle-switch', 40, 260); if (cin) cin.label = 'Cin'
    const xor1 = ws.addComponent('xor', 180, 60); if (xor1) xor1.label = 'XOR1'
    const xor2 = ws.addComponent('xor', 320, 60); if (xor2) xor2.label = 'XOR2'
    const and1 = ws.addComponent('and', 180, 180); if (and1) and1.label = 'AND1'
    const and2 = ws.addComponent('and', 320, 200); if (and2) and2.label = 'AND2'
    const or = ws.addComponent('or', 460, 200); if (or) or.label = 'OR'
    const sum = ws.addComponent('led', 500, 60); if (sum) sum.label = 'Sum'
    const cout = ws.addComponent('led', 560, 200); if (cout) cout.label = 'Cout'
    ws.addWire(a.outputPins[0], xor1.inputPins[0])
    ws.addWire(a.outputPins[0], and1.inputPins[0])
    ws.addWire(b.outputPins[0], xor1.inputPins[1])
    ws.addWire(b.outputPins[0], and1.inputPins[1])
    ws.addWire(xor1.outputPins[0], xor2.inputPins[0])
    ws.addWire(xor1.outputPins[0], and2.inputPins[0])
    ws.addWire(cin.outputPins[0], xor2.inputPins[1])
    ws.addWire(cin.outputPins[0], and2.inputPins[1])
    ws.addWire(xor2.outputPins[0], sum.inputPins[0])
    ws.addWire(and1.outputPins[0], or.inputPins[0])
    ws.addWire(and2.outputPins[0], or.inputPins[1])
    ws.addWire(or.outputPins[0], cout.inputPins[0])
  },
  'xor-gate': (ws) => {
    const a = ws.addComponent('toggle-switch', 40, 80); if (a) a.label = 'A'
    const b = ws.addComponent('toggle-switch', 40, 200); if (b) b.label = 'B'
    const not1 = ws.addComponent('not', 180, 60); if (not1) not1.label = 'NOT1'
    const not2 = ws.addComponent('not', 180, 220); if (not2) not2.label = 'NOT2'
    const and1 = ws.addComponent('and', 320, 60); if (and1) and1.label = 'AND1'
    const and2 = ws.addComponent('and', 320, 220); if (and2) and2.label = 'AND2'
    const or = ws.addComponent('or', 460, 140); if (or) or.label = 'OR'
    const out = ws.addComponent('led', 580, 140); if (out) out.label = 'Output'
    ws.addWire(a.outputPins[0], not1.inputPins[0])
    ws.addWire(a.outputPins[0], and2.inputPins[0])
    ws.addWire(b.outputPins[0], not2.inputPins[0])
    ws.addWire(b.outputPins[0], and1.inputPins[0])
    ws.addWire(not1.outputPins[0], and1.inputPins[1])
    ws.addWire(not2.outputPins[0], and2.inputPins[1])
    ws.addWire(and1.outputPins[0], or.inputPins[0])
    ws.addWire(and2.outputPins[0], or.inputPins[1])
    ws.addWire(or.outputPins[0], out.inputPins[0])
  },
  'sr-latch': (ws) => {
    const s = ws.addComponent('toggle-switch', 40, 60); if (s) s.label = 'S'
    const r = ws.addComponent('toggle-switch', 40, 220); if (r) r.label = 'R'
    const nor1 = ws.addComponent('nor', 200, 60); if (nor1) nor1.label = 'NOR1'
    const nor2 = ws.addComponent('nor', 200, 220); if (nor2) nor2.label = 'NOR2'
    const q = ws.addComponent('led', 380, 60); if (q) q.label = 'Q'
    const nq = ws.addComponent('led', 380, 220); if (nq) nq.label = '~Q'
    ws.addWire(r.outputPins[0], nor2.inputPins[0])
    ws.addWire(s.outputPins[0], nor1.inputPins[0])
    ws.addWire(nor1.outputPins[0], nor2.inputPins[1])
    ws.addWire(nor2.outputPins[0], nor1.inputPins[1])
    ws.addWire(nor2.outputPins[0], q.inputPins[0])
    ws.addWire(nor1.outputPins[0], nq.inputPins[0])
  },
  '4bit-counter': (ws) => {
    const freqs = [2, 1, 0.5, 0.25]
    const labels = ['Q0 (2Hz)', 'Q1 (1Hz)', 'Q2 (0.5Hz)', 'Q3 (0.25Hz)']
    for (let i = 0; i < 4; i++) {
      const clk = ws.addComponent('clock', 40, 40 + i * 80)
      if (clk) { clk.clockFreq = freqs[i]; clk.initialValue = 0; clk.label = labels[i] }
      const led = ws.addComponent('led', 180, 40 + i * 80)
      if (led) led.label = 'LED' + i
      if (clk && led) ws.addWire(clk.outputPins[0], led.inputPins[0])
    }
  },
}

export default function useCircuit() {
  const [components, setComponents] = useState([])
  const [wires, setWires] = useState([])
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [activeType, setActiveType] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [zoomLevel, setZoomLevel] = useState('100%')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedCircuits, setSavedCircuits] = useState({})
  const [propertiesComp, setPropertiesComp] = useState(null)
  const [_, forceRender] = useState(0)

  const compsRef = useRef([])
  const wiresRef = useRef([])
  const panX = useRef(0)
  const panY = useRef(0)
  const zoom = useRef(1)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragComp = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragReady = useRef(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const wireDrag = useRef(null)
  const wireDragSource = useRef(null)
  const pressingButton = useRef(null)
  const simRunning = useRef(false)
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const wireLayerRef = useRef(null)
  const componentLayerRef = useRef(null)
  const dragLineRef = useRef(null)
  const wireDragIndicatorRef = useRef(null)

  const syncState = useCallback(() => {
    setComponents([...compsRef.current])
    setWires([...wiresRef.current])
  }, [])

  const triggerRender = useCallback(() => {
    forceRender(n => n + 1)
  }, [])

  const screenToWorld = useCallback((sx, sy) => {
    const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    return {
      x: (sx - rect.left - panX.current) / zoom.current,
      y: (sy - rect.top - panY.current) / zoom.current,
    }
  }, [])

  const updateTransform = useCallback(() => {
    if (stageRef.current) {
      stageRef.current.style.transform = `translate(${panX.current}px,${panY.current}px) scale(${zoom.current})`
    }
    setZoomLevel(Math.round(zoom.current * 100) + '%')
  }, [])

  const getComponentAt = useCallback((wx, wy) => {
    for (let i = compsRef.current.length - 1; i >= 0; i--) {
      const c = compsRef.current[i]
      if (wx >= c.x && wx <= c.x + c.width && wy >= c.y && wy <= c.y + c.height) return c
    }
    return null
  }, [])

  const getPinAt = useCallback((wx, wy) => {
    for (const c of compsRef.current) {
      const pin = c.getPinAt(wx, wy)
      if (pin) return pin
    }
    return null
  }, [])

  const selectComponent = useCallback((comp) => {
    if (selectedComponent && selectedComponent !== comp) {
      selectedComponent.selected = false
    }
    if (comp) {
      comp.selected = true
      setSelectedComponent(comp)
      setPropertiesComp(comp)
    } else {
      setSelectedComponent(null)
      setPropertiesComp(null)
    }
    triggerRender()
  }, [selectedComponent, triggerRender])

  const propagateFromComponent = useCallback((start) => {
    const queue = [start]
    const visitCount = {}
    let depth = 0
    while (queue.length > 0 && depth < MAX_DEPTH) {
      const current = queue.shift()
      depth++
      const cid = current.id
      visitCount[cid] = (visitCount[cid] || 0) + 1
      if (visitCount[cid] > 5) continue
      const oldVals = current.outputPins.map(p => p.value)
      current.evaluate()
      let changed = false
      for (let i = 0; i < current.outputPins.length; i++) {
        if (current.outputPins[i].value !== oldVals[i]) { changed = true; break }
      }
      if (!changed) continue
      for (const outPin of current.outputPins) {
        for (const wire of outPin.wires) {
          pushWireValue(outPin, wire)
          if ((visitCount[wire.targetPin.component.id] || 0) < 5) {
            queue.push(wire.targetPin.component)
          }
        }
      }
    }
    triggerRender()
  }, [triggerRender])

  const evaluateAll = useCallback(() => {
    const ws = wiresRef.current
    const cs = compsRef.current
    for (const w of ws) {
      pushWireValue(w.sourcePin, w)
    }
    for (const c of cs) {
      if (SOURCE_TYPES.includes(c.type)) {
        c.evaluate()
        if (c.outputPins[0]) {
          for (const w of c.outputPins[0].wires) {
            pushWireValue(c.outputPins[0], w)
          }
        }
      }
    }
    for (let pass = 0; pass < 5; pass++) {
      let anyChanged = false
      for (const c of cs) {
        if (SOURCE_TYPES.includes(c.type)) continue
        const oldVals = c.outputPins.map(p => p.value)
        c.evaluate()
        for (let i = 0; i < c.outputPins.length; i++) {
          if (c.outputPins[i].value !== oldVals[i]) {
            anyChanged = true
            for (const w of c.outputPins[i].wires) {
              pushWireValue(c.outputPins[i], w)
            }
          }
        }
      }
      if (!anyChanged) break
    }
    triggerRender()
  }, [triggerRender])

  const addComponent = useCallback((type, wx, wy) => {
    const x = snap(wx); const y = snap(wy)
    const comp = createComponent(type, x, y)
    if (!comp) return null
    compsRef.current.push(comp)
    syncState()
    return comp
  }, [syncState])

  const removeComponent = useCallback((comp) => {
    if (selectedComponent === comp) selectComponent(null)
    const wiresToRemove = []
    for (const pin of comp.pins) { for (const w of [...pin.wires]) wiresToRemove.push(w) }
    for (const w of wiresToRemove) {
      w.remove()
      const idx = wiresRef.current.indexOf(w)
      if (idx > -1) wiresRef.current.splice(idx, 1)
    }
    comp.destroy()
    const idx = compsRef.current.indexOf(comp)
    if (idx > -1) compsRef.current.splice(idx, 1)
    syncState()
    triggerRender()
  }, [selectedComponent, selectComponent, syncState, triggerRender])

  const addWire = useCallback((sourcePin, targetPin) => {
    if (sourcePin.type !== 'output' || targetPin.type !== 'input') return null
    if (sourcePin.component === targetPin.component) return null
    for (const existing of wiresRef.current) {
      if (existing.sourcePin === sourcePin && existing.targetPin === targetPin) return null
      if (existing.targetPin === targetPin) {
        existing.remove()
        const idx = wiresRef.current.indexOf(existing)
        if (idx > -1) wiresRef.current.splice(idx, 1)
        break
      }
    }
    const wire = new Wire(uid(), sourcePin, targetPin)
    wiresRef.current.push(wire)
    syncState()
    return wire
  }, [syncState])

  const updateAllWires = useCallback(() => {
    triggerRender()
  }, [triggerRender])

  const setZoom = useCallback((z) => {
    zoom.current = clamp(z, 0.2, 5)
    updateTransform()
  }, [updateTransform])

  const zoomIn = useCallback(() => setZoom(zoom.current * 1.3), [setZoom])
  const zoomOut = useCallback(() => setZoom(zoom.current / 1.3), [setZoom])

  const fitAll = useCallback(() => {
    const cs = compsRef.current
    if (cs.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const c of cs) {
      if (c.x < minX) minX = c.x
      if (c.y < minY) minY = c.y
      if (c.x + c.width > maxX) maxX = c.x + c.width
      if (c.y + c.height > maxY) maxY = c.y + c.height
    }
    const pad = 40
    const rect = containerRef.current?.getBoundingClientRect() || { width: 800, height: 600 }
    const availW = rect.width - pad * 2
    const availH = rect.height - pad * 2
    const compW = maxX - minX + pad * 2
    const compH = maxY - minY + pad * 2
    const scale = Math.min(availW / Math.max(compW, 1), availH / Math.max(compH, 1), 2)
    zoom.current = clamp(scale, 0.2, 5)
    panX.current = rect.width / 2 - ((minX + maxX) / 2) * zoom.current
    panY.current = rect.height / 2 - ((minY + maxY) / 2) * zoom.current
    updateTransform()
  }, [updateTransform])

  const clear = useCallback(() => {
    for (const w of [...wiresRef.current]) {
      w.remove()
    }
    for (const c of [...compsRef.current]) c.destroy()
    wiresRef.current.length = 0
    compsRef.current.length = 0
    panX.current = 0; panY.current = 0; zoom.current = 1
    selectComponent(null)
    updateTransform()
    syncState()
  }, [selectComponent, updateTransform, syncState])

  const stopClocks = useCallback(() => {
    for (const c of compsRef.current) {
      if (c.type === 'clock') {
        c.clockRunning = false
        if (c.clockTimer) { clearInterval(c.clockTimer); c.clockTimer = null }
      }
    }
  }, [])

  const toggleRun = useCallback(() => {
    if (simRunning.current) {
      stopClocks()
      simRunning.current = false
      setIsRunning(false)
    } else {
      simRunning.current = true
      setIsRunning(true)
      for (const c of compsRef.current) {
        if (c.type === 'clock') {
          c.clockRunning = true
          const tick = () => {
            if (!c.clockRunning) return
            c.value = c.value ? 0 : 1
            propagateFromComponent(c)
            triggerRender()
          }
          const interval = Math.max(50, Math.round(1000 / c.clockFreq / 2))
          c.clockTimer = setInterval(tick, interval)
        }
      }
      evaluateAll()
    }
  }, [stopClocks, propagateFromComponent, evaluateAll, triggerRender])

  const serialize = useCallback(() => ({
    components: compsRef.current.map(c => c.serialize()),
    wires: wiresRef.current.map(w => ({ id: w.id, source: w.sourcePin.id, target: w.targetPin.id })),
    panX: panX.current, panY: panY.current, zoom: zoom.current,
  }), [])

  const deserialize = useCallback((data) => {
    clear()
    const pinMap = {}
    for (const cd of data.components) {
      const c = createComponent(cd.type, cd.x, cd.y)
      if (!c) continue
      c.deserialize(cd)
      compsRef.current.push(c)
      for (const pin of c.pins) pinMap[pin.id] = pin
      if (c.type === 'toggle-switch') c.evaluate()
    }
    if (data.wires) {
      for (const wd of data.wires) {
        const src = pinMap[wd.source]; const tgt = pinMap[wd.target]
        if (src && tgt) {
          const wire = new Wire(wd.id || uid(), src, tgt)
          wiresRef.current.push(wire)
          tgt.setValue(src.value); wire.setValue(src.value)
        }
      }
    }
    panX.current = data.panX || 0; panY.current = data.panY || 0
    zoom.current = data.zoom || 1
    updateTransform()
    evaluateAll()
    syncState()
  }, [clear, updateTransform, evaluateAll, syncState])

  const showSave = useCallback(() => { setShowSaveModal(true); setSaveError('') }, [])
  const hideSave = useCallback(() => { setShowSaveModal(false); setSaveError('') }, [])
  const doSave = useCallback((name) => {
    if (!name) { setSaveError('Please enter a circuit name.'); return }
    const data = serialize()
    data.name = name
    data.savedAt = new Date().toISOString()
    const saved = JSON.parse(localStorage.getItem('circuits') || '{}')
    saved[name] = data
    localStorage.setItem('circuits', JSON.stringify(saved))
    setSavedCircuits(saved)
    setShowSaveModal(false)
    setSaveError('')
  }, [serialize])

  const showLoad = useCallback(() => {
    const saved = JSON.parse(localStorage.getItem('circuits') || '{}')
    setSavedCircuits(saved)
    setShowLoadModal(true)
  }, [])

  const hideLoad = useCallback(() => { setShowLoadModal(false) }, [])
  const loadCircuit = useCallback((data) => {
    deserialize(data)
    simRunning.current = false
    setIsRunning(false)
    setShowLoadModal(false)
  }, [deserialize])

  const deleteCircuit = useCallback((name) => {
    const saved = JSON.parse(localStorage.getItem('circuits') || '{}')
    delete saved[name]
    localStorage.setItem('circuits', JSON.stringify(saved))
    setSavedCircuits({ ...saved })
  }, [])

  const newCircuit = useCallback(() => {
    if (compsRef.current.length > 0 && !window.confirm('Create a new circuit? Unsaved changes will be lost.')) return false
    stopClocks()
    simRunning.current = false
    setIsRunning(false)
    clear()
    pressingButton.current = null
    return true
  }, [clear, stopClocks])

  const loadExample = useCallback((name) => {
    if (!newCircuit()) return
    const fn = EXAMPLE_CIRCUITS[name]
    if (fn) {
      const ws = {
        addComponent: (t, x, y) => addComponent(t, x, y),
        addWire: (s, t) => addWire(s, t),
      }
      fn(ws)
      updateAllWires()
      evaluateAll()
    }
  }, [newCircuit, addComponent, addWire, updateAllWires, evaluateAll])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX; const sy = e.clientY
    const { x: wx, y: wy } = screenToWorld(sx, sy)

    const pin = getPinAt(wx, wy)
    if (pin) {
      if (pin.type === 'output') {
        e.preventDefault()
        wireDragSource.current = pin
        wireDrag.current = { x1: wx, y1: wy, x2: wx, y2: wy }
        if (wireDragIndicatorRef.current) wireDragIndicatorRef.current.style.display = 'block'
        if (pin.el) pin.el.classList.add('connecting')
        return
      }
      return
    }

    const comp = getComponentAt(wx, wy)
    if (comp) {
      e.preventDefault()
      if (comp.type === 'toggle-switch') {
        selectComponent(comp)
        comp.value = comp.value ? 0 : 1
        propagateFromComponent(comp)
        triggerRender()
        return
      }
      if (comp.type === 'push-button') {
        selectComponent(comp)
        pressingButton.current = comp
        comp.pressed = true
        propagateFromComponent(comp)
        triggerRender()
        return
      }
      dragReady.current = true
      dragStartPos.current = { x: wx, y: wy }
      dragComp.current = comp
      dragOffset.current = { x: wx - comp.x, y: wy - comp.y }
      selectComponent(comp)
    }

    if (activeType) {
      const created = addComponent(activeType, wx, wy)
      if (created) {
        selectComponent(created)
        setActiveType(null)
        evaluateAll()
      }
      return
    }

    isPanning.current = true
    panStart.current = { x: sx - panX.current, y: sy - panY.current }
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
    selectComponent(null)
  }, [screenToWorld, getPinAt, getComponentAt, activeType, addComponent, selectComponent, propagateFromComponent, evaluateAll, triggerRender])

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX; const sy = e.clientY
    const { x: wx, y: wy } = screenToWorld(sx, sy)

    if (wireDrag.current) {
      if (dragLineRef.current) {
        const srcPos = wireDragSource.current?.getPos()
        if (srcPos) {
          const lineX1 = srcPos.x * zoom.current + panX.current
          const lineY1 = srcPos.y * zoom.current + panY.current
          dragLineRef.current.setAttribute('x1', lineX1)
          dragLineRef.current.setAttribute('y1', lineY1)
          dragLineRef.current.setAttribute('x2', sx - rect.left)
          dragLineRef.current.setAttribute('y2', sy - rect.top)
        }
      }
      const pin = getPinAt(wx, wy)
      if (pin && pin.type === 'input' && pin.component !== wireDragSource.current?.component) {
        if (wireDragIndicatorRef.current) wireDragIndicatorRef.current.style.cursor = 'pointer'
      } else {
        if (wireDragIndicatorRef.current) wireDragIndicatorRef.current.style.cursor = ''
      }
      return
    }

    if (dragReady.current && dragComp.current) {
      const dx = wx - dragStartPos.current.x
      const dy = wy - dragStartPos.current.y
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging.current = true
        dragReady.current = false
        const idx = compsRef.current.indexOf(dragComp.current)
        if (idx > -1) {
          compsRef.current.splice(idx, 1)
          compsRef.current.push(dragComp.current)
        }
      } else { return }
    }

    if (isDragging.current && dragComp.current) {
      dragComp.current.x = snap(wx - dragOffset.current.x)
      dragComp.current.y = snap(wy - dragOffset.current.y)
      triggerRender()
      return
    }

    if (isPanning.current) {
      panX.current = sx - panStart.current.x
      panY.current = sy - panStart.current.y
      updateTransform()
    }
  }, [screenToWorld, getPinAt, updateTransform, triggerRender])

  const handleMouseUp = useCallback((e) => {
    if (pressingButton.current) {
      pressingButton.current.pressed = false
      propagateFromComponent(pressingButton.current)
      pressingButton.current = null
      triggerRender()
    }
    if (wireDrag.current) {
      const { x: wx, y: wy } = screenToWorld(e.clientX, e.clientY)
      const pin = getPinAt(wx, wy)
      if (pin && pin.type === 'input' && pin.component !== wireDragSource.current?.component) {
        addWire(wireDragSource.current, pin)
        propagateFromComponent(wireDragSource.current.component)
      }
      if (wireDragSource.current?.el) wireDragSource.current.el.classList.remove('connecting')
      wireDrag.current = null
      wireDragSource.current = null
      if (wireDragIndicatorRef.current) wireDragIndicatorRef.current.style.display = 'none'
      return
    }
    if (dragReady.current) { dragReady.current = false; dragComp.current = null }
    if (isDragging.current && dragComp.current) {
      isDragging.current = false
      dragComp.current = null
      if (containerRef.current) containerRef.current.style.cursor = ''
      syncState()
      return
    }
    if (isPanning.current) {
      isPanning.current = false
      if (containerRef.current) containerRef.current.style.cursor = ''
    }
  }, [screenToWorld, getPinAt, addWire, propagateFromComponent, syncState, triggerRender])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top
    const oldZoom = zoom.current
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    zoom.current = clamp(zoom.current * delta, 0.2, 5)
    const worldX = (mx - panX.current) / oldZoom
    const worldY = (my - panY.current) / oldZoom
    panX.current = mx - worldX * zoom.current
    panY.current = my - worldY * zoom.current
    updateTransform()
  }, [updateTransform])

  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedComponent) {
        removeComponent(selectedComponent)
        selectComponent(null)
      }
    }
    if (e.key === 'Escape') {
      selectComponent(null)
      setActiveType(null)
    }
  }, [selectedComponent, removeComponent, selectComponent])

  const touchLastDist = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = touch.clientX; const sy = touch.clientY
      const { x: wx, y: wy } = screenToWorld(sx, sy)

      const pin = getPinAt(wx, wy)
      if (pin && pin.type === 'output') {
        wireDragSource.current = pin
        wireDrag.current = { x1: wx, y1: wy, x2: wx, y2: wy }
        if (wireDragIndicatorRef.current) wireDragIndicatorRef.current.style.display = 'block'
        if (pin.el) pin.el.classList.add('connecting')
        return
      }

      const comp = getComponentAt(wx, wy)
      if (comp) {
        if (comp.type === 'toggle-switch') {
          selectComponent(comp)
          comp.value = comp.value ? 0 : 1
          propagateFromComponent(comp)
          triggerRender()
          return
        }
        if (comp.type === 'push-button') {
          selectComponent(comp)
          pressingButton.current = comp
          comp.pressed = true
          propagateFromComponent(comp)
          triggerRender()
          return
        }
        dragReady.current = true
        dragStartPos.current = { x: wx, y: wy }
        dragComp.current = comp
        dragOffset.current = { x: wx - comp.x, y: wy - comp.y }
        selectComponent(comp)
      }

      if (activeType) {
        const created = addComponent(activeType, wx, wy)
        if (created) {
          selectComponent(created)
          setActiveType(null)
          evaluateAll()
        }
        return
      }

      isPanning.current = true
      panStart.current = { x: sx - panX.current, y: sy - panY.current }
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
      selectComponent(null)
    } else if (e.touches.length === 2) {
      e.preventDefault()
      touchLastDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
    }
  }, [screenToWorld, getPinAt, getComponentAt, activeType, addComponent, selectComponent, propagateFromComponent, evaluateAll, triggerRender])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = touch.clientX; const sy = touch.clientY
      const { x: wx, y: wy } = screenToWorld(sx, sy)

      if (wireDrag.current) {
        e.preventDefault()
        if (dragLineRef.current && wireDragSource.current) {
          const srcPos = wireDragSource.current.getPos()
          const lineX1 = srcPos.x * zoom.current + panX.current
          const lineY1 = srcPos.y * zoom.current + panY.current
          dragLineRef.current.setAttribute('x1', lineX1)
          dragLineRef.current.setAttribute('y1', lineY1)
          dragLineRef.current.setAttribute('x2', sx - rect.left)
          dragLineRef.current.setAttribute('y2', sy - rect.top)
        }
        return
      }

      if (dragReady.current && dragComp.current) {
        const dx = wx - dragStartPos.current.x
        const dy = wy - dragStartPos.current.y
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isDragging.current = true
          dragReady.current = false
          const idx = compsRef.current.indexOf(dragComp.current)
          if (idx > -1) {
            compsRef.current.splice(idx, 1)
            compsRef.current.push(dragComp.current)
          }
        }
      }

      if (isDragging.current && dragComp.current) {
        e.preventDefault()
        dragComp.current.x = snap(wx - dragOffset.current.x)
        dragComp.current.y = snap(wy - dragOffset.current.y)
        triggerRender()
        return
      }

      if (isPanning.current) {
        e.preventDefault()
        panX.current = sx - panStart.current.x
        panY.current = sy - panStart.current.y
        updateTransform()
      }
    }

    if (e.touches.length === 2) {
      e.preventDefault()
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      if (touchLastDist.current) {
        const scale = dist / touchLastDist.current
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
          const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
          const oldZoom = zoom.current
          zoom.current = clamp(zoom.current * scale, 0.2, 5)
          const worldX = (mx - panX.current) / oldZoom
          const worldY = (my - panY.current) / oldZoom
          panX.current = mx - worldX * zoom.current
          panY.current = my - worldY * zoom.current
          updateTransform()
        }
      }
      touchLastDist.current = dist
    }
  }, [screenToWorld, getPinAt, updateTransform, triggerRender])

  const handleTouchEnd = useCallback((e) => {
    if (wireDrag.current) {
      const touch = e.changedTouches[0]
      const { x: wx, y: wy } = screenToWorld(touch.clientX, touch.clientY)
      const pin = getPinAt(wx, wy)
      if (pin && pin.type === 'input' && pin.component !== wireDragSource.current?.component) {
        addWire(wireDragSource.current, pin)
        propagateFromComponent(wireDragSource.current.component)
      }
      if (wireDragSource.current?.el) wireDragSource.current.el.classList.remove('connecting')
      wireDrag.current = null
      wireDragSource.current = null
      if (wireDragIndicatorRef.current) wireDragIndicatorRef.current.style.display = 'none'
      return
    }
    if (pressingButton.current) {
      pressingButton.current.pressed = false
      propagateFromComponent(pressingButton.current)
      pressingButton.current = null
      triggerRender()
    }
    if (dragReady.current) { dragReady.current = false; dragComp.current = null }
    if (isDragging.current && dragComp.current) {
      isDragging.current = false
      dragComp.current = null
      if (containerRef.current) containerRef.current.style.cursor = ''
      syncState()
      return
    }
    if (isPanning.current) {
      isPanning.current = false
      if (containerRef.current) containerRef.current.style.cursor = ''
    }
    touchLastDist.current = null
  }, [screenToWorld, getPinAt, addWire, propagateFromComponent, syncState, triggerRender])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('keydown', handleKeyDown)
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })
    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('wheel', handleWheel)
      document.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleKeyDown, handleTouchStart, handleTouchMove, handleTouchEnd])

  useEffect(() => {
    setZoomLevel(Math.round(zoom.current * 100) + '%')
  }, [])

  return {
    components, wires, selectedComponent, activeType, isRunning,
    zoomLevel, showSaveModal, showLoadModal, saveError,
    savedCircuits, propertiesComp,
    containerRef, stageRef, wireLayerRef, componentLayerRef,
    dragLineRef, wireDragIndicatorRef,
    addComponent, removeComponent, selectComponent,
    addWire, updateAllWires,
    evaluateAll, propagateFromComponent,
    setActiveType,
    toggleRun, zoomIn, zoomOut, fitAll, clear,
    showSave, hideSave, doSave,
    showLoad, hideLoad, loadCircuit, deleteCircuit,
    newCircuit, loadExample,
    panX, panY, zoom, SEG_PATTERNS, SEG_CLASSES,
    getTypeSymbol, getPinAt, screenToWorld,
    triggerRender, forceRender,
  }
}
