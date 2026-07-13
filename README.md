# VoltLab — Digital Logic Circuit Simulator

[![Live Demo](https://img.shields.io/badge/Live_Demo-volt--lab-seven.vercel.app-blue?style=for-the-badge&logo=vercel)](https://volt-lab-seven.vercel.app/)

An interactive digital logic circuit simulator built with **React 18**, **Vite**, and **Tailwind CSS v3**. Design, simulate, and visualize digital circuits directly in your browser — no backend required.

## Live Demo

**[volt-lab-seven.vercel.app](https://volt-lab-seven.vercel.app/)**

## Features

- **Component Library** — Toggle switches, push buttons, clocks, LEDs, lamps, 7-segment displays, and all basic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR), plus advanced blocks (Half Adder, Full Adder, Multiplexer, Decoder, Encoder).
- **Drag & Drop** — Click a component in the sidebar, then click the workspace to place it. Drag placed components to reposition. 5px drag threshold prevents accidental moves.
- **Wire Connections** — Click an output pin and drag to an input pin to create a wire. Wires auto-route with bezier curves, show signal state with color (green = HIGH, dim = LOW).
- **Simulation Engine** — Reactive evaluation propagates signal changes through the circuit instantly. Clock components tick independently when started. Feedback loops (e.g., SR latch) are handled with visit-count limiting.
- **Zoom & Pan** — Scroll to zoom, drag the background to pan, or use the zoom controls and Fit All button.
- **Properties Panel** — Select any component to edit its label, clock speed, initial value, or color.
- **Save & Load** — Save circuits to `localStorage` and load them later. Saved circuits persist across page refreshes.
- **Example Circuits** — Pre-built examples: Half Adder, Full Adder, XOR from basic gates, SR Latch, 4-bit Counter demo.
- **Responsive Design** — Works on desktop, tablet, and mobile with touch support for placing, dragging, and wiring components.

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the app at `http://localhost:5173/` with hot module replacement.

### Build

```bash
npm run build
```

Produces an optimized build in the `dist/` folder.

### Preview

```bash
npm run preview
```

Serves the production build locally for testing.

## Project Structure

```
├── index.html              — Vite entry HTML
├── vite.config.js          — Vite configuration
├── tailwind.config.js      — Tailwind theme (colors, fonts, keyframes)
├── postcss.config.js       — PostCSS (Tailwind + autoprefixer)
├── .gitignore
├── public/
│   └── favicon.svg         — Browser tab icon
└── src/
    ├── main.jsx            — React entry point
    ├── index.css           — Tailwind directives + custom component styles
    ├── App.jsx             — Root layout (responsive sidebar/workspace/properties)
    ├── hooks/
    │   └── useCircuit.js   — Core hook: classes, simulation, state, events
    └── components/
        ├── Toolbar.jsx         — Action buttons, clock toggle, zoom controls
        ├── Sidebar.jsx         — Component library grouped by type
        ├── Workspace.jsx       — SVG wire layer + circuit component layer
        ├── CircuitComponent.jsx — Per-type component visuals and pins
        ├── PropertiesPanel.jsx — Context-sensitive property editor
        ├── SaveModal.jsx       — Save circuit dialog
        ├── LoadModal.jsx       — Load/delete circuit dialog
        └── shared.jsx          — Shared constants, SVG icons, gate config
```

## Architecture

### Core Classes (`useCircuit.js`)

- **`Pin`** — Input or output terminal on a component. Stores value, tracks connected wires.
- **`Wire`** — Connection between an output pin and an input pin. SVG bezier path, color-coded by signal state.
- **`Component`** — Single class for all circuit elements (gates, I/O, displays). A `createComponent()` factory sets pin layout per type.

### Simulation Engine

1. User action changes a component's output (toggle, button press, clock tick, etc.)
2. `circuit.propagateFromComponent()` enqueues the changed component and its transitive fan-out via BFS traversal
3. Each component in the queue is re-evaluated; if its output changed, the new value is pushed through connected wires to downstream components
4. `circuit.evaluateAll()` does a full re-evaluation: syncs wire values, evaluates sources, then iterates gates for up to 5 passes (or until stable)

### Data Persistence

Circuits are serialized to JSON and stored in `localStorage` under the key `circuits`. Each saved circuit stores component positions, labels, clock settings, wire topology, and viewport state.

## Built With

- [React 18](https://react.dev/)
- [Vite 6](https://vitejs.dev/)
- [Tailwind CSS v3](https://tailwindcss.com/)
