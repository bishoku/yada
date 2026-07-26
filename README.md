https://github.com/user-attachments/assets/000e39c0-94d1-4335-8005-461be3a49aea

<div align="center">
 
  # YADA (Yet Another Diagram App) 🚀

  **An open-source, interactive architecture diagramming and simulation tool.**

  [![GitHub license](https://img.shields.io/github/license/bishoku/yada)](https://github.com/bishoku/yada/blob/main/LICENSE)
  [![GitHub stars](https://img.shields.io/github/stars/bishoku/yada)](https://github.com/bishoku/yada/stargazers)
  [![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Tauri](https://img.shields.io/badge/tauri-%2324C8DB.svg?style=flat&logo=tauri&logoColor=white)](https://tauri.app/)

  ### [Try the Live Web Demo](https://bishoku.github.io/yada) | [Explore Live Architectural Patterns Showcase](https://bishoku.github.io/yada/diagram.html)
</div>

---

Unlike static diagramming tools, YADA allows you to define sequence steps on your connections and playback data flow simulations in real-time. It helps you visualize complex distributed system interactions, microservice flows, and asynchronous messaging processes interactively.

## 📸 Sneak Peek & Interactive Showcase

<div align="center">

![img.png](assets/img.png)

![test_flow.gif](assets/test.gif)

</div>

> 🔗 **Interactive Showcase**: Check out our live pattern showcase at [https://bishoku.github.io/yada/diagram.html](https://bishoku.github.io/yada/diagram.html) featuring live simulations for **SAGA Orchestration**, **CQRS & Event Sourcing**, **Microservice Rate Limiting**, **Sharded Caching**, and **Multi-Region DB Replication**.

## ✨ Key Features

- **⚡ Interactive Architecture Canvas**: Drag and drop standard architectural components or custom nodes onto a limitless, responsive grid canvas.
- **🎬 Real-Time Visual Flow Simulation**: Connect nodes and define execution sequence steps. Play back data flow simulations at adjustable speeds with animated tokens.
- **⏱️ Timeline & Sequence Panel**: Manage and fine-tune your operations with a video-editor-style timeline interface. Control step durations, delays, async/sync flags, and round-trip responses.
- **📊 Automatic Sequence Diagram View**: Switch between 2D topology diagrams and dynamic UML Sequence Diagrams with live activation lifelines.
- **🏗️ 15 Built-In Architectural Components**: Dedicated presets for `Client`, `CDN / Edge Network`, `Firewall / WAF`, `Load Balancer`, `API Gateway`, `Auth / Identity Provider`, `Server`, `Serverless / Worker`, `Database`, `Cache`, `Object Storage (S3/Bucket)`, `Search / Vector DB`, `Message Queue`, `Event Bus / Pub-Sub`, and `External Service / SaaS`.
- **🏷️ 100+ Devicon Integration**: Enhance components with authentic technology brand logos (Docker, Kubernetes, PostgreSQL, Redis, Kafka, Nginx, AWS, GCP, Azure, Go, Node.js, Python, Rust, etc.).
- **🕵️ OpenTelemetry / Tempo Trace Import**: Import JSON distributed trace spans (Tempo / Jaeger) to automatically construct your system topology and step sequences.
- **🎨 Component Studio**: Build custom multi-layer SVG component templates, customize properties, and save them to your reusable local component library.
- **🤖 AI-Powered Diagram Generation**: Generate full `.dproj` architecture diagrams and simulations from natural language system descriptions.
- **📤 Standalone HTML & Workspace Export**: Export zero-dependency interactive HTML files with embedded simulation engines, or share `.dproj` project files and instant preview links.
- **🎨 Advanced Visual Customization**:
  - Custom color palettes & hex picker
  - Border-Only vs Solid Fill toggles with automatic WCAG AAA contrast calculation
  - Custom connection ports / handle editor
  - 90° node rotation with responsive vertical label rendering
  - Animated Sticky Notes with custom timing and styling
- **📱 Responsive Mobile & Desktop Support**: Desktop app powered by Tauri v2 (Mac, Windows, Linux) plus fully responsive Web UI.

## 🛠 Tech Stack

Built with a modern and performant stack:

- **Frontend Core:** React 19, TypeScript
- **Styling:** TailwindCSS v4, Lucide Icons, Devicon
- **State Management:** Zustand (modular slice-based architecture)
- **Canvas Engine:** React Flow (`@xyflow/react`)
- **Desktop Framework:** Tauri v2 (Rust backend)
- **Build Tool:** Vite (PWA & Offline Web ready)

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri desktop app)
- Tauri dependencies (varies by OS, see [Tauri Setup Guide](https://v2.tauri.app/start/prerequisites/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/bishoku/yada.git
   cd yada
   ```

2. Install NPM dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run dev
   ```
   *For Tauri desktop development:*
   ```bash
   npm run tauri dev
   ```

### Building for Production

To create a web build:
```bash
npm run build
```

To create a production-ready desktop executable:
```bash
npm run tauri build
```
The compiled binaries will be available in `src-tauri/target/release/`.

## 🏗 Architecture & Codebase

YADA follows a clean, modular architecture:

- `src/components/canvas/`: Contains React Flow nodes, custom SVG renderers, handle editors, and animation hooks (`useCanvasSync`, `useNodeAnimation`).
- `src/components/sequence/`: UML Sequence Diagram generator and lifeline layout engines.
- `src/components/studio/`: Visual SVG Component Studio for building reusable custom component templates.
- `src/adapters/`: Tracing and telemetry adapters (e.g. `tempoAdapter.ts` for OpenTelemetry/Jaeger/Tempo trace imports).
- `src/registry/`: `NodeRegistry` (15 standard architectural nodes) and `DeviconRegistry` (100+ technology logos).
- `src/store/`: Global state managed via Zustand, organized into focused slices (`canvasSlice`, `timelineSlice`, `studioSlice`, `workspaceSlice`).

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
