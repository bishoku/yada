# Diagrammer (ArchFlow) 🚀

Diagrammer is an open-source, desktop-based architecture diagramming and simulation tool built with **Tauri**, **React**, **React Flow**, and **Zustand**. 

Unlike static diagramming tools, Diagrammer allows you to define sequence steps on your connections and playback data flow simulations in real-time, helping you visualize complex distributed system interactions and asynchronous processes.

## ✨ Features

- **Interactive Architecture Canvas:** Drag and drop various nodes (Client, Server, Database, Cache, Queue, Load Balancer, AWS services, etc.) onto a limitless canvas.
- **Visual Flow Simulation:** Connect nodes and define steps to create a sequence. Play back the entire flow with adjustable speeds to visualize how data moves through your system.
- **Timeline Panel:** Manage and sequence your operations using a video-editor-like timeline interface. Adjust durations, delays, and order with ease.
- **Asynchronous & Synchronous Flows:** Distinguish between blocking synchronous requests and non-blocking asynchronous events natively in your simulations.
- **Cross-Platform:** Available as a standalone native desktop application for Mac, Windows, and Linux thanks to Tauri.
- **Theme Support:** Beautiful Dark and Light modes.
- **Customizable Nodes & Edges:** Configure protocols (HTTP, gRPC, WebSocket), edge descriptions, tooltips, round-trip times, and more.

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, TailwindCSS v4, Lucide Icons
- **State Management:** Zustand (with a modular slice-based architecture)
- **Canvas Engine:** React Flow (@xyflow/react)
- **Desktop Framework:** Tauri v2 (Rust backend)
- **Build Tool:** Vite

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri)
- Tauri dependencies (varies by OS, see [Tauri Setup Guide](https://v2.tauri.app/start/prerequisites/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/diagrammer.git
   cd diagrammer
   ```

2. Install NPM dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run tauri dev
   ```

### Building for Production

To create a production-ready executable for your platform:

```bash
npm run tauri build
```
The compiled binaries will be available in `src-tauri/target/release/`.

## 🏗 Architecture & Codebase

Diagrammer follows a clean, modular architecture:

- `src/components/canvas/`: Contains all React Flow components, custom node definitions, and optimized rendering hooks (`useCanvasSync`, `useNodeAnimation`).
- `src/components/layout/`: The overall application shell, top bar, sidebars, and panel resizing logic.
- `src/components/timeline/`: The robust sequence simulator and playback UI.
- `src/store/`: Global state managed via Zustand, split into focused slices (`canvasSlice`, `timelineSlice`, etc.) for performance and maintainability.
- `src/registry/`: An extensible `NodeRegistry` making it trivial to add new node types to the application without touching core canvas logic.

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
