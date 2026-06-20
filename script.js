(() => {
    'use strict';

    const GRID_SIZE = 20;
    const COMP_WIDTH = 100;
    const COMP_HEIGHT = 60;
    const PIN_RADIUS = 5;
    const MAX_DEPTH = 100;

    const SEG_PATTERNS = {
        0: [1,1,1,1,1,1,0], 1: [0,1,1,0,0,0,0], 2: [1,1,0,1,1,0,1],
        3: [1,1,1,1,0,0,1], 4: [0,1,1,0,0,1,1], 5: [1,0,1,1,0,1,1],
        6: [1,0,1,1,1,1,1], 7: [1,1,1,0,0,0,0], 8: [1,1,1,1,1,1,1],
        9: [1,1,1,1,0,1,1],
    };
    const SEG_CLASSES = ['ss-a','ss-b','ss-c','ss-d','ss-e','ss-f','ss-g'];

    function snap(v) { return Math.round(v / GRID_SIZE) * GRID_SIZE; }
    function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
    function dist(x1,y1,x2,y2) { return Math.hypot(x2-x1, y2-y1); }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function evalGate(type, inputs) {
        const a = inputs[0] || 0;
        const b = inputs.length > 1 ? (inputs[1] || 0) : 0;
        switch (type) {
            case 'and':  return a & b;
            case 'or':   return a | b;
            case 'not':  return a ^ 1;
            case 'nand': return (a & b) ^ 1;
            case 'nor':  return (a | b) ^ 1;
            case 'xor':  return a ^ b;
            case 'xnor': return (a ^ b) ^ 1;
            default: return 0;
        }
    }

    class Pin {
        constructor(component, id, type, index) {
            this.component = component;
            this.id = id;
            this.type = type;
            this.index = index;
            this.value = 0;
            this.wires = [];
            this.el = null;
        }
        addWire(wire) { this.wires.push(wire); }
        removeWire(wire) {
            this.wires = this.wires.filter(w => w !== wire);
        }
        setValue(val) {
            if (this.value === val) return false;
            this.value = val;
            if (this.el) {
                this.el.classList.toggle('high', val === 1);
            }
            return true;
        }
        getPos() {
            const c = this.component;
            if (this.type === 'input') {
                const idx = this.index || 0;
                const total = c.inputPins.length;
                const yOff = total > 1 ? ((idx + 0.5) / total) * c.height : c.height / 2;
                return { x: c.x, y: c.y + yOff };
            } else {
                const idx = this.index || 0;
                const total = c.outputPins.length;
                const yOff = total > 1 ? ((idx + 0.5) / total) * c.height : c.height / 2;
                return { x: c.x + c.width, y: c.y + yOff };
            }
        }
    }

    class Wire {
        constructor(id, sourcePin, targetPin) {
            this.id = id;
            this.sourcePin = sourcePin;
            this.targetPin = targetPin;
            this.value = 0;
            this.el = null;
            this.dotEl = null;
            sourcePin.addWire(this);
            targetPin.addWire(this);
        }
        setValue(val) {
            if (this.value === val) return;
            this.value = val;
            this.updateAppearance();
        }
        updateAppearance() {
            if (!this.el) return;
            this.el.classList.toggle('high', this.value === 1);
            this.el.classList.toggle('low', this.value === 0);
            if (this.dotEl) {
                this.dotEl.classList.toggle('high', this.value === 1);
                this.dotEl.classList.toggle('low', this.value === 0);
            }
        }
        remove() {
            this.sourcePin.removeWire(this);
            this.targetPin.removeWire(this);
            if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
            if (this.dotEl && this.dotEl.parentNode) this.dotEl.parentNode.removeChild(this.dotEl);
        }
        updatePath() {
            if (!this.el) return;
            const src = this.sourcePin.getPos();
            const tgt = this.targetPin.getPos();
            const dx = tgt.x - src.x;
            const cpx = src.x + dx * 0.5;
            const d = 'M' + src.x + ',' + src.y + ' C' + cpx + ',' + src.y + ' ' + cpx + ',' + tgt.y + ' ' + tgt.x + ',' + tgt.y;
            this.el.setAttribute('d', d);
            if (this.dotEl) {
                this.dotEl.setAttribute('cx', tgt.x);
                this.dotEl.setAttribute('cy', tgt.y);
            }
        }
        render(svg) {
            const ns = 'http://www.w3.org/2000/svg';
            this.el = document.createElementNS(ns, 'path');
            this.el.classList.add('wire-line', 'low');
            this.el.setAttribute('data-wire', this.id);
            svg.appendChild(this.el);
            this.dotEl = document.createElementNS(ns, 'circle');
            this.dotEl.setAttribute('r', 3);
            this.dotEl.classList.add('wire-dot', 'low');
            svg.appendChild(this.dotEl);
            this.updatePath();
            this.updateAppearance();
        }
    }

    class Component {
        constructor(type, x, y) {
            this.id = uid();
            this.type = type;
            this.x = x;
            this.y = y;
            this.width = COMP_WIDTH;
            this.height = COMP_HEIGHT;
            this.label = type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            this.inputPins = [];
            this.outputPins = [];
            this.pins = [];
            this.selected = false;
            this.el = null;
            this.bodyEl = null;
            this.labelEl = null;
            this.symbolEl = null;
            this.value = 0;
            this.clockTimer = null;
            this.clockRunning = false;
            this.clockFreq = 1;
            this.initialValue = 0;
            this.color = '#EF4444';
            this._initPins();
        }
        _initPins() {}
        createPin(type, index) {
            const id = this.id + '-' + type + index;
            const pin = new Pin(this, id, type, index);
            this.pins.push(pin);
            if (type === 'input') this.inputPins.push(pin);
            else this.outputPins.push(pin);
            return pin;
        }
        getInputValue(index) {
            if (index < this.inputPins.length) return this.inputPins[index].value;
            return 0;
        }
        setOutputValue(index, val) {
            if (index < this.outputPins.length) {
                this.outputPins[index].setValue(val);
            }
        }
        evaluate() {}
        getPinAt(wx, wy) {
            for (const pin of this.pins) {
                const pos = pin.getPos();
                if (dist(wx, wy, pos.x, pos.y) < 10) return pin;
            }
            return null;
        }
        render(container) {
            this.el = document.createElement('div');
            this.el.className = 'circuit-component gate-' + this.type;
            this.el.style.left = this.x + 'px';
            this.el.style.top = this.y + 'px';
            this.el.style.width = this.width + 'px';
            this.el.style.height = this.height + 'px';
            this.el.setAttribute('data-id', this.id);

            this.bodyEl = document.createElement('div');
            this.bodyEl.className = 'component-body';
            this.bodyEl.style.width = '100%';
            this.bodyEl.style.height = '100%';
            this.bodyEl.style.display = 'flex';
            this.bodyEl.style.flexDirection = 'column';
            this.bodyEl.style.alignItems = 'center';
            this.bodyEl.style.justifyContent = 'center';

            this.labelEl = document.createElement('div');
            this.labelEl.className = 'component-label';
            this.labelEl.textContent = this.label;
            this.bodyEl.appendChild(this.labelEl);

            this.el.appendChild(this.bodyEl);
            container.appendChild(this.el);

            for (const pin of this.pins) {
                const pel = document.createElement('div');
                pel.className = 'pin ' + (pin.type === 'input' ? 'input-pin' : 'output-pin');
                if (pin.type === 'input') {
                    pel.style.left = (-PIN_RADIUS) + 'px';
                }
                pel.style.top = (this.height * (pin.type === 'input' ?
                    ((pin.index || 0) + 0.5) / Math.max(this.inputPins.length, 1) :
                    ((pin.index || 0) + 0.5) / Math.max(this.outputPins.length, 1))) - PIN_RADIUS + 'px';
                pel.setAttribute('data-pin', pin.id);
                pin.el = pel;
                this.el.appendChild(pel);
            }

            this._renderExtra();
            return this.el;
        }
        _renderExtra() {}
        updatePosition() {
            if (this.el) {
                this.el.style.left = this.x + 'px';
                this.el.style.top = this.y + 'px';
            }
            for (const pin of this.pins) {
                if (pin.el) {
                    if (pin.type === 'input') {
                        pin.el.style.left = (-PIN_RADIUS) + 'px';
                    }
                    pin.el.style.top = (this.height * (pin.type === 'input' ?
                        ((pin.index || 0) + 0.5) / Math.max(this.inputPins.length, 1) :
                        ((pin.index || 0) + 0.5) / Math.max(this.outputPins.length, 1))) - PIN_RADIUS + 'px';
                }
            }
        }
        setSelected(sel) {
            this.selected = sel;
            if (this.el) this.el.classList.toggle('selected', sel);
        }
        serialize() {
            return {
                id: this.id, type: this.type, x: this.x, y: this.y,
                label: this.label, clockFreq: this.clockFreq,
                initialValue: this.initialValue, color: this.color,
                value: this.value,
            };
        }
        deserialize(data) {
            this.id = data.id;
            for (const pin of this.pins) {
                const idx = pin.index || 0;
                pin.id = this.id + '-' + pin.type + idx;
                if (pin.el) pin.el.setAttribute('data-pin', pin.id);
            }
            this.x = data.x;
            this.y = data.y;
            if (data.label) this.label = data.label;
            if (data.clockFreq) this.clockFreq = data.clockFreq;
            if (data.initialValue !== undefined) this.initialValue = data.initialValue;
            if (data.color) this.color = data.color;
            if (data.value !== undefined) this.value = data.value;
        }
        destroy() {
            if (this.clockTimer) { clearInterval(this.clockTimer); this.clockTimer = null; }
            if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
        }
    }

    class GateComponent extends Component {
        _initPins() {
            if (this.type === 'not') {
                this.createPin('input', 0);
                this.createPin('output', 0);
                this.height = 50;
            } else {
                this.createPin('input', 0);
                this.createPin('input', 1);
                this.createPin('output', 0);
                this.height = 70;
            }
        }
        _renderExtra() {
            if (this.symbolEl) return;
            this.symbolEl = document.createElement('div');
            this.symbolEl.className = 'component-symbol';
            const symbols = {
                and: '&', or: '\u22651', not: '1', nand: '&',
                nor: '\u22651', xor: '=1', xnor: '=1',
            };
            this.symbolEl.textContent = symbols[this.type] || this.type.toUpperCase();
            this.bodyEl.appendChild(this.symbolEl);
        }
        evaluate() {
            const inputs = this.inputPins.map(p => p.value);
            const out = evalGate(this.type, inputs);
            this.setOutputValue(0, out);
        }
    }

    class ToggleSwitch extends Component {
        _initPins() {
            this.createPin('output', 0);
            this.height = 44;
            this.value = this.initialValue;
        }
        _renderExtra() {
            this.valIndicator = document.createElement('span');
            this.valIndicator.className = 'component-value-indicator' + (this.value ? ' high' : '');
            this.labelEl.appendChild(this.valIndicator);
        }
        toggle() {
            this.value = this.value ? 0 : 1;
            if (this.valIndicator) {
                this.valIndicator.classList.toggle('high', this.value === 1);
            }
            return this.value;
        }
        evaluate() {
            this.setOutputValue(0, this.value);
            if (this.valIndicator) {
                this.valIndicator.classList.toggle('high', this.value === 1);
            }
        }
        serialize() {
            return { ...super.serialize(), value: this.value };
        }
    }

    class PushButton extends Component {
        _initPins() {
            this.createPin('output', 0);
            this.height = 44;
            this.pressed = false;
        }
        press() {
            this.pressed = true;
            if (this.bodyEl) this.bodyEl.style.transform = 'scale(0.95)';
        }
        release() {
            this.pressed = false;
            if (this.bodyEl) this.bodyEl.style.transform = '';
        }
        evaluate() {
            this.setOutputValue(0, this.pressed ? 1 : 0);
        }
    }

    class Clock extends Component {
        _initPins() {
            this.createPin('output', 0);
            this.height = 44;
            this.value = this.initialValue;
            this.clockRunning = false;
            this._tick = this._tick.bind(this);
        }
        _renderExtra() {
            this.clockIndicator = document.createElement('span');
            this.clockIndicator.className = 'clock-indicator';
            this.clockIndicator.classList.toggle('high', this.value === 1);
            this.labelEl.appendChild(this.clockIndicator);
        }
        _tick() {
            if (!this.clockRunning) return;
            this.value = this.value ? 0 : 1;
            if (this.clockIndicator) {
                this.clockIndicator.classList.toggle('high', this.value === 1);
            }
            if (app) app.simulator.propagateFromComponent(this);
        }
        startClock() {
            if (this.clockRunning) return;
            this.clockRunning = true;
            const interval = Math.max(50, Math.round(1000 / this.clockFreq / 2));
            this.clockTimer = setInterval(this._tick, interval);
            if (this.clockIndicator) this.clockIndicator.classList.add('ticking');
        }
        stopClock() {
            this.clockRunning = false;
            if (this.clockTimer) { clearInterval(this.clockTimer); this.clockTimer = null; }
            if (this.clockIndicator) this.clockIndicator.classList.remove('ticking');
        }
        setFreq(freq) {
            this.clockFreq = clamp(freq, 0.1, 100);
            if (this.clockRunning) {
                this.stopClock();
                this.startClock();
            }
        }
        evaluate() {
            this.setOutputValue(0, this.value);
            if (this.clockIndicator) {
                this.clockIndicator.classList.toggle('high', this.value === 1);
            }
        }
        serialize() {
            return { ...super.serialize(), clockFreq: this.clockFreq, clockRunning: this.clockRunning };
        }
        deserialize(data) {
            super.deserialize(data);
            if (data.clockRunning) this.clockRunning = data.clockRunning;
        }
    }

    class LED extends Component {
        _initPins() {
            this.createPin('input', 0);
            this.width = 80;
            this.height = 44;
        }
        _renderExtra() {
            this.ledContainer = document.createElement('div');
            this.ledContainer.className = 'led-body';
            this.ledLight = document.createElement('div');
            this.ledLight.className = 'led-light';
            this.ledContainer.appendChild(this.ledLight);
            this.bodyEl.innerHTML = '';
            this.bodyEl.appendChild(this.ledContainer);
            this.labelEl = document.createElement('div');
            this.labelEl.className = 'component-label';
            this.labelEl.textContent = this.label;
            this.bodyEl.appendChild(this.labelEl);
        }
        evaluate() {
            const val = this.getInputValue(0);
            if (this.ledLight) {
                this.ledLight.classList.toggle('high', val === 1);
                this.ledLight.classList.remove('red-led', 'green-led', 'blue-led');
                if (val === 1) {
                    if (this.color === '#22C55E') this.ledLight.classList.add('green-led');
                    else if (this.color === '#0A84FF') this.ledLight.classList.add('blue-led');
                    else this.ledLight.classList.add('red-led');
                }
            }
        }
    }

    class Lamp extends Component {
        _initPins() {
            this.createPin('input', 0);
            this.width = 90;
            this.height = 50;
            this.color = '#22C55E';
        }
        _renderExtra() {
            this.lampContainer = document.createElement('div');
            this.lampContainer.className = 'lamp-body';
            this.lampLight = document.createElement('div');
            this.lampLight.className = 'lamp-light';
            this.lampContainer.appendChild(this.lampLight);
            this.bodyEl.innerHTML = '';
            this.bodyEl.appendChild(this.lampContainer);
            this.labelEl = document.createElement('div');
            this.labelEl.className = 'component-label';
            this.labelEl.textContent = this.label;
            this.bodyEl.appendChild(this.labelEl);
        }
        evaluate() {
            const val = this.getInputValue(0);
            if (this.lampLight) {
                this.lampLight.classList.toggle('high', val === 1);
                this.lampLight.classList.remove('white-lamp', 'blue-lamp');
                if (val === 1) {
                    if (this.color === '#0A84FF') this.lampLight.classList.add('blue-lamp');
                    else if (this.color !== '#22C55E') this.lampLight.classList.add('white-lamp');
                }
            }
        }
    }

    class SevenSegment extends Component {
        _initPins() {
            for (let i = 0; i < 4; i++) this.createPin('input', i);
            this.width = 100;
            this.height = 120;
            this.segments = [0,0,0,0,0,0,0];
        }
        _renderExtra() {
            this.bodyEl.innerHTML = '';
            const display = document.createElement('div');
            display.className = 'seven-seg-display';
            display.style.cssText = 'position:relative;width:48px;height:80px;margin:0 auto;';
            for (let i = 0; i < 7; i++) {
                const seg = document.createElement('div');
                seg.className = 'ss-segment ' + SEG_CLASSES[i];
                display.appendChild(seg);
            }
            this.bodyEl.appendChild(display);
            this.labelEl = document.createElement('div');
            this.labelEl.className = 'component-label';
            this.labelEl.textContent = this.label;
            this.bodyEl.appendChild(this.labelEl);
            this.valueEl = document.createElement('div');
            this.valueEl.className = 'seven-seg-value';
            this.valueEl.textContent = '0';
            this.bodyEl.appendChild(this.valueEl);
        }
        evaluate() {
            const val = this.getInputValue(0) | (this.getInputValue(1) << 1) | (this.getInputValue(2) << 2) | (this.getInputValue(3) << 3);
            const pattern = SEG_PATTERNS[val] || [0,0,0,0,0,0,0];
            const segs = this.bodyEl.querySelectorAll('.ss-segment');
            for (let i = 0; i < 7 && i < segs.length; i++) {
                segs[i].classList.toggle('on', pattern[i] === 1);
            }
            if (this.valueEl) this.valueEl.textContent = '' + val;
        }
    }

    class HalfAdder extends Component {
        _initPins() {
            this.createPin('input', 0);
            this.createPin('input', 1);
            this.createPin('output', 0);
            this.createPin('output', 1);
            this.height = 70;
            this.width = 110;
        }
        _renderExtra() {
            if (this.symbolEl) return;
            this.symbolEl = document.createElement('div');
            this.symbolEl.className = 'component-symbol';
            this.symbolEl.textContent = 'HA';
            this.bodyEl.appendChild(this.symbolEl);
        }
        evaluate() {
            const a = this.getInputValue(0);
            const b = this.getInputValue(1);
            this.setOutputValue(0, a ^ b);
            this.setOutputValue(1, a & b);
        }
    }

    class FullAdder extends Component {
        _initPins() {
            this.createPin('input', 0);
            this.createPin('input', 1);
            this.createPin('input', 2);
            this.createPin('output', 0);
            this.createPin('output', 1);
            this.height = 90;
            this.width = 120;
        }
        _renderExtra() {
            if (this.symbolEl) return;
            this.symbolEl = document.createElement('div');
            this.symbolEl.className = 'component-symbol';
            this.symbolEl.textContent = 'FA';
            this.bodyEl.appendChild(this.symbolEl);
        }
        evaluate() {
            const a = this.getInputValue(0);
            const b = this.getInputValue(1);
            const cin = this.getInputValue(2);
            const sum = a ^ b ^ cin;
            const cout = (a & b) | (cin & (a ^ b));
            this.setOutputValue(0, sum);
            this.setOutputValue(1, cout);
        }
    }

    class Multiplexer extends Component {
        _initPins() {
            this.createPin('input', 0);
            this.createPin('input', 1);
            this.createPin('input', 2);
            this.createPin('output', 0);
            this.height = 80;
            this.width = 110;
        }
        _renderExtra() {
            if (this.symbolEl) return;
            this.symbolEl = document.createElement('div');
            this.symbolEl.className = 'component-symbol';
            this.symbolEl.textContent = 'MUX';
            this.bodyEl.appendChild(this.symbolEl);
        }
        evaluate() {
            const a = this.getInputValue(0);
            const b = this.getInputValue(1);
            const sel = this.getInputValue(2);
            this.setOutputValue(0, sel ? b : a);
        }
    }

    class Decoder extends Component {
        _initPins() {
            this.createPin('input', 0);
            this.createPin('input', 1);
            for (let i = 0; i < 4; i++) this.createPin('output', i);
            this.height = 90;
            this.width = 110;
        }
        _renderExtra() {
            if (this.symbolEl) return;
            this.symbolEl = document.createElement('div');
            this.symbolEl.className = 'component-symbol';
            this.symbolEl.textContent = 'DEC';
            this.bodyEl.appendChild(this.symbolEl);
        }
        evaluate() {
            const a = this.getInputValue(0);
            const b = this.getInputValue(1);
            const val = a | (b << 1);
            for (let i = 0; i < 4; i++) {
                this.setOutputValue(i, val === i ? 1 : 0);
            }
        }
    }

    class Encoder extends Component {
        _initPins() {
            for (let i = 0; i < 4; i++) this.createPin('input', i);
            this.createPin('output', 0);
            this.createPin('output', 1);
            this.height = 90;
            this.width = 110;
        }
        _renderExtra() {
            if (this.symbolEl) return;
            this.symbolEl = document.createElement('div');
            this.symbolEl.className = 'component-symbol';
            this.symbolEl.textContent = 'ENC';
            this.bodyEl.appendChild(this.symbolEl);
        }
        evaluate() {
            let val = 0;
            for (let i = 0; i < 4; i++) {
                if (this.getInputValue(i)) val = i;
            }
            this.setOutputValue(0, val & 1);
            this.setOutputValue(1, (val >> 1) & 1);
        }
    }

    function createComponent(type, x, y) {
        switch (type) {
            case 'and': case 'or': case 'not': case 'nand': case 'nor': case 'xor': case 'xnor':
                return new GateComponent(type, x, y);
            case 'toggle-switch': return new ToggleSwitch(type, x, y);
            case 'push-button': return new PushButton(type, x, y);
            case 'clock': return new Clock(type, x, y);
            case 'led': return new LED(type, x, y);
            case 'lamp': return new Lamp(type, x, y);
            case 'seven-segment': return new SevenSegment(type, x, y);
            case 'half-adder': return new HalfAdder(type, x, y);
            case 'full-adder': return new FullAdder(type, x, y);
            case 'multiplexer': return new Multiplexer(type, x, y);
            case 'decoder': return new Decoder(type, x, y);
            case 'encoder': return new Encoder(type, x, y);
            default: return null;
        }
    }

    class Simulator {
        constructor(workspace) {
            this.running = false;
            this.workspace = workspace;
        }
        get components() { return this.workspace ? this.workspace.components : []; }
        get wires() { return this.workspace ? this.workspace.wires : []; }
        stop() {
            this.running = false;
            for (const c of this.components) {
                if (c.type === 'clock') c.stopClock();
            }
        }
        propagateFromComponent(start) {
            const queue = [start];
            const visitCount = {};
            let depth = 0;

            while (queue.length > 0 && depth < MAX_DEPTH) {
                const current = queue.shift();
                depth++;
                const cid = current.id;
                visitCount[cid] = (visitCount[cid] || 0) + 1;
                if (visitCount[cid] > 5) continue;

                const oldVals = current.outputPins.map(p => p.value);
                current.evaluate();

                let changed = false;
                for (let i = 0; i < current.outputPins.length; i++) {
                    if (current.outputPins[i].value !== oldVals[i]) {
                        changed = true;
                        break;
                    }
                }
                if (!changed) continue;

                for (const outPin of current.outputPins) {
                    for (const wire of outPin.wires) {
                        const pinChanged = wire.targetPin.setValue(outPin.value);
                        wire.setValue(outPin.value);
                        if (pinChanged) {
                            const next = wire.targetPin.component;
                            if ((visitCount[next.id] || 0) < 5) {
                                queue.push(next);
                            }
                        }
                    }
                }
            }
        }
        evaluateAll() {
            for (const w of this.wires) {
                const srcVal = w.sourcePin.value;
                w.targetPin.setValue(srcVal);
                w.setValue(srcVal);
            }
            for (const c of this.components) {
                if (c.type === 'clock' || c.type === 'toggle-switch' || c.type === 'push-button') {
                    c.evaluate();
                    for (const w of c.outputPins[0].wires) {
                        w.targetPin.setValue(c.outputPins[0].value);
                        w.setValue(c.outputPins[0].value);
                    }
                }
            }
            for (let pass = 0; pass < 5; pass++) {
                let anyChanged = false;
                for (const c of this.components) {
                    if (c.type === 'clock' || c.type === 'toggle-switch' || c.type === 'push-button') continue;
                    const oldVals = c.outputPins.map(p => p.value);
                    c.evaluate();
                    for (let i = 0; i < c.outputPins.length; i++) {
                        if (c.outputPins[i].value !== oldVals[i]) {
                            anyChanged = true;
                            for (const w of c.outputPins[i].wires) {
                                w.targetPin.setValue(c.outputPins[i].value);
                                w.setValue(c.outputPins[i].value);
                            }
                        }
                    }
                }
                if (!anyChanged) break;
            }
        }
    }

    class Workspace {
        constructor(container) {
            this.container = container;
            this.stage = document.getElementById('workspace-stage');
            this.wireLayer = document.getElementById('wire-layer');
            this.componentLayer = document.getElementById('component-layer');
            this.selectionBox = document.getElementById('selection-box');

            this.panX = 0;
            this.panY = 0;
            this.zoom = 1;
            this.isPanning = false;
            this.panStart = { x: 0, y: 0 };
            this.isDragging = false;
            this.dragComp = null;
            this.dragOffset = { x: 0, y: 0 };
            this._dragReady = false;
            this._dragStartPos = { x: 0, y: 0 };
            this.wireDrag = null;
            this.wireDragSource = null;
            this.selectedComponent = null;
            this.components = [];
            this.wires = [];
            this.simulator = null;
            this.activeType = null;
            this._pressingButton = null;

            this._onMouseDown = this._onMouseDown.bind(this);
            this._onMouseMove = this._onMouseMove.bind(this);
            this._onMouseUp = this._onMouseUp.bind(this);
            this._onWheel = this._onWheel.bind(this);
            this._onKeyDown = this._onKeyDown.bind(this);

            this.container.addEventListener('mousedown', this._onMouseDown);
            document.addEventListener('mousemove', this._onMouseMove);
            document.addEventListener('mouseup', this._onMouseUp);
            this.container.addEventListener('wheel', this._onWheel, { passive: false });
            document.addEventListener('keydown', this._onKeyDown);

            this.updateTransform();
        }
        setSimulator(sim) { this.simulator = sim; }

        screenToWorld(sx, sy) {
            const rect = this.container.getBoundingClientRect();
            return {
                x: (sx - rect.left - this.panX) / this.zoom,
                y: (sy - rect.top - this.panY) / this.zoom,
            };
        }

        updateTransform() {
            this.stage.style.transform = 'translate(' + this.panX + 'px,' + this.panY + 'px) scale(' + this.zoom + ')';
        }

        getComponentAt(wx, wy) {
            for (let i = this.components.length - 1; i >= 0; i--) {
                const c = this.components[i];
                if (wx >= c.x && wx <= c.x + c.width && wy >= c.y && wy <= c.y + c.height) {
                    return c;
                }
            }
            return null;
        }

        getPinAt(wx, wy) {
            for (const c of this.components) {
                const pin = c.getPinAt(wx, wy);
                if (pin) return pin;
            }
            return null;
        }

        selectComponent(comp) {
            if (this.selectedComponent && this.selectedComponent !== comp) {
                this.selectedComponent.setSelected(false);
            }
            this.selectedComponent = comp;
            if (comp) {
                comp.setSelected(true);
                if (app) app.showProperties(comp);
            } else {
                if (app) app.showProperties(null);
            }
        }

        addComponent(type, wx, wy) {
            const x = snap(wx);
            const y = snap(wy);
            const comp = createComponent(type, x, y);
            if (!comp) return null;
            this.components.push(comp);
            comp.render(this.componentLayer);
            return comp;
        }

        removeComponent(comp) {
            if (this.selectedComponent === comp) this.selectComponent(null);
            const wiresToRemove = [];
            for (const pin of comp.pins) {
                for (const wire of [...pin.wires]) {
                    wiresToRemove.push(wire);
                }
            }
            for (const w of wiresToRemove) this.removeWire(w);
            comp.destroy();
            const idx = this.components.indexOf(comp);
            if (idx > -1) this.components.splice(idx, 1);
        }

        addWire(sourcePin, targetPin) {
            if (sourcePin.type !== 'output' || targetPin.type !== 'input') return null;
            if (sourcePin.component === targetPin.component) return null;
            for (const existing of this.wires) {
                if (existing.sourcePin === sourcePin && existing.targetPin === targetPin) return null;
                if (existing.sourcePin === targetPin && existing.targetPin === sourcePin) return null;
                if (existing.targetPin === targetPin) {
                    this.removeWire(existing);
                    break;
                }
            }
            const wire = new Wire(uid(), sourcePin, targetPin);
            this.wires.push(wire);
            wire.render(this.wireLayer);
            return wire;
        }

        removeWire(wire) {
            const targetPin = wire.targetPin;
            const targetComp = targetPin.component;
            wire.remove();
            const idx = this.wires.indexOf(wire);
            if (idx > -1) this.wires.splice(idx, 1);
            if (targetPin.type === 'input' && targetPin.wires.length === 0) {
                targetPin.setValue(0);
                if (this.simulator) this.simulator.propagateFromComponent(targetComp);
            }
        }

        updateAllWires() {
            for (const w of this.wires) w.updatePath();
        }

        _onMouseDown(e) {
            if (e.button !== 0) return;
            const rect = this.container.getBoundingClientRect();
            const sx = e.clientX;
            const sy = e.clientY;
            const wx = (sx - rect.left - this.panX) / this.zoom;
            const wy = (sy - rect.top - this.panY) / this.zoom;

            const pin = this.getPinAt(wx, wy);
            if (pin) {
                if (pin.type === 'output') {
                    e.preventDefault();
                    this.wireDragSource = pin;
                    this.wireDrag = { x1: wx, y1: wy, x2: wx, y2: wy };
                    const indicator = document.getElementById('wire-drag-indicator');
                    indicator.style.display = 'block';
                    const line = document.getElementById('drag-line');
                    line.setAttribute('x1', 0); line.setAttribute('y1', 0);
                    line.setAttribute('x2', 0); line.setAttribute('y2', 0);
                    pin.el.classList.add('connecting');
                    this._updateDragLine(sx - rect.left, sy - rect.top);
                    return;
                }
                return;
            }

            const comp = this.getComponentAt(wx, wy);
            if (comp) {
                e.preventDefault();
                if (comp.type === 'toggle-switch') {
                    this.selectComponent(comp);
                    comp.toggle();
                    this.simulator.propagateFromComponent(comp);
                    return;
                }
                if (comp.type === 'push-button') {
                    this.selectComponent(comp);
                    this._pressingButton = comp;
                    comp.press();
                    this.simulator.propagateFromComponent(comp);
                    return;
                }
                this._dragReady = true;
                this._dragStartPos = { x: wx, y: wy };
                this.dragComp = comp;
                this.dragOffset = { x: wx - comp.x, y: wy - comp.y };
                this.selectComponent(comp);
            }

            if (this.activeType) {
                const created = this.addComponent(this.activeType, wx, wy);
                if (created) {
                    this.selectComponent(created);
                    this.activeType = null;
                    document.querySelectorAll('.sidebar-item.active').forEach(el => el.classList.remove('active'));
                    this.simulator.evaluateAll();
                }
                return;
            }

            this.isPanning = true;
            this.panStart = { x: sx - this.panX, y: sy - this.panY };
            this.container.style.cursor = 'grabbing';
            this.selectComponent(null);
        }

        _onMouseMove(e) {
            const rect = this.container.getBoundingClientRect();
            const sx = e.clientX;
            const sy = e.clientY;
            const wx = (sx - rect.left - this.panX) / this.zoom;
            const wy = (sy - rect.top - this.panY) / this.zoom;

            if (this.wireDrag) {
                this._updateDragLine(sx - rect.left, sy - rect.top);
                const pin = this.getPinAt(wx, wy);
                const indicator = document.getElementById('wire-drag-indicator');
                if (pin && pin.type === 'input' && pin.component !== this.wireDragSource.component) {
                    indicator.style.cursor = 'pointer';
                } else {
                    indicator.style.cursor = '';
                }
                return;
            }

            if (this._dragReady && this.dragComp) {
                const dx = wx - this._dragStartPos.x;
                const dy = wy - this._dragStartPos.y;
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    this.isDragging = true;
                    this._dragReady = false;
                    this.dragComp.el.classList.add('dragging');
                    this.container.style.cursor = 'grabbing';
                    const idx = this.components.indexOf(this.dragComp);
                    if (idx > -1) {
                        this.components.splice(idx, 1);
                        this.components.push(this.dragComp);
                        this.dragComp.el.style.zIndex = 10;
                    }
                } else {
                    return;
                }
            }

            if (this.isDragging && this.dragComp) {
                const newX = snap(wx - this.dragOffset.x);
                const newY = snap(wy - this.dragOffset.y);
                this.dragComp.x = newX;
                this.dragComp.y = newY;
                this.dragComp.updatePosition();
                this.updateAllWires();
                return;
            }

            if (this.isPanning) {
                this.panX = sx - this.panStart.x;
                this.panY = sy - this.panStart.y;
                this.updateTransform();
                return;
            }
        }

        _onMouseUp(e) {
            if (this._pressingButton) {
                this._pressingButton.release();
                this.simulator.propagateFromComponent(this._pressingButton);
                this._pressingButton = null;
            }
            if (this.wireDrag) {
                const rect = this.container.getBoundingClientRect();
                const wx = (e.clientX - rect.left - this.panX) / this.zoom;
                const wy = (e.clientY - rect.top - this.panY) / this.zoom;
                const pin = this.getPinAt(wx, wy);
                if (pin && pin.type === 'input' && pin.component !== this.wireDragSource.component) {
                    this.addWire(this.wireDragSource, pin);
                    this.simulator.propagateFromComponent(this.wireDragSource.component);
                }
                if (this.wireDragSource && this.wireDragSource.el) {
                    this.wireDragSource.el.classList.remove('connecting');
                }
                this.wireDrag = null;
                this.wireDragSource = null;
                const indicator = document.getElementById('wire-drag-indicator');
                indicator.style.display = 'none';
                return;
            }

            if (this._dragReady) {
                this._dragReady = false;
                this.dragComp = null;
            }

            if (this.isDragging && this.dragComp) {
                this.dragComp.el.classList.remove('dragging');
                this.dragComp.el.style.zIndex = '';
                this.isDragging = false;
                this.dragComp = null;
                this.container.style.cursor = '';
                return;
            }

            if (this.isPanning) {
                this.isPanning = false;
                this.container.style.cursor = '';
                return;
            }
        }

        _onWheel(e) {
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const oldZoom = this.zoom;
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom = clamp(this.zoom * delta, 0.2, 5);

            const worldX = (mx - this.panX) / oldZoom;
            const worldY = (my - this.panY) / oldZoom;
            this.panX = mx - worldX * this.zoom;
            this.panY = my - worldY * this.zoom;

            this.updateTransform();
            document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
        }

        _onKeyDown(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedComponent) {
                    this.removeComponent(this.selectedComponent);
                    this.selectComponent(null);
                }
            }
            if (e.key === 'Escape') {
                this.selectComponent(null);
                this.activeType = null;
                document.querySelectorAll('.sidebar-item.active').forEach(el => el.classList.remove('active'));
            }
        }

        _updateDragLine(cx, cy) {
            if (!this.wireDragSource) return;
            const srcPos = this.wireDragSource.getPos();
            const line = document.getElementById('drag-line');
            const indicator = document.getElementById('wire-drag-indicator');
            const rect = this.container.getBoundingClientRect();
            const sx = srcPos.x * this.zoom + this.panX;
            const sy = srcPos.y * this.zoom + this.panY;
            line.setAttribute('x1', sx);
            line.setAttribute('y1', sy);
            line.setAttribute('x2', cx);
            line.setAttribute('y2', cy);
        }

        setZoom(z) {
            this.zoom = clamp(z, 0.2, 5);
            this.updateTransform();
            document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
        }

        zoomIn() { this.setZoom(this.zoom * 1.3); }
        zoomOut() { this.setZoom(this.zoom / 1.3); }

        fitAll() {
            if (this.components.length === 0) return;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const c of this.components) {
                if (c.x < minX) minX = c.x;
                if (c.y < minY) minY = c.y;
                if (c.x + c.width > maxX) maxX = c.x + c.width;
                if (c.y + c.height > maxY) maxY = c.y + c.height;
            }
            const pad = 40;
            const rect = this.container.getBoundingClientRect();
            const availW = rect.width - pad * 2;
            const availH = rect.height - pad * 2;
            const compW = maxX - minX + pad * 2;
            const compH = maxY - minY + pad * 2;
            const scale = Math.min(availW / Math.max(compW, 1), availH / Math.max(compH, 1), 2);
            this.zoom = clamp(scale, 0.2, 5);
            this.panX = rect.width / 2 - ((minX + maxX) / 2) * this.zoom;
            this.panY = rect.height / 2 - ((minY + maxY) / 2) * this.zoom;
            this.updateTransform();
            document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
        }

        clear() {
            for (const w of [...this.wires]) this.removeWire(w);
            for (const c of [...this.components]) c.destroy();
            this.components.length = 0;
            this.wires.length = 0;
            this.selectComponent(null);
            this.panX = 0;
            this.panY = 0;
            this.zoom = 1;
            this.updateTransform();
            document.getElementById('zoom-level').textContent = '100%';
        }

        serialize() {
            return {
                components: this.components.map(c => c.serialize()),
                wires: this.wires.map(w => ({ id: w.id, source: w.sourcePin.id, target: w.targetPin.id })),
                panX: this.panX, panY: this.panY, zoom: this.zoom,
            };
        }

        deserialize(data) {
            this.clear();
            const pinMap = {};
            for (const cd of data.components) {
                const c = createComponent(cd.type, cd.x, cd.y);
                if (!c) continue;
                c.deserialize(cd);
                this.components.push(c);
                c.render(this.componentLayer);
                for (const pin of c.pins) {
                    pinMap[pin.id] = pin;
                }
                if (c.type === 'toggle-switch') {
                    c.evaluate();
                }
            }
            if (data.wires) {
                for (const wd of data.wires) {
                    const src = pinMap[wd.source];
                    const tgt = pinMap[wd.target];
                    if (src && tgt) {
                        const wire = new Wire(wd.id || uid(), src, tgt);
                        this.wires.push(wire);
                        wire.render(this.wireLayer);
                        wire.targetPin.setValue(wire.sourcePin.value);
                        wire.setValue(wire.sourcePin.value);
                    }
                }
            }
            this.panX = data.panX || 0;
            this.panY = data.panY || 0;
            this.zoom = data.zoom || 1;
            this.updateTransform();
            document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
            this.updateAllWires();
            this.simulator.evaluateAll();
        }
    }

    class App {
        constructor() {
            this.workspace = new Workspace(document.getElementById('workspace'));
            this.simulator = new Simulator(this.workspace);
            this.workspace.setSimulator(this.simulator);
            this.running = false;
            this._initToolbar();
            this._initSidebar();
            this._initModals();
        }
        _initToolbar() {
            document.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = btn.getAttribute('data-action');
                    switch (action) {
                        case 'new': this._newCircuit(); break;
                        case 'save': this._showSave(); break;
                        case 'load': this._showLoad(); break;
                        case 'clear': this._clear(); break;
                        case 'run': this._toggleRun(); break;
                        case 'zoom-in': this.workspace.zoomIn(); break;
                        case 'zoom-out': this.workspace.zoomOut(); break;
                        case 'fit': this.workspace.fitAll(); break;
                    }
                });
            });
        }
        _initSidebar() {
            document.querySelectorAll('.sidebar-item[data-type]').forEach(item => {
                item.addEventListener('click', () => {
                    const type = item.getAttribute('data-type');
                    if (this.workspace.activeType === type) {
                        this.workspace.activeType = null;
                        item.classList.remove('active');
                        return;
                    }
                    document.querySelectorAll('.sidebar-item.active').forEach(el => el.classList.remove('active'));
                    this.workspace.activeType = type;
                    item.classList.add('active');
                });
            });
            document.querySelectorAll('.sidebar-item[data-example]').forEach(item => {
                item.addEventListener('click', () => {
                    const ex = item.getAttribute('data-example');
                    this._loadExample(ex);
                });
            });
        }
        _initModals() {
            document.querySelector('[data-action="cancel-save"]').addEventListener('click', () => this._hideSave());
            document.querySelector('[data-action="confirm-save"]').addEventListener('click', () => this._doSave());
            document.querySelector('[data-action="cancel-load"]').addEventListener('click', () => this._hideLoad());
            document.getElementById('save-name-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._doSave();
            });
        }
        showProperties(comp) {
            const body = document.getElementById('properties-body');
            if (!comp) {
                body.innerHTML = '<p class="no-selection">Select a component to edit its properties</p>';
                return;
            }
            let html = '<div class="prop-group"><label>Label</label><input type="text" id="prop-label" value="' + comp.label.replace(/"/g,'&quot;') + '" /></div>';
            if (comp.type === 'clock') {
                html += '<div class="prop-group"><label>Clock Speed (Hz)</label><input type="number" id="prop-freq" value="' + comp.clockFreq + '" min="0.1" max="100" step="0.1" /></div>';
            }
            if (comp.type === 'toggle-switch') {
                html += '<div class="prop-group"><label>Initial Value</label><select id="prop-init"><option value="0"' + (comp.initialValue === 0 ? ' selected' : '') + '>LOW (0)</option><option value="1"' + (comp.initialValue === 1 ? ' selected' : '') + '>HIGH (1)</option></select></div>';
            }
            if (comp.type === 'led') {
                html += '<div class="prop-group"><label>Color</label><input type="color" id="prop-color" value="' + (comp.color || '#EF4444') + '" /></div>';
            }
            if (comp.type === 'lamp') {
                html += '<div class="prop-group"><label>Color</label><input type="color" id="prop-color" value="' + (comp.color || '#22C55E') + '" /></div>';
            }
            body.innerHTML = html;
            const labelInput = document.getElementById('prop-label');
            if (labelInput) {
                labelInput.addEventListener('input', () => {
                    comp.label = labelInput.value;
                    if (comp.labelEl) comp.labelEl.textContent = comp.label;
                });
            }
            const freqInput = document.getElementById('prop-freq');
            if (freqInput) {
                freqInput.addEventListener('input', () => {
                    const f = parseFloat(freqInput.value);
                    if (!isNaN(f) && f > 0) comp.setFreq(f);
                });
            }
            const initInput = document.getElementById('prop-init');
            if (initInput) {
                initInput.addEventListener('change', () => {
                    comp.initialValue = parseInt(initInput.value);
                    comp.value = comp.initialValue;
                    if (comp.valIndicator) {
                        comp.valIndicator.classList.toggle('high', comp.value === 1);
                    }
                    this.simulator.propagateFromComponent(comp);
                });
            }
            const colorInput = document.getElementById('prop-color');
            if (colorInput) {
                colorInput.addEventListener('input', () => {
                    comp.color = colorInput.value;
                    comp.evaluate();
                });
            }
        }
        _toggleRun() {
            const btn = document.querySelector('[data-action="run"]');
            if (this.running) {
                this.simulator.stop();
                this.running = false;
                btn.textContent = 'Start Clocks';
                btn.classList.remove('active');
            } else {
                this.running = true;
                btn.textContent = 'Stop';
                btn.classList.add('active');
                for (const c of this.workspace.components) {
                    if (c.type === 'clock') c.startClock();
                }
                this.simulator.evaluateAll();
            }
        }
        _newCircuit() {
            if (this.workspace.components.length > 0) {
                if (!confirm('Create a new circuit? Unsaved changes will be lost.')) return false;
            }
            this.simulator.stop();
            this.running = false;
            this.workspace.clear();
            this.workspace._pressingButton = null;
            document.querySelector('[data-action="run"]').textContent = 'Start Clocks';
            document.querySelector('[data-action="run"]').classList.remove('active');
            return true;
        }
        _clear() {
            if (this.workspace.components.length === 0) return;
            if (!confirm('Clear the workspace? This cannot be undone.')) return;
            this.simulator.stop();
            this.running = false;
            this.workspace.clear();
            document.querySelector('[data-action="run"]').textContent = 'Start Clocks';
            document.querySelector('[data-action="run"]').classList.remove('active');
        }
        _showSave() {
            document.getElementById('save-modal').style.display = 'flex';
            document.getElementById('save-name-input').value = '';
            document.getElementById('save-error').textContent = '';
            setTimeout(() => document.getElementById('save-name-input').focus(), 100);
        }
        _hideSave() { document.getElementById('save-modal').style.display = 'none'; }
        _doSave() {
            const name = document.getElementById('save-name-input').value.trim();
            if (!name) {
                document.getElementById('save-error').textContent = 'Please enter a circuit name.';
                return;
            }
            const data = this.workspace.serialize();
            data.name = name;
            data.savedAt = new Date().toISOString();
            const saved = JSON.parse(localStorage.getItem('circuits') || '{}');
            saved[name] = data;
            localStorage.setItem('circuits', JSON.stringify(saved));
            this._hideSave();
        }
        _showLoad() {
            const list = document.getElementById('saved-circuits-list');
            const saved = JSON.parse(localStorage.getItem('circuits') || '{}');
            const names = Object.keys(saved);
            if (names.length === 0) {
                list.innerHTML = '<div class="empty">No saved circuits found.</div>';
            } else {
                list.innerHTML = '';
                for (const name of names) {
                    const item = saved[name];
                    const div = document.createElement('div');
                    div.className = 'saved-circuit-item';
                    const date = item.savedAt ? new Date(item.savedAt).toLocaleDateString() : '';
                    div.innerHTML =
                        '<div class="circuit-info"><div class="circuit-name">' + name.replace(/</g,'&lt;') + '</div>' +
                        (date ? '<div class="circuit-date">' + date + '</div>' : '') + '</div>' +
                        '<div class="circuit-actions">' +
                        '<button class="load-btn">Load</button>' +
                        '<button class="delete-btn">Delete</button></div>';
                    div.querySelector('.load-btn').addEventListener('click', () => {
                        this._loadCircuitData(item);
                        this._hideLoad();
                    });
                    div.querySelector('.delete-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        delete saved[name];
                        localStorage.setItem('circuits', JSON.stringify(saved));
                        this._showLoad();
                    });
                    list.appendChild(div);
                }
            }
            document.getElementById('load-modal').style.display = 'flex';
        }
        _hideLoad() { document.getElementById('load-modal').style.display = 'none'; }
        _loadCircuitData(data) {
            this.workspace.deserialize(data);
            this.simulator.stop();
            this.running = false;
            document.querySelector('[data-action="run"]').textContent = 'Start Clocks';
            document.querySelector('[data-action="run"]').classList.remove('active');
        }
        _loadExample(name) {
            if (!this._newCircuit()) return;
            const add = (type, label, x, y) => {
                const c = this.workspace.addComponent(type, x, y);
                if (c) {
                    c.label = label;
                    if (c.labelEl) c.labelEl.textContent = label;
                }
                return c;
            };
            const wire = (src, tgt) => {
                if (!src || !tgt) return;
                this.workspace.addWire(src, tgt);
            };

            if (name === 'half-adder') {
                const a = add('toggle-switch', 'A', 40, 100);
                const b = add('toggle-switch', 'B', 40, 200);
                const xor = add('xor', 'XOR', 200, 100);
                const and = add('and', 'AND', 200, 200);
                const sum = add('led', 'Sum', 380, 100);
                const carry = add('led', 'Carry', 380, 200);
                wire(a.outputPins[0], xor.inputPins[0]);
                wire(a.outputPins[0], and.inputPins[0]);
                wire(b.outputPins[0], xor.inputPins[1]);
                wire(b.outputPins[0], and.inputPins[1]);
                wire(xor.outputPins[0], sum.inputPins[0]);
                wire(and.outputPins[0], carry.inputPins[0]);
            } else if (name === 'full-adder') {
                const a = add('toggle-switch', 'A', 40, 60);
                const b = add('toggle-switch', 'B', 40, 160);
                const cin = add('toggle-switch', 'Cin', 40, 260);
                const xor1 = add('xor', 'XOR1', 180, 60);
                const xor2 = add('xor', 'XOR2', 320, 60);
                const and1 = add('and', 'AND1', 180, 180);
                const and2 = add('and', 'AND2', 320, 200);
                const or = add('or', 'OR', 460, 200);
                const sum = add('led', 'Sum', 500, 60);
                const cout = add('led', 'Cout', 560, 200);
                wire(a.outputPins[0], xor1.inputPins[0]);
                wire(a.outputPins[0], and1.inputPins[0]);
                wire(b.outputPins[0], xor1.inputPins[1]);
                wire(b.outputPins[0], and1.inputPins[1]);
                wire(xor1.outputPins[0], xor2.inputPins[0]);
                wire(xor1.outputPins[0], and2.inputPins[0]);
                wire(cin.outputPins[0], xor2.inputPins[1]);
                wire(cin.outputPins[0], and2.inputPins[1]);
                wire(xor2.outputPins[0], sum.inputPins[0]);
                wire(and1.outputPins[0], or.inputPins[0]);
                wire(and2.outputPins[0], or.inputPins[1]);
                wire(or.outputPins[0], cout.inputPins[0]);
            } else if (name === 'xor-gate') {
                const a = add('toggle-switch', 'A', 40, 80);
                const b = add('toggle-switch', 'B', 40, 200);
                const not1 = add('not', 'NOT1', 180, 60);
                const not2 = add('not', 'NOT2', 180, 220);
                const and1 = add('and', 'AND1', 320, 60);
                const and2 = add('and', 'AND2', 320, 220);
                const or = add('or', 'OR', 460, 140);
                const out = add('led', 'Output', 580, 140);
                wire(a.outputPins[0], not1.inputPins[0]);
                wire(a.outputPins[0], and2.inputPins[0]);
                wire(b.outputPins[0], not2.inputPins[0]);
                wire(b.outputPins[0], and1.inputPins[0]);
                wire(not1.outputPins[0], and1.inputPins[1]);
                wire(not2.outputPins[0], and2.inputPins[1]);
                wire(and1.outputPins[0], or.inputPins[0]);
                wire(and2.outputPins[0], or.inputPins[1]);
                wire(or.outputPins[0], out.inputPins[0]);
            } else if (name === 'sr-latch') {
                const s = add('toggle-switch', 'S', 40, 60);
                const r = add('toggle-switch', 'R', 40, 220);
                const nor1 = add('nor', 'NOR1', 200, 60);
                const nor2 = add('nor', 'NOR2', 200, 220);
                const q = add('led', 'Q', 380, 60);
                const nq = add('led', '~Q', 380, 220);
                wire(r.outputPins[0], nor2.inputPins[0]);
                wire(s.outputPins[0], nor1.inputPins[0]);
                wire(nor1.outputPins[0], nor2.inputPins[1]);
                wire(nor2.outputPins[0], nor1.inputPins[1]);
                wire(nor2.outputPins[0], q.inputPins[0]);
                wire(nor1.outputPins[0], nq.inputPins[0]);
            } else if (name === '4bit-counter') {
                const freqs = [2, 1, 0.5, 0.25];
                const labels = ['Q0 (2Hz)', 'Q1 (1Hz)', 'Q2 (0.5Hz)', 'Q3 (0.25Hz)'];
                for (let i = 0; i < 4; i++) {
                    const clk = add('clock', labels[i], 40, 40 + i * 80);
                    if (clk) { clk.clockFreq = freqs[i]; clk.initialValue = 0; }
                    const led = add('led', 'LED' + i, 180, 40 + i * 80);
                    if (clk && led) wire(clk.outputPins[0], led.inputPins[0]);
                }
            }
            this.workspace.updateAllWires();
            this.simulator.evaluateAll();
        }
    }

    let app;
    document.addEventListener('DOMContentLoaded', () => {
        app = new App();
        window.app = app;
    });
})();
