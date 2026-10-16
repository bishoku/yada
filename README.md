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

## Timeline editing

The timeline supports zoom (1×–8×), horizontal scrolling, **Fit timeline**, **Go to playhead**, previous/next step navigation, and a keyboard-operable playback-position slider. Play resumes from the current position; Stop returns to the beginning. These are playback controls and do not change saved step timing.

Select a step to see its calculated start/end times, then use **Edit step** for precise duration, delay and internal-process values in milliseconds. Delay is added according to the existing scheduler's predecessor rules; it is not an absolute start time. Concurrent steps and nested round trips retain their existing behavior. Fractional timing values are retained.

Sequence timing bars accept mouse, touch and pen pointer input. Dragging previews delay changes; resizing previews duration changes. Release applies one undoable edit, while Escape cancels the preview. Editing is disabled during playback and in read-only views. A stale edit cannot overwrite a different active document.

Timeline and sequence controls share English/Turkish domain terminology. Number formatting follows the selected language; diagram labels, schema keys and stored numeric values remain unchanged. Remaining older UI areas may still use legacy translation patterns.

## Mermaid sequence import and export

Import Mermaid text or `.mmd`/`.mermaid` files from the welcome screen's import menu. The preview lists unsupported statements with source line numbers and explains playback approximations. Invalid block nesting prevents saving the preview.

Supported interchange includes participants/actors and aliases, declaration order, repeated/reverse/self messages, solid/dashed/open/cross/bidirectional arrows, notes and line breaks, explicit and shorthand activations, boxes, title/autonumber, and nested `alt`/`else`, `opt`, `loop`, `par`/`and`, `critical`/`option`, `break`, and `rect` blocks. This is a supported subset, not a claim of complete Mermaid syntax compatibility. Participant JSON configurations, creation/destruction, actor menus, newer half-arrow/central-connection syntax, and configuration directives are not interpreted.

Use **Export → Mermaid sequence diagram (.mmd)** to preview, copy or download text. Current participant names, connection descriptions and note text are exported. Imported block structure and activation directives are retained through saving/reloading; deleting referenced content produces an export warning, and new steps are appended to imported structure. If step ordering has changed, the exporter warns that the retained block order may differ. Existing YADA round trips export as forward and return messages using their scheduled order.

Mermaid does not encode YADA timing, animation, custom SVG assets or canvas styling. Keep `.dproj` for a lossless editable project. Imported blocks/activations are preserved semantically for Mermaid re-export; YADA playback presents all messages and does not evaluate alternatives, repeat loops or reproduce full Mermaid activation semantics. Notes remain sticky notes on the topology canvas. New imports receive authored-order playback defaults; existing diagrams keep their stored IDs, durations, delays and round-trip behavior. Optional metadata uses schema v2 and requires no migration of existing files.

Syntax reference: [Mermaid sequence diagrams](https://mermaid.js.org/syntax/sequenceDiagram.html).

## 🔌 Embedding YADA in External Applications

YADA supports seamless embedding into third-party web apps, note-taking applications, wikis, or CMS platforms via `iframe` and bidirectional `window.postMessage`.

### 1. Embed Mode (`?embed=true`)
Add `?embed=true` to the URL when embedding YADA inside an `iframe`:

```html
<iframe src="https://bishoku.github.io/yada/?embed=true" width="100%" height="600px"></iframe>
```

**Clean Embed Features (`?embed=true`):**
- **Enforced Light Theme**: Ensures visual consistency within host application modals or panels.
- **Streamlined UI**: Hides workspace settings, global export dropdowns, and workspace diagram lists to focus purely on the diagram canvas.
- **Auto-Fit View on Save**: Automatically centers and frames all diagram nodes with optimal padding before generating preview images.

### 2. `postMessage` Communication Protocol

#### Load Diagram into YADA
When YADA loads, it emits a `READY` message. Send `LOAD_DIAGRAM` with your logical and visual data:

```javascript
const iframe = document.querySelector('iframe');

window.addEventListener('message', (event) => {
  if (event.data?.type === 'READY') {
    iframe.contentWindow.postMessage({
      type: 'LOAD_DIAGRAM',
      payload: {
        logicalJson: JSON.stringify(logicalData),
        visualJson: JSON.stringify(visualData),
      }
    }, '*');
  }
});
```

#### Save Diagram Event
YADA emits `SAVE_DIAGRAM` whenever the diagram changes or a save is requested:

```javascript
window.addEventListener('message', (event) => {
  if (event.data?.type === 'SAVE_DIAGRAM') {
    const { logicalJson, visualJson, previewDataUri } = event.data.payload;
    // Store JSON definitions and previewDataUri (PNG Data URL) in host storage
  }
});
```

#### Request Save and Close
Send `REQUEST_SAVE_AND_CLOSE` when the user clicks "Close" in the host application modal:

```javascript
// Request YADA to fitView, export PNG preview, emit SAVE_DIAGRAM, then CLOSE_DIAGRAM
iframe.contentWindow.postMessage({ type: 'REQUEST_SAVE_AND_CLOSE' }, '*');

window.addEventListener('message', (event) => {
  if (event.data?.type === 'CLOSE_DIAGRAM') {
    // Close modal in host application
  }
});
```

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


### Saving and browser navigation

Standalone YADA records workspace, diagram and freeform/sequence view changes in browser history. Back/Forward and reload restore locally available diagrams; these local navigation URLs require the original workspace and are not share links. Forge, Confluence Data Center and embedded hosts retain their own navigation.

Navigation waits for unsaved diagram changes to save. Failed writes display retry controls, and edits made while saving remain unsaved until the next successful save. Closing a browser with unsaved changes requests the browser's standard warning where supported; crash recovery is not provided. Existing diagram formats are unchanged.


### Playback performance profiling

With the development server running, open `/scripts/playback-profile.html` to measure the real freeform or sequence canvas using disposable 25/250/1,000-message fixtures. Select a view and size, then choose **Measure playback**. Results include frame intervals, React rendering time and browser heap usage when available. The page does not persist fixtures and is excluded from the production application entry point. Short development samples are diagnostic; see `evaluation.md` for measured results and limitations.


For production playback measurements, run `npm run build:profile` and `npm run preview:profile`, then open `http://127.0.0.1:1422/scripts/playback-profile.html`. This separate build is excluded from the shipped application and its PWA cache. The profiler defaults to five 30-second samples, each after a one-second warmup, with looping enabled only during measurement. Keep the tab visible; background samples are rejected. Results include browser, viewport, hardware concurrency, pixel ratio and sample time. Record the device model, power mode and browser version alongside the output when comparing changes. A 2-second/1-run option is for smoke checks only.

Standard production React builds do not expose Profiler callbacks, so React commit/render metrics are `null` in production results. Frame intervals remain available; optional heap readings are browser-specific and are not leak proofs. The harness uses 20 participants with parallel edges and round trips, not every real-world diagram shape. Do not compare its initial download size with the application entry point.

Large sequence diagrams render messages near the viewport while retaining the complete participant layout for **Fit View**. PNG/SVG and DOM video capture temporarily render all messages, then restore viewport rendering. This is a display optimization; existing files, timing and seeking semantics are unchanged. The profiling page includes paused-seek and PNG/SVG capture checks.


Editor and shared/embed simulation playback share one clock-driven loop. Canvas media rendering caches document geometry across frames; these caches are derived and do not change saved files. The development profiler also provides **Shared freeform**, **Seek visible message**, and **Check Canvas 2D renderer** checks. Dense live freeform rendering still has known performance limits described in `evaluation.md`.

### Localization and compact editor layout

TR/EN UI text lives in typed catalogs under `src/i18n/`, including accessible canvas labels and exported HTML player controls. Catalog checks validate non-empty entries and matching interpolation parameters; the UI text coverage test flags uncatalogued JSX copy except explicit technical terms. User-authored diagram names, notes and protocol values retain their original content when switching language.

Below 1,024 px, the component library, properties and timeline open as individual drawers. Components can be added by touch or keyboard as well as desktop drag-and-drop. Closing properties before applying reverts its temporary preview. Advanced toolbar actions live in the labeled tools menu. Modal surfaces manage focus, Escape and focus restoration; the desktop timeline divider also supports arrow keys, Home and End.

### Loading and large freeform diagrams

Technology icon variants load when used; the collapsed icon picker does not mount its catalog. PWA installations cache these optional variants on demand (up to 400 entries for 30 days) instead of downloading the full icon collection with the shell. An icon variant not previously cached needs a connection on first use. DOM image/video capture waits for the selected document icons before cloning the canvas.

Import parsers, automatic layout, host viewers and media/HTML export implementations load at their feature boundaries. Freeform edges share document-revision topology indexes and sample single cubic particle paths numerically; compound/orthogonal paths retain SVG sampling. The host viewer uses the shared frame clock, preserving its automatic looping without changing the editor's loop preference.

Run `node scripts/bundle-report.mjs dist` after a production build to report the static JavaScript import closure and the default welcome route. Sizes are summed raw/gzip file bytes, not measured network transfers or Core Web Vitals. See `evaluation.md` for paired production playback results and remaining limits.

### Shared controls, local fonts and getting started

Reusable controls live in `src/components/ui/`: Button, IconButton, Field/Input/Textarea/Select, Menu, Tooltip, Tabs, Toast, EmptyState and Dialog. Supply translated labels from the catalogs, preserve native field attributes, and use Field for associated labels, hints and validation errors. Menus support arrow keys, Home/End, locale-aware typeahead and Escape; tabs use a single keyboard tab stop. Shared styles define focus, disabled/busy states, mobile touch sizes and reduced motion.

Outfit and Plus Jakarta Sans are served locally from `public/fonts/`, including Latin Extended subsets for Turkish. Caveat and Kalam load when drawing content or tools need them. UI fonts are included in the PWA shell; drawing fonts are cached on use, so their first offline use requires a previous online load. Font licenses and provenance are alongside the assets. Standalone HTML players embed their UI fonts and do not request Google Fonts. Media capture waits for requested fonts before cloning the document.

The welcome screen offers a blank diagram, an editable request-flow example, import and named workspaces. A genuinely empty editable canvas explains adding components, connecting them and playing the flow. The example inserts three localized components and two round-trip steps as one undoable edit; it preserves canvas preferences and never replaces authored content, read-only documents, previews or collaborative sessions. Changing language leaves existing diagram content intact. Creating a workspace starts an independent undo history.

### Updates, offline use and output recovery

The standalone production web app installs a service worker; Forge and Data Center builds do not generate one, and desktop/embedded sessions do not register it. Updates wait for **Save and update**. Saving is checked before activation and again before reloading, so failed writes or edits made while saving keep the document open. Other tabs receive a prompt and keep their form drafts. Updates are blocked during component editing, import previews and live collaboration; finish those sessions first. This follows the plugin's [prompt update lifecycle](https://vite-pwa-org.netlify.app/guide/prompt-for-update), with explicit save checks instead of automatic reload.

The cached shell and saved local diagrams can reopen without a connection after offline installation completes. TR/EN notices explain connection loss, recovery and setup/update failure. Optional icons and drawing fonts must have been loaded previously to be available offline; missing icon loads retry after an online event. **Save and reload** on reconnection provides a guarded recovery if a browser still retains a failed module load. Cloud storage, external references, sharing and live collaboration require their respective services. The browser's online/offline signal is a connection hint, not a guarantee that a cloud service is reachable.

Serve `sw.js` without a long-lived HTTP cache and retain the preceding release's hashed assets during rolling deployments: open tabs can still request their older lazy modules. Verify upgrades from the deployed production version on a staging origin before release; a local waiting-worker check does not cover every previously installed version. Resource URLs such as SVG, images, video and project archives are excluded from SPA navigation fallback.

PNG/SVG capture restores the actual viewport, UI display styles, capture mode and playback position after completion or failure. Capture failures propagate to the existing localized error dialog. Broken project JSON is rejected before workspace/component writes. Archive regression tests include both supported envelope shapes and a fixture downloaded through the production export menu; tests retain names, round trips and timing. Complex-document output and live host acceptance remain tracked in `YADA-UI-UX-PLAN.md`.


### Editing and startup measurements

`npm run measure:editing` runs the isolated store CPU/retained-history benchmark with forced GC. `npm run build:startup-profile` and `npm run preview:startup-profile` enable the visible local startup probe; the probe is absent from normal production builds, and service-worker installation is disabled in the startup profile. Methodology, paired reports, limits and compact-control acceptance are in [the 2026-10-16 report](performance/2026-10-16/editing-and-startup.md). These local measurements do not establish real-user Core Web Vitals or large-simulation performance.
