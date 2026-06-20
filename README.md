# Digital Logic Circuit Simulator

An interactive digital logic circuit simulator built with vanilla HTML, CSS, and JavaScript. Design, simulate, and visualize digital circuits directly in your browser — no dependencies, no build step, no server required.

## Features

- **Component Library** — Toggle switches, push buttons, clocks, LEDs, lamps, 7-segment displays, and all basic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR), plus advanced blocks (Half Adder, Full Adder, Multiplexer, Decoder, Encoder).
- **Drag & Drop** — Click a component in the sidebar, then click the workspace to place it. Drag placed components to reposition. 5px drag threshold prevents accidental moves.
- **Wire Connections** — Click an output pin and drag to an input pin to create a wire. Wires auto-route with bezier curves, show signal state with color (green = HIGH, dim = LOW).
- **Simulation Engine** — Reactive evaluation propagates signal changes through the circuit instantly. Clock components tick independently when started. Feedback loops (e.g., SR latch) are handled with visit-count limiting.
- **Zoom & Pan** — Scroll to zoom, drag the background to pan, or use the zoom controls and Fit button.
- **Properties Panel** — Select any component to edit its label, clock speed, initial value, or color.
- **Save & Load** — Save circuits to `localStorage` and load them later. Saved circuits persist across page refreshes.
- **Example Circuits** — Pre-built examples: Half Adder, Full Adder, XOR from basic gates, SR Latch, 4-bit Counter demo.

## Usage

Open `index.html` in any modern browser. No server or installation required.

If `localStorage` is blocked (some browsers restrict it on `file://` protocol), save/load will be unavailable — use a local HTTP server instead:

```
npx serve .
```

## Project Structure

```
├── index.html      — HTML shell (toolbar, sidebar, workspace, modals)
├── style.css       — Full dark theme and component styling (~18 KB)
└── script.js       — All application logic (~61 KB, 1500+ lines)
```

## Architecture

### Classes

- **`Pin`** — Input or output terminal on a component. Stores value, tracks connected wires.
- **`Wire`** — Connection between an output pin and an input pin. SVG bezier path, color-coded by signal state.
- **`Component`** — Base class for all circuit elements. Subclasses: `GateComponent`, `ToggleSwitch`, `PushButton`, `Clock`, `LED`, `Lamp`, `SevenSegment`, `HalfAdder`, `FullAdder`, `Multiplexer`, `Decoder`, `Encoder`.
- **`Simulator`** — Queue-based propagation engine. Walks component graph from a changed node, re-evaluates, and propagates new values. Limits visits per component (5) to handle feedback loops.
- **`Workspace`** — Manages the interactive canvas: component placement, wire creation, selection, drag, zoom/pan, serialization.
- **`App`** — Top-level controller: initializes the workspace and simulator, wires up toolbar/sidebar/modals.

### Signal Flow

1. User action changes a component's output (toggle, button press, clock tick, etc.)
2. `Simulator.propagateFromComponent()` enqueues the changed component and its transitive fan-out
3. Each component in the queue is re-evaluated; if its output changed, the new value is pushed through connected wires to downstream components
4. `evaluateAll()` does a full re-evaluation: syncs wire values, evaluates input components, then iterates gates for up to 5 passes (or until stable)

### Data Persistence

Circuits are serialized to JSON and stored in `localStorage` under the key `circuits`. Each saved circuit stores component positions, labels, clock settings, wire topology, and viewport state.
