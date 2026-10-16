# YADA project evaluation

Initial review: 12 October 2026  
Focused reassessment: 13 October 2026 (see final section)  
Reviewed version: package version `0.1.6`  
Scope: current local repository; code quality, correctness, performance, and user experience.

## Executive assessment

The focused reassessment at the end prioritizes sequence fidelity, Confluence capability restrictions, playback performance, timeline UX, consistent i18n, import/export formats and history-backed navigation, with backward compatibility as a release gate.

YADA has a compelling core: an architecture diagram can explain both system structure and the order in which interactions happen. The topology canvas, timeline, sequence view, trace import, and portable playback exports reinforce that idea. Component customization, AI assistance, and wiki integration broaden its usefulness considerably.

The next investment should be reliability and consistency across those features. Save behavior is implemented in several places with different guarantees; collaboration applies mutations through a path that bypasses derived-state recalculation; import normalization differs by entry point. These are more urgent than adding additional diagram types or visual controls because they undermine confidence in saved work and simulation accuracy.

The architecture already contains good foundations: separate logical and visual documents, storage drivers, focused canvas hooks, a centralized scheduler, a frame clock outside React, strict TypeScript settings, schema migration, and targeted tests. Improvements should consolidate these foundations rather than replace the stack.

**Recommended order:** protect saved work → unify document mutations and validation → secure portable/embedded boundaries → establish integration tests → measure and optimize performance → simplify first-use and editing workflows.

## Method and confidence

This evaluation inspected the application entry point, state slices, scheduler/clock, storage drivers, sharing and export utilities, trace adapter, AI validation and credential storage, selected layouts and modals, build configuration, and deployment workflows.

Validation performed:

| Check | Result |
| --- | --- |
| `npm test` | Passed: 10 files, 53 tests; reported duration 338 ms |
| `npm run build` | Passed: TypeScript and production Vite/PWA build |
| Build observations | Chunk-size warnings and ineffective dynamic-import warnings |
| PWA output | 150 precache entries, 10,890.51 KiB |
| Working tree | Clean before report creation; no source changes made |

“Confirmed” below means the behavior follows directly from the inspected implementation. It does not imply a browser reproduction. Performance risks and UX proposals are explicitly identified as such. No interactive browser walkthrough, accessibility audit, desktop executable run, real Confluence/Drive session, multi-peer network exercise, or large-diagram benchmark was performed. Passing unit tests do not establish those outcomes. This is a repository evaluation, not a dependency vulnerability audit or comprehensive security assessment.

## Core feature evaluation

| Feature | Value and implementation strengths | Main improvement |
| --- | --- | --- |
| Architecture canvas | React Flow plus component presets, technology icons, sections, custom ports, routing, selection and freehand tools support expressive diagrams. Canvas behavior is already split into hooks. | Preserve graph invariants through one mutation API; improve keyboard alternatives and benchmark large diagrams. |
| Simulation and timeline | Adjustable playback, sequence ordering, timing, async interactions and round trips make YADA useful for architectural explanations. Scheduler and clock have tests. | Ensure all edit/import/collaboration paths recalculate the same schedules. Explain timing and concurrency in the UI. |
| Automatic sequence view | Reusing the document for topology and sequence representations is a strong differentiator. Sequence canvas is lazy loaded. | Add parity fixtures across topology, sequence view, and exported playback; preserve selection when switching views. |
| Trace import | Tempo/OTLP adapter extracts services, attributes, relationships, and generated layout. Preview/filter components provide a basis for handling noisy traces. | Test input variants, missing parents, multiple traces and large datasets; show what was dropped or synthesized. |
| Component Studio | Reusable custom SVG components extend the product beyond fixed presets. | Make library portability and missing-component handling explicit; add representative round-trip fixtures. |
| AI assistance | Agent service has dedicated tests; payload repair checks graph references; credential vault uses AES-GCM and a non-extractable key where available. | Reuse a common document validator and present repairs, affected entities, and an undoable preview before applying changes. |
| Sharing and exports | `.dproj`, HTML playback, images/video and encrypted sharing support communication outside the editor. | Escape embedded document data correctly, test runtime parity, and provide capability/progress/cancellation feedback. |
| Workspace persistence | Driver interface supports browser storage, filesystem, desktop and embedded integrations. | Standardize save results and revision tracking; never report durable success for volatile fallback storage. |
| Collaboration | Separate reliable/unreliable channels, cursor throttling and relay fallback show deliberate transport design. | Maintain derived state, validate messages, make mutations idempotent, and establish conflict/reconnect semantics. |
| Web, desktop and Confluence | Broad deployment coverage can bring diagrams directly into documentation workflows. | Reduce platform branching in application startup and verify integration contracts independently. |

YADA is best positioned as an **architecture storytelling and interaction playback tool**. The inspected scheduling code does not establish a capacity simulator with queueing, stochastic latency distributions, saturation or calibrated throughput. Product language should explain that distinction so animated flows are interpreted correctly.

## Priority findings and concrete remedies

Priority definitions: **P1** should be addressed before a reliability-focused release; **P2** should follow in the next improvement cycle; **P3** is a planned enhancement. Effort estimates are relative engineering sizes, not delivery promises.

### F1 — Save failures and concurrent edits can lose protection (P1, confirmed)

Evidence: `src/store/slices/workspaceSlice.ts`, `manualSave` and `switchDiagram`; `src/store/useAppStore.ts`, `performSave`; `src/App.tsx`, `handleConfluenceSaveAndClose`.

`manualSave` snapshots the document, awaits persistence, then unconditionally clears `isDirty`. An edit made during that await is newer than the saved snapshot but is marked clean. It also catches errors without returning failure. `switchDiagram` awaits it and then replaces the document regardless of whether saving succeeded. In Confluence, the save handler logs failures and subsequently closes the modal with a saved result. By contrast, the autosave path already compares document references before clearing dirty state.

**Remedy:** create a single save coordinator returning a structured success/failure result, tied to workspace, diagram ID and document revision. Serialize overlapping saves and clear dirty state only when the saved revision is still current. Stop navigation or closing on failure and retain the edited document with a visible retry/export option. Use the same coordinator in manual save, autosave and integrations.

**Acceptance:** a rejected driver write keeps the editor open and dirty; switching diagrams after failure does not replace unsaved work; an edit during a delayed save remains dirty; overlapping saves cannot mark the wrong revision clean. Effort: medium.

### F2 — Browser storage can silently acknowledge volatile writes (P1, confirmed)

Evidence: `src/services/storage/drivers/LocalStorageDriver.ts`, `safeStorage.setItem` and `getItem`.

A localStorage write error is swallowed and the value is stored in a process-memory map. The driver still resolves successfully, allowing save UI to claim success. Reloading loses the fallback value. When a failed overwrite leaves an older localStorage value, reads prefer that stale durable value over the newer memory value.

**Remedy:** return an explicit persistence error or volatile-storage status. Show a persistent “changes are only in this session” state and offer export. Prefer IndexedDB for growing document payloads, with migration and transaction failure handling. Keep any memory fallback explicitly scoped to tests or deliberately selected temporary sessions.

**Acceptance:** simulate quota and denied-storage errors; verify no durable-success indication, no stale-value masking, and a recoverable export path. Effort: small for error propagation, medium for IndexedDB migration.

### F3 — Collaboration bypasses schedule and topology derivation (P1, confirmed)

Evidence: `src/store/useAppStore.ts`, `wrappedSet` and `setDiagramDataInStore`; `src/services/collab/CollabManager.ts`, `handleCollabMessage`.

Slice actions receive `wrappedSet`, which recalculates schedules and topology indices when relevant document references change. Collaboration handlers call `useAppStore.setState` directly. Incoming sequence/timing/edge changes therefore update the document without that recalculation. Initial snapshots do use the explicit derivation helper, so initialization and later mutations behave differently. Remote node and edge deletions also leave related sequence/layout entries behind in the inspected handlers.

**Remedy:** route local and remote edits through shared domain commands that enforce cleanup and recompute derived state. Treat transport as a source of validated commands rather than a second document editor. Keep peer presence separate from document changes.

**Acceptance:** identical local and remote commands produce identical logical, visual, schedule and topology state; deleting an edge removes dependent sequences and timings; replaying an add message cannot duplicate IDs. Effort: medium to large.

### F4 — Embedded message boundary accepts arbitrary senders (P1, confirmed)

Evidence: `src/services/storage/drivers/EmbedIframeDriver.ts`, constructor and outbound messages.

The listener accepts `LOAD_DIAGRAM` and `REQUEST_SAVE_AND_CLOSE` without checking `event.source` or `event.origin`. Parsing is not guarded inside the listener, and outbound messages use `'*'`. Late loads directly replace store data, bypassing the derivation helper. A window able to message the editor can trigger these handlers; this is a missing trust boundary, not proof of a deployed exploit.

**Remedy:** establish an allowed parent origin and require `event.source === window.parent`; validate a versioned message envelope and document payload; guard parse failures; derive schedules through the normal load path. Use explicit target origins and a save acknowledgement before requesting closure. Remove listeners when disposing the driver.

**Acceptance:** unrelated windows and origins cannot load/close the editor; malformed messages show a recoverable error; a second valid load recalculates playback; close waits for acknowledged persistence. Effort: medium.

### F5 — Exported HTML embeds unescaped JSON inside a script (P1, confirmed construction defect)

Evidence: `src/utils/exportTemplate.ts`, JSON serialization at the top and `initialData` interpolation inside `<script>`; review `src/utils/exportSequenceTemplate.ts` for the same boundary.

`JSON.stringify` output is interpolated directly into an HTML script. A document string containing `</script>` can terminate the script at the HTML parser level even though it is a valid JSON string. Exported content may break or introduce markup/script supplied through imported labels, properties or components.

**Remedy:** implement one safe HTML-data serializer that escapes `<` at minimum, and use it at every embedded data boundary. Audit subsequent string-to-markup rendering separately; safe JSON embedding does not make later `innerHTML` use safe. Extract a common export runtime where practical.

**Acceptance:** export fixtures containing script-closing strings, markup, ampersands, quotes and Unicode load with their exact text preserved and execute no injected content. Test both topology and sequence exports in a browser. Effort: small to medium.

### F6 — Import normalization varies by entry point (P2, confirmed inconsistency)

Evidence: `workspaceSlice.switchDiagram` runs port/schema migration; `App.reloadCurrentForgeDiagram` and `setDiagramDataInStore` do not run those migrations; embed handlers parse directly. `src/utils/aiValidator.ts` provides a separate AI repair path.

**Remedy:** create a typed `loadDocument(unknown)` pipeline: decode → validate envelope/version → migrate → validate references and finite numeric values → normalize defaults → derive state → commit atomically. Reject unsupported future versions instead of silently interpreting them; `migrateToSchemaV2` currently passes through every version greater than or equal to two. Return warnings for repairs instead of silently discarding content.

**Acceptance:** the same legacy/current fixture produces the same state from workspace, share, embed and integration loading. Invalid documents preserve the current document and explain the failing field. Effort: medium.

### F7 — Workspace deletion leaves diagram payloads behind (P2, confirmed)

Evidence: `LocalStorageDriver.delete_workspace` removes `yada_data_${path}`, while `save_diagram` writes `yada_data_${path}_${diagramId}`. Workspace index text files use a separate `file://` namespace.

Deleting a workspace removes its listing but not its per-diagram payloads. This wastes the limited browser storage budget and makes deletion incomplete.

**Remedy:** enumerate and remove the workspace-owned diagram keys and index/files using an unambiguous namespace. Preserve unrelated global components. Longer term, put workspace-owned records in transactional IndexedDB stores.

**Acceptance:** deleting a multi-diagram workspace removes all its owned records without touching another workspace or global library. Effort: small.

### F8 — Unload saving is not a dependable durability mechanism (P2, confirmed design risk)

Evidence: `startAutoSave` in `src/store/useAppStore.ts` invokes async `performSave()` from `beforeunload`.

The page lifecycle does not give this handler a dependable opportunity to finish asynchronous driver work. The five-second autosave interval also creates an exposure window, especially for file and integration operations.

**Remedy:** debounce saves after document mutations, maintain a recoverable local draft, and expose unsaved state. Flush earlier on supported visibility/page lifecycle events, treating unload as best effort. Prompt for unsaved changes where appropriate and supported; do not use that prompt as the only recovery mechanism.

**Acceptance:** simulate closing/reloading between edits and the next autosave; recover the latest local draft and reconcile it with the durable revision. Effort: medium.

## Performance assessment

### Measured build facts

Production output includes these minified chunks (decimal kB as reported by Vite):

| Chunk | Raw kB | Gzip kB |
| --- | ---: | ---: |
| `icons-devicons` | 1,523.30 | 465.62 |
| `graph-layout` | 738.64 | 189.32 |
| `MainLayout` | 290.65 | 68.01 |
| `flow-engine` | 182.58 | 59.80 |
| `react-vendor` | 193.39 | 60.61 |
| `subset-shared.chunk` | 1,820.41 | 735.71 |

The PWA precaches 10,890.51 KiB across 150 entries. These totals are **not** a measured initial-route download or load time. A browser network trace is required to establish the actual critical path. Nevertheless, precaching a broad asset set adds background network/storage work, even for features a visitor never opens.

### P2: Narrow feature loading and cache policy

`vite.config.ts` manually separates vendors, and `App.tsx` lazy-loads major views. Those are positive steps, but chunk separation alone does not ensure deferred loading. `src/services/storage.ts` statically imports every driver; the embed driver imports media export utilities. Build warnings also show dynamic imports of modules already imported statically.

Trace welcome, shared viewer, editor and Studio dependency graphs independently. Load platform drivers only after choosing a platform; defer icon pickers and media export until opened. Reduce icon imports to a curated/common set with searchable deferred groups. Limit PWA precaching to the application shell and essential runtime, and cache optional features when used. Verify offline behavior after changing cache policy.

**Acceptance:** record cold/warm network traces for all four routes and demonstrate a reduction in transferred/parsed bytes without breaking offline reopening. Add a bundle-size baseline in CI. Effort: medium.

### P2: Reduce avoidable scheduling and animation work

`wrappedSet` recalculates schedules and topology for every new `logicalData` reference, including edits that may only change a node label or appearance-related property. `useEdgeAnimation` subscribes to the entire logical document, filters sequences per edge, and scans all schedules per edge when their reference changes. This can amplify costs on large diagrams.

Preserve the direct simulation clock and cached SVG path sampling; both avoid expensive per-frame React work. Add dependency-specific versions or selectors for topology, timing and descriptive changes. Derive sequences-by-edge and maximum timeline duration once per relevant revision. Profile before moving scheduling/layout to a worker.

**Acceptance:** renaming a node does not rerun timing derivation; timing changes update all views correctly; publish frame-time and mutation-latency results for representative fixtures. Effort: medium.

### P2: Bound history cost by document size

`historySlice.ts` deep-copies full logical and visual documents with JSON round trips and retains up to 30 snapshots. The entry cap is useful, but memory and main-thread copy cost still scale with document size, especially embedded images and freehand strokes.

Measure snapshot time and retained heap first. Group continuous gestures into one undo transaction; consider structural sharing or inverse patches with a byte budget. Keep large immutable assets outside repeated history payloads. Effort: medium.

### P2: Benchmark trace import and layout

The Tempo adapter sorts spans and repeatedly filters all spans per service. That service-grouping step costs O(services × spans). It also converts epoch nanoseconds to JavaScript numbers, which cannot represent arbitrary nanosecond integers exactly; this may be immaterial for millisecond playback but should be intentional.

Group spans by service in a single pass. Test timestamp precision requirements and normalize relative time safely. Add import limits, progress and cancellation; consider workers if measured large-trace tasks block interaction.

Suggested benchmark fixtures: 50/250/1,000 nodes; 100/500/2,000 edges; 100/1,000/10,000 sequence steps; 1,000/10,000/100,000 trace spans. These are test tiers, not supported-size claims. Track p50/p95 edit latency, frame time, import duration, peak memory and export time on named hardware.

## User experience improvements

### P1: Make save state understandable

Display explicit states: unsaved, saving, saved, save failed, session-only, and cloud sync pending. Distinguish local durability from cloud synchronization. Offer retry and export from failures. Integration “Done & Save” actions should complete only after a successful save. This directly addresses F1/F2 rather than adding cosmetic feedback.

### P2: Guide users to their first playable flow

The welcome flow is workspace-centric, while the product's distinctive payoff is animated interaction. Offer “Open an example,” “Create a flow,” and “Import a trace” with a short path to a working three-node simulation. Use contextual guidance for connecting nodes and adding the first step. Measure time to first successful playback and where users abandon the flow; no usability timing was measured in this review.

### P2: Explain simulation semantics

Provide short explanations/examples for duration, delay, async, round trip, nested sequence behavior and equal-numbered steps. Highlight the selected interaction in both canvas and timeline, show the currently active step, and preserve selection when switching topology/sequence views. Add diagnostics for disconnected or invalid steps. Users should understand whether a number represents an authored animation duration or imported observed latency.

### P2: Improve modal and keyboard accessibility

`GlobalConfirmAlertModal.tsx` handles Escape but its inspected markup has no dialog role, modal semantics, accessible title relationship, focus trapping or focus restoration. Its icon-only close button has no accessible label. Implement a reusable accessible dialog primitive and apply it consistently.

Add keyboard-operable canvas alternatives, clear focus states, shortcut help and reduced-motion behavior. Audit contrast at rendered sizes; the README's contrast claim is not a substitute for a full interface audit. Verify with automated checks and manual keyboard/screen-reader use before claiming compliance.

### P2: Make small-screen interaction intentional

`MainLayout.tsx` resizes the timeline through mouse events. Provide pointer/touch and keyboard resizing with an accessible separator, plus a compact playback layout. Prioritize view/playback on narrow screens and make advanced panels deliberate expansions. Test actual viewport sizes and touch gestures before substantiating the README's fully responsive claim.

### P2: Give imports and exports an explicit contract

For imports, summarize nodes, edges and steps, warn about missing parents/unsupported fields and retain the original input for troubleshooting. For media exports, detect supported formats, estimate work, show progress and support cancellation. Explain what portable HTML retains and which editable/custom assets `.dproj` includes. Verify this contract with fixtures rather than assuming feature parity.

### P3: Consolidate localization

Translations coexist with inline `language === 'tr'` branches, and the embed driver generates its AI summary with hard-coded `'tr'`. Centralize visible text, pluralization and integration summary locale. Test both supported languages for long labels, missing translations and compact layout.

## Code quality and delivery improvements

1. **Share document commands across local, remote and AI edits.** Centralize graph invariants, undo transactions, dirty revision increments and derivation. Avoid introducing a large framework solely for this change.
2. **Separate orchestration from UI.** `App.tsx` handles platform startup, loading, routing, synchronization and integration saving. Extract platform bootstrapping and save coordination behind typed services.
3. **Decompose large modules by responsibility.** `canvasSlice.ts` is 1,385 lines, `workspaceSlice.ts` 996, `TopBar.tsx` 711, `exportMedia.ts` 1,056 and `exportTemplate.ts` 1,707. Size is not itself a defect, but these modules mix behaviors that need independent verification. Extract coherent responsibilities after securing regression tests.
4. **Strengthen boundary types.** Strict TypeScript is enabled, but `any`, casts and parsed JSON weaken safety at storage, integration and network boundaries. Accept `unknown`, validate once, then pass typed data. Replace the untyped slice argument tuple in `useAppStore.ts` with a typed composition helper.
5. **Keep errors observable in production.** Vite's production `drop: ['console', 'debugger']` removes console error reporting as well as debug chatter. Pair visible failures with a structured logger/error hook that redacts credentials and diagram content. Add a React error boundary with a recover/export path.
6. **Establish pull-request checks.** The inspected workflows deploy on main and release on tags; neither runs the unit suite. Add PR checks for clean install, tests, typecheck/build and integration smoke tests. Use `npm ci` for deployment reproducibility; deploy currently uses `npm install`.
7. **Correct setup documentation.** README says Node 18+, while the installed Vite package declares `^20.19.0 || >=22.12.0`. Align README, package engines and CI to a supported tested version. Document feature flags and integration prerequisites without including secrets.
8. **Harden desktop containment deliberately.** `src-tauri/tauri.conf.json` sets CSP to null. Audit actual asset/network needs and define an appropriate policy with a desktop smoke test. This is a missing defense, not evidence that an import already achieves native code execution.

## Test plan focused on meaningful failure modes

The existing 53 tests cover scheduler/clock behavior, selected canvas invariants, routing, AI service/vault behavior, migrations and image metadata. Preserve them. The largest gap is coverage across boundaries.

| Level | Highest-value additions |
| --- | --- |
| Save coordination | Driver rejection, edit during pending save, overlapping saves, switch after failed save, close after failed save |
| Storage contracts | Quota/permission failures, deletion cleanup, schema round trips, filesystem permission revocation |
| Document commands | Local/remote parity, referential cleanup, duplicate messages, derived-state consistency |
| Loading | Legacy and current fixtures through every entry point; future versions and malformed fields |
| Browser exports | Safe HTML embedding, standalone playback, topology/sequence timing parity |
| Collaboration | Two peers, reconnect/snapshot recovery, simultaneous edits, relay/P2P transition and duplicate delivery |
| UX smoke tests | Create → connect → sequence → play → save → reload; keyboard modal flow; narrow-screen playback |
| Performance | Fixed fixture tiers, repeatable hardware/browser details, bundle regression budget |

Do not equate additional test count with confidence. Prefer scenarios that reproduce F1–F7 and cross-feature inconsistencies over snapshots that merely mirror markup.

## Suggested execution roadmap

| Stage | Work | Completion condition |
| --- | --- | --- |
| 1: Protect work | F1/F2 save coordinator and honest persistence states; F7 cleanup; failure regression tests | Save failure cannot silently discard work or claim durable success |
| 2: Consistent documents | F3 command path; F6 validation/migration pipeline; F4 trusted embed protocol | Every ingress/mutation path maintains the same document invariants and schedules |
| 3: Safe portability | F5 escaping and export fixtures; desktop containment review; unload draft recovery | Portable documents preserve data and boundaries; recoverable drafts survive interruption |
| 4: Measured performance | Route traces, optional-feature loading, PWA cache policy, scheduler/history/import benchmarks | Published baselines and justified budgets with no offline regressions |
| 5: Clearer experience | First-play onboarding, timing explanations, accessible dialogs, compact playback, localization | Validated keyboard and touch journeys; measured first-play completion |

Stages can overlap when ownership permits, but performance refactoring should retain the reliability regression tests established first. Avoid a broad rewrite: the current foundations can support the required changes.

## Overall conclusion

YADA's strongest asset is the connection between diagram structure and executable visual explanation. Its feature set is already broad enough to deliver that value. The highest-return improvement is to make persistence, document invariants and playback semantics consistent across editing, collaboration, importing and embedding. Once those guarantees are established, measured loading/runtime optimization and focused usability work can make the existing capabilities easier to trust and easier to discover.

# Focused reassessment: sequence fidelity, editing UX and playback performance

Updated: 13 October 2026. This section refines the earlier roadmap around the requested priorities and takes precedence where priorities differ. It is an assessment and implementation proposal; application behavior has not been changed. Earlier test/build results are from 12 October, not a new verification run.

## Revised priorities

1. Analyze and correct sequence generation without changing existing playback semantics by default.
2. Remove unsupported actions from Confluence Cloud/Forge and Data Center, enforcing restrictions below the UI as well.
3. Improve simulation smoothness and eliminate repeated sequence calculations.
4. Establish consistent terminology, timeline interactions and browser navigation.
5. Improve Mermaid import fidelity and add useful, explicitly scoped export formats.

Backward compatibility is a release requirement across all five areas. The intent is to improve current diagrams in place, without forcing users to recreate, reimport or manually migrate them.

## 1. Sequence generation: current behavior and gaps

### Generation pipeline

`useSequenceLayout.ts` reads logical data and scheduler output, computes participant order through Dagre, assigns message rows by scheduled start/end events, derives fragment bounds, and produces React Flow participants and messages. Round-trip steps generate a separate reverse arrow. Static layout is memoized against logical data and schedules, which is a useful separation from playback time.

The model is currently a projection of topology edges and simulation steps. It does not preserve every source-language interaction as an independent message. That distinction explains several fidelity problems and should guide the design.

### Confirmed findings

| Finding | Evidence | Consequence and recommended change |
| --- | --- | --- |
| Participant order is recomputed from topology | `computeParticipantOrder` uses Dagre, rather than imported declaration order | Mermaid's authored participant order can change. Add optional explicit participant order; retain the current Dagre fallback for old diagrams. |
| Same-time event comparator is inconsistent | `computeSlots` returns `-1` for every return event and `1` for every forward event when timestamps tie, including same-kind pairs | Define total ordering by time, event kind, legacy sequence position and stable ID; use the same function everywhere. Test concurrency and coincident returns. |
| Sequence fragment imports do not preserve interaction ownership | Mermaid creates section nodes for fragments without assigning participants to them; `computeFragmentBounds` requires participants whose `parentId` is that section | Imported `alt`, `loop` and similar frames cannot obtain the intended bounds from this representation. Store message membership, branches and nested fragment relations explicitly. |
| Topology sections are interpreted as sequence frames | Bounds include every sequence touching a direct child participant | A deployment/service grouping is not automatically a conditional interaction frame. Distinguish participant groups from message fragments, retaining legacy section projection for existing files. |
| Repeated messages share edge-level descriptions | Mermaid reuses an edge for both directions of a participant pair; layout reads `edge.description` for every forward step | Later labels and reverse-direction calls can be misrepresented. Add optional per-step message text and direction with edge-level fallback for old steps. |
| Dotted arrows are automatically paired as returns | Mermaid importer finds the latest step on the reused edge and changes it to round trip | A separate message can disappear; pairing does not verify reversed endpoints or call identity. Preserve explicit messages and apply return pairing only under defined, validated rules. |
| Explicit activation is discarded | `activate`/`deactivate` only register the participant; parsed `+`/`-` flags are not subsequently applied to the document | Activation lifetimes cannot be faithfully reconstructed. Add explicit activation events/intervals rather than deriving every activation from a whole active call. |
| Annotation semantics do not reach sequence layout | Layout receives logical data and schedules, and does not generate nodes from visual annotations | Imported notes are not faithfully represented in the sequence projection. Support participant anchors, placement and associated message/event positions. |
| Slot spacing is ordinal, not proportional to elapsed time | Every slot uses `MESSAGE_ROW_HEIGHT` regardless of timestamp gap | Explain that vertical distance indicates message order; use the timeline for duration. Do not silently switch existing diagrams to a proportional time layout. |

Self-messages, deep nesting, overlapping calls, long/wrapped labels and return text need dedicated layout fixtures and visual verification. The current renderer should not be claimed to handle those cases faithfully until tested.

### Proposed sequence architecture

Introduce a pure, derived sequence presentation model shared by the editor and HTML/text exporters. It should contain participants, ordered message events, activation intervals, notes, fragments/branches and references back to original nodes/edges/steps. Build indices and slot maps once per document/schedule revision.

Use additive optional persisted metadata only for semantics that cannot be reconstructed: explicit order, per-message text/direction, branch membership and activation directives. Keep computed coordinates, lookup maps and active frame state out of persisted documents. Preserve unknown extension fields through loading and saving.

Do not reinterpret every old round trip as two newly independent timeline steps. Keep existing round-trip timing and scheduling as the legacy default, and project it into forward/return presentation events. New explicit-message imports can use richer metadata without modifying old authored flows.

**Acceptance:** old files retain IDs, labels, timings and playback order; editor and standalone sequence export use identical ordered events; imported repeated/reversed messages keep distinct labels and directions; nested alternatives and activations retain their structure; equal timestamps produce deterministic output.

## 2. Playback performance: sequence view is the first target

### Confirmed hot paths

The topology animation hooks already use `simulationClock`. Sequence message dots in `SeqMessageEdge.tsx` instead subscribe to the global store's `currentTime`. `usePlaybackLoop` synchronizes that time approximately every 150 ms. Consequently those dot positions receive roughly 6–7 playback updates per second even though an animation frame clock is available. Moving them to the clock is a concrete smoothness improvement, independent of a large-scale benchmark.

`SeqParticipantNode.useParticipantActivity` rebuilds all message events, sorts them, constructs two maps, scans sequences, searches edges with `find`, and serializes its result on store updates. This work repeats per participant; selector equality can suppress rendering but does not avoid selector computation. `computeSlots` already performs much of the same calculation elsewhere.

Participant nodes also create four handles for every slot, including slots unrelated to that participant. DOM handle count therefore scales approximately with participants × message slots. This may be a substantial large-diagram cost even when most messages touch only two participants.

### Recommended implementation sequence

1. Cache the shared event/slot model, `edgeById`, and events/activation intervals per participant. Reuse them in layout and activity calculations.
2. Drive dot transforms from `simulationClock` and refs; update React only when a phase or displayed value changes. Ensure newly mounted subscribers render the current clock state immediately.
3. Create handles only for actual message endpoints per participant; keep stable handle identifiers. Measure whether viewport culling or a dedicated SVG sequence renderer is needed before changing rendering engines.
4. Keep playback ownership outside a particular timeline panel so hiding or unmounting a panel cannot unintentionally remove its frame loop. Verify one active clock driver across editor, compact playback and embedded viewers.
5. Cache event-boundary lookups for active-step changes; avoid scanning all schedules on every UI synchronization when benchmarks justify it.

The phase logic currently also deserves a correctness review: `SeqMessageEdge` uses half the configured duration for forward travel even for non-round-trip steps, then reports a waiting phase. Align it with topology rendering through a shared phase evaluator. Preserve legacy behavior until equivalence tests establish the intended change.

**Performance acceptance:** record baseline and after-change profiles for topology and sequence views separately. Use fixtures with 20/100/250 participants and 100/1,000/5,000 steps, subject to device limits. At rest, no activity calculation should sort events on unrelated store updates. During playback, no participant should rebuild the global slot model. Seek/play/pause/loop must agree across views and exports. Set frame-time and responsiveness budgets after measuring representative hardware; 60 fps is a target, not a verified result.

## 3. Platform capabilities: one policy for visibility and enforcement

The current UI checks are inconsistent. `DiagramTabBar` returns null for Forge, but not Data Center. `TopBar.isEmbedMode` is inferred from URL substrings and does not itself include Forge/DC detection. Collaboration controls rely on that embed flag, while the collaboration start action checks for an active diagram rather than a platform capability. `createDiagram` blocks during collaboration but does not enforce a Confluence single-diagram rule.

Create a typed platform context and centralized capabilities, derived once from trusted integration initialization. Components, shortcuts, route handlers and domain actions must consume the same policy. No network room creation or workspace mutation should occur before checking it.

| Capability | Standalone web/desktop | Forge editor | DC editor | Confluence viewer |
| --- | --- | --- | --- | --- |
| Play/pause/seek and switch diagram representation | Yes | Yes | Yes | Yes |
| Edit current diagram/timeline | Yes | Yes | Yes | No; use host Edit action |
| Start or join live collaboration | Yes | **No** | **No** | **No** |
| Create/switch/delete workspace diagrams | Yes | **No** | **No** | **No** |
| Workspace dashboard, tabs, “new diagram” shortcuts | Yes | Hidden | Hidden | Hidden |
| Save/close current macro | Normal save | Host-controlled | Host-controlled | No |
| Import into current document | Yes | Replacement preview + undo | Replacement preview + undo | No |
| File/text export of current diagram | Yes | Proposed: available if host policy permits | Proposed: available if host policy permits | Proposed: explicit host policy |
| Public share/AI/Drive integrations | Existing options | Explicit product/host policy | Explicit product/host policy | Explicit product/host policy |

The last two rows are proposals requiring product decisions, rather than restrictions inferred from “Confluence.” The user's explicit collaboration and diagram-creation restrictions are firm requirements.

Hide disallowed controls rather than displaying enticing disabled actions. Guard action entry points and deep links too: a `collab` URL or direct action invocation must not start a room inside Confluence. Import must replace the current macro document through an undoable preview, never create a second macro-local diagram. Existing macro data remains untouched by capability changes.

**Acceptance:** matrix tests for Forge/DC view/edit modes; no collab controls, dialogs or networking; direct start/join/create calls are rejected; no diagram creation via tabs, dashboard, shortcuts or import; current macro can still edit, play, save and reopen.

## 4. Timeline UX: precision without changing timing meaning

Keep existing duration/delay values and scheduler interpretation. Improve the controls around them first.

- **Terminology:** distinguish authored step number, actual start time, duration, delay and return. Show calculated start/end values next to editable timing. Explain equal-numbered concurrent steps and nested round trips using contextual examples.
- **Selection:** link timeline rows, canvas connections and sequence messages through stable step IDs. Provide previous/next step controls and focus the selected item without forcibly panning during manual inspection.
- **Editing:** add numeric keyboard-accessible timing inputs with explicit units, snapping as an optional aid, one undo transaction per drag, and cancel-to-restore with Escape. Use pointer events for touch/stylus.
- **Scale:** `useTimelineCalculations` currently fits the whole duration into panel width. Add independent zoom and horizontal pan with “Fit entire timeline” and “Go to playhead.” A long diagram should not make short steps uneditable.
- **Playback:** offer follow-playhead as an option, retaining the user's scroll position when disabled. Define step navigation versus time seeking clearly. Keep compact playback fully functional with panels closed.
- **Large documents:** virtualize rows while keeping step labels and tracks aligned. Do not mount all row editors or attach per-row global drag handlers unnecessarily.
- **Failures/emptiness:** explain how to add the first interaction and why an invalid/missing edge cannot play. Show import repair warnings where the affected step is inspected.

Validate these proposals with keyboard-only editing, long labels in both languages, narrow viewports, very long total durations and densely concurrent steps. Avoid changing imported delay values to make a visual fit.

## 5. i18n and semantic consistency

Centralization must cover meaning as well as translated strings. The code mixes `translations[language]`, inline Turkish/English branches and untranslated text. Examples include the sequence empty state, the `Live` badge, adapter descriptions, and translation entries still referring to future project phases. The embed AI summary uses a hard-coded Turkish locale.

Adopt a typed, namespaced message API and a short domain glossary:

| Domain concept | English UI | Turkish UI | Internal distinction |
| --- | --- | --- | --- |
| Document | Diagram | Diyagram | A saved diagram document |
| Logical connection | Connection | Bağlantı | Graph edge, potentially used by multiple steps |
| Interaction occurrence | Step | Adım | A particular scheduled interaction |
| Derived representation | Sequence diagram | Sıralama diyagramı | Confirm preferred Turkish wording once, then apply consistently |
| Timeline | Timeline | Zaman çizelgesi | Editable timing representation |
| Duration / delay | Duration / delay | Süre / gecikme | Never use delay as a synonym for start time |
| Return / round trip | Return / round trip | Yanıt / gidiş-dönüş | Return message versus a paired simulation operation |

Do not rename persisted `SequenceStep`, `edgeId`, timing fields or document keys solely for UI wording. Translation keys can change independently through an incremental adapter. Localize errors, accessibility labels, menus and warnings as well as primary buttons. Use locale-aware number/time formatting while storing durations as numbers in the existing unit. Preserve user labels and protocol keywords verbatim.

**Acceptance:** equal message keys and placeholder signatures across locales; no new inline language branches; no missing-key fallbacks in core journeys; switching language changes no document content or timing.

## 6. Import/export formats and Mermaid fidelity

### Mermaid: fidelity before additional syntax

The importer describes itself as having “full syntax support,” but unknown lines are silently ignored, autonumber is discarded, activation is discarded and fragments are not attached to interaction ranges. The claim should become a documented supported subset until conformance fixtures establish otherwise.

The official syntax distinguishes line/arrow style from interaction meaning and supports authored participant order, activation, notes and structured fragments. A dashed line alone should not be treated as proof that a message is a return. New syntax is versioned; support a documented target version/subset rather than promising every future construct. Reference: [Mermaid sequence diagram syntax](https://mermaid.js.org/syntax/sequenceDiagram.html).

Prioritize this importer work:

1. Preserve each message's text, direction and arrow style; avoid bidirectional edge reuse erasing per-message meaning.
2. Store source spans/line numbers and emit diagnostics for unsupported or malformed statements. Preview “imported / approximated / unsupported” counts before applying.
3. Parse nested fragments with a real structured stack including branch boundaries and ranges. Distinguish boxes around participants from frames around messages. Validate balanced blocks.
4. Preserve activations, notes, authored order and numbering metadata. Add fixtures for aliases, comments, line breaks, self-calls, parallel branches and explicit returns.
5. Add version-specific constructs incrementally, including participant creation/destruction and additional arrow forms. Preserve original source and warn where YADA cannot render a construct faithfully.

A tokenization/AST layer is preferable to growing an unchecked line-regex cascade. If reusing a Mermaid parser, verify its public API, version stability and bundle cost first; load it only during import. Never evaluate imported configuration as executable code.

Also review synthetic timing: the importer puts cumulative `currentTime` into each step's `delay`, while the scheduler has its own ordering rules. Establish expected timing with a three-message fixture before changing this behavior. Existing imported diagrams must retain stored timing; corrected defaults apply to new imports.

### Export priorities and contract

| Format | Recommended scope | Fidelity contract |
| --- | --- | --- |
| `.dproj` | Continue as canonical editable interchange | Preserve complete YADA document and required component assets |
| Mermaid sequence `.mmd` | First new exporter | Preserve supported participant/message/fragment semantics; report unsupported layout, animation and styling |
| Mermaid flowchart `.mmd` | Next, separate export option | Topology nodes/connections/groups, not sequence timing |
| PlantUML sequence `.puml` | Candidate after shared sequence model is stable | Reuse presentation model; add syntax fixtures and escaping before release |
| OTLP JSON | Conditional, later | Original trace-derived export where provenance exists, or clearly labeled synthetic trace; not a claim of real telemetry |
| HTML/image/video | Retain existing formats | Compare timing and labels with editor using shared sequence fixtures |

PlantUML is a roadmap candidate, not an evaluated existing adapter. Mermaid export should be generated from the document/presentation model, not by reverse-engineering rendered SVG. Produce stable participant aliases, safe escaping and reproducible output.

OpenTelemetry is a telemetry data model, so arbitrary diagram animation cannot recover original trace IDs, parent relationships, resource attributes or actual timestamps after they have been discarded. Preserve provenance during trace import before promising faithful trace re-export. Synthetic export must use valid spans/identifiers/timestamps and identify its origin. Reference: [OTLP specification](https://opentelemetry.io/docs/specs/otlp/).

Extend `DiagramAdapter` through an optional diagnostics result or compatible companion interface; do not break existing adapters. Add an export registry describing target formats, capabilities and loss warnings. “Round trip” for Mermaid should mean supported semantic equivalence, not pixel equality or preservation of YADA-specific animation controls.

## 7. Browser navigation and previous diagrams

The report interprets “backslash” as browser Back navigation, possibly triggered by a key/gesture. A literal `\\` key has not been reproduced as a navigation trigger. Existing canvas handlers also use Backspace for deletion, so confirm the reported trigger during implementation rather than treating those keys as equivalent.

The inspected application chooses screens from Zustand and URL checks; it has no app-wide `pushState`/`popstate` navigation layer. Several share/collaboration handlers call `replaceState` independently. Introduce history-backed navigation for workspace, active diagram and representation, with one owner of URL parsing and updates.

React Router is an option, not a prerequisite. A small typed history controller may suffice; choose based on route complexity and integration needs. For GitHub Pages/static hosting, prefer a hash-based route strategy or configure and test deep-link fallback explicitly. Current share/collab payloads already use URL state, including hashes, so design a parser that accepts **existing links unchanged** before introducing a route grammar. Do not replace an encrypted payload or collaboration token with an unrelated route hash.

Suggested behavior:

- Opening another diagram pushes one history entry; scrubbing, selection and autosave do not.
- Back/Forward restores the prior workspace/diagram and topology/sequence representation without a full reload. Keep per-diagram viewport and timeline scroll where useful.
- Navigation waits for save or recovery-draft protection; failure preserves the current document and offers retry. Avoid history push/pop loops during restoration.
- Reload/deep linking validates storage availability. Missing files/permissions show recovery UI rather than a silent empty diagram. Never put document contents, credentials or absolute local paths in navigation URLs.
- Confluence navigation stays inside the current macro and does not create browser history entries that navigate the host page unexpectedly. Modal close remains host-controlled.
- Keep undo/redo history separate from browser navigation history.

**Acceptance:** A → B → sequence view → Back → Forward restores the expected screen; refresh works on configured hosting; old share/collab URLs still load; failed saves do not lose work; literal backslash in editable labels does not navigate; Backspace deletes only under intended canvas focus; Confluence host history is unaffected.

## 8. Backward compatibility release gate

Compatibility has two levels: new versions must load current users' files, and older clients opening richer new files may not understand the added features. Guarantee the first; explicitly describe the second. Do not promise old-client fidelity automatically.

- Build a golden corpus from current unversioned/v1/v2 files, samples, legacy ports, custom SVG libraries, annotations, freehand strokes, sections, nested round trips and trace/Mermaid imports.
- Capture current normalized logical/visual data, schedules and representative playback boundaries before refactoring. Keep IDs and stored timing unchanged by default.
- Use optional extensions and legacy fallbacks; if schema version changes, retain a migration chain and backup the original before persistent conversion.
- Preserve fields added for sequence fidelity across all drivers, ZIP packaging, sharing and AI repair; hand-written reconstruction can otherwise strip them.
- Test load → edit → save → reload for browser, filesystem, Tauri, Forge and DC envelopes. Verify custom component resolution as well as graph data.
- Fix historical interpretation only through a versioned behavior change or explicit repair preview where output would change. Render-only deterministic ordering fixes still need comparison fixtures.
- If supported, offer a documented legacy export with a loss summary rather than quietly discarding richer metadata.

## Focused delivery plan

| Order | Deliverable | Exit criterion |
| --- | --- | --- |
| 1 | Sequence/legacy fixture corpus; capability policy and Confluence enforcement | Old behavior captured; collab and extra diagrams unreachable in both Confluence products |
| 2 | Shared sequence model and cached participant/event indices | Repeated labels/directions retained; deterministic order; no per-participant global sort |
| 3 | Smooth clock-driven sequence playback | Seek/pause/loop/phase parity and measured improvement; one clock driver |
| 4 | Shared terminology/i18n API plus timeline precision/zoom work | Core flows translated consistently; timing unchanged; keyboard/pointer editing verified |
| 5 | Mermaid import diagnostics and richer semantics; Mermaid sequence exporter | Supported-subset semantic round trips pass; unsupported constructs visible to users |
| 6 | History-backed standalone navigation | Back/Forward/reload and legacy links pass; Confluence history preserved |
| 7 | Optional topology/PlantUML/trace exporters | Each has an explicit fidelity contract and format-specific validation |

Save reliability from F1/F2 remains a prerequisite for navigation and replacement imports. Initial bundle optimization remains useful but is secondary to the demonstrated sequence playback and repeated-computation issues in this focused scope.


## Implementation progress: sequence foundation (13 October 2026)

The first sequence pass now builds slot maps, participant intervals and incident message rows once per memoized layout revision. Participant activity no longer rebuilds/sorts global events or searches all edges during playback. Invisible handles are limited to incident rows. Sequence dots and phase/activity displays use the existing simulation clock, with immediate position delivery on subscription and cleanup on unmount. Diagram switching/loading through the reviewed helper resets that clock.

Equal-time events now use a consistent comparator: returns precede forwards, and same-kind events retain stored sequence order. This intentionally corrects previously inconsistent row ordering for tied returns; stored timing and document formats are unchanged. A pure layout entry point enables checks of generated messages, directions and handles.

Regression coverage includes unversioned/v1/v2 nested round trips, existing timing, section bounds, concurrent messages, missing references, self-call indexing, phase boundaries, paused seeking, subscription cleanup, and editor/HTML-export layout agreement. The suite passes 90 tests. Production build and TypeScript checks pass. A local browser smoke test loaded a legacy shared-link fixture, generated its sequence view, played and paused it, and sought to a nested interaction without runtime errors.

This does not establish a measured frame-rate gain or complete Mermaid fidelity. Richer message/fragment semantics, browser performance profiling, full standalone-export runtime parity, and timeline/i18n improvements remain subsequent work. Existing self-call rendering and legacy one-way transit interpretation were not redesigned in this pass.


## Implementation progress: Mermaid interchange (13 October 2026)

New Mermaid imports preserve distinct message occurrences/directions/labels rather than collapsing dashed responses into inferred round trips. The supported subset includes aliases/actors, participant order, notes, activations, boxes, title/autonumber and nested fragments with branch structure. Unsupported lines produce preview diagnostics; unbalanced blocks prevent saving. New imported arrows carry optional style metadata into sequence rendering. Legacy stored diagrams are not reinterpreted or retimed.

The editor now offers Export → Mermaid sequence diagram (.mmd), with text preview, copy/download, localized English/Turkish fidelity warnings and safe label encoding. Existing diagrams export through the scheduler/slot projection. New imports use an optional schema-v2 semantic event tree, preserved through both workspace envelope shapes, migration, ZIP repair and AI payload repair. Export reads current labels and references, skips deleted messages with warnings, and warns when retained block order differs from edited step order.

Validation: 118 tests pass, production build passes, and the browser smoke test imported a nested workflow, displayed diagnostics, saved it to a workspace and downloaded its .mmd file. The complete generated file was accepted and rendered by the installed Mermaid 11.17.2 browser parser/renderer. The package is pinned as a development dependency for syntax regression tests; production import does not load Mermaid's renderer. Existing format and sequence regression tests continue to pass.

Limits: YADA does not execute imported alternatives/loops or fully render explicit activation lifetimes; notes remain topology sticky notes. Source structure is retained for text interchange. Unsupported newer Mermaid constructs are diagnosed rather than silently accepted. .dproj remains the lossless project format; Mermaid text does not preserve YADA timing, assets or styling.


## Implementation progress: timeline UX and terminology (13 October 2026)

The timeline now provides local zoom (1×–8×), horizontal track scrolling, fit/go-to-playhead controls, previous/next step selection and seeking, and a labelled keyboard-operable seek slider in both expanded and compact modes. Play resumes from the paused/sought position while explicit start/stop actions retain their reset behavior. Zoom is UI-only and is not serialized into document timing.

Step editing distinguishes configurable duration/delay/internal process from calculated scheduler start/end. The editor validates finite non-negative numbers, preserves fractional and legacy sub-100ms values when unchanged, and creates a single undo snapshot for applied timing/process changes. Sequence bar gestures use pointer input, preview without updating the document or broadcasting every movement, commit once on release, and cancel without writes on Escape/pointer cancellation. Guards prevent stale edits from targeting a different document and prevent timing writes during playback or read-only use.

A shared English/Turkish glossary now drives timeline/sequence terms, view switchers and core timing labels in connection properties. Timeline row controls, help, sequence badges and empty/loading states are localized; millisecond readouts use locale-aware number formatting. User labels, schema keys, IDs and scheduling rules are unchanged. This is a focused terminology migration; older unrelated UI areas and annotation-drag behavior have not been fully rewritten.

Validation: 136 tests pass, including compatibility/no-op edits, exact decimal timing, one-step undo/redo, concurrent-step navigation, zoomed/scroll-aware seeking, restricted/stale edit guards, resume/reset behavior, and locale-key/semantic consistency. The production build passes. Browser checks verified zoomed overflow, navigation, numeric apply/undo, drag/undo, Escape-discarded drafts, an existing diagram reopening, and Turkish terms/number formatting without runtime errors. Physical touch-device and screen-reader testing remain outstanding.


## Implementation progress: reliable saves and browser navigation (13 October 2026)

Manual save and autosave now share one coordinator. A successful write acknowledges only the captured diagram revision, so edits made during saving remain dirty. Failed writes are visible with localized retry controls; browser storage quota failures no longer silently fall back to temporary memory. Workspace replacement, diagram switching/closing and browser navigation require saved editable data. Host save-and-close flows remain open when saving fails or newer edits remain. Temporary import previews can still be explicitly discarded. Browser unload protection is synchronous and best effort; this does not implement crash recovery.

Standalone navigation now uses browser history for workspaces, diagrams and freeform/sequence views. Reload restores locally available destinations through opaque workspace identifiers without exposing filesystem paths in URLs. Failed saves or unavailable destinations restore the previous working state and history position. Rapid Back/Forward events are serialized. Existing share/reference/collaboration links are preserved, and Forge, Confluence Data Center and embedded host navigation remain host controlled. These local routes require access to the original workspace and are not portable sharing links.

Validation: 164 tests pass, including save failure, edits during saves, close/switch guards, browser quota failure, unload protection, Back/Forward, rapid navigation, deep-link restoration, missing destinations and host/link exclusions. Existing legacy format tests remain passing; stored schema and timing are unchanged. TypeScript and the production build pass, with existing bundle-size/chunking warnings. A browser smoke test verified Back, Forward and reload restoring a persisted sequence-view destination with no console errors. Real Confluence host and desktop filesystem end-to-end testing remain outstanding.


## Implementation progress: simulation performance profiling (13 October 2026)

### Changes and compatibility

Freeform sections previously rebuilt descendants with repeated node filtering, rebuilt incident-edge sets and scanned every sequence during each throttled store time update. Section activity now builds merged half-open intervals on topology/schedule revisions and uses binary search on the simulation clock. The activity boundaries remain `start <= time < end`, including nested sections and concurrent steps. Initial mount, pause/seek and changes to the document update immediately. Malformed parent cycles no longer recurse indefinitely. Scheduling and stored data remain unchanged.

Edge instances share a weakly cached maximum schedule end by schedule-object identity. Hidden freeform particles stop repeatedly writing `display:none`, and edge React state setters run only when active status/step changes. Sequence particles deliver their initial position immediately and skip identical subsequent positions, particularly repeated hidden states. Seeking backward, reset, phase transitions and subscription cleanup retain their previous behavior. Cache invalidation relies on the application's existing immutable schedule updates. No new persistent fields were introduced.

### Reproducible CPU comparison

`sectionPlayback.test.ts` compares the previous algorithm with the cached algorithm over 240 samples using nested synthetic fixtures. It also compares exact activity results across reverse seeks, fractional boundaries, concurrent/touching intervals, missing schedules, empty sections and zero-duration steps. One local isolated run produced:

| Steps | Previous scans (240 samples) | Cached queries (240 samples) | One-time interval build |
| --- | ---: | ---: | ---: |
| 25 | 0.63 ms | 0.012 ms | 0.019 ms |
| 250 | 27.21 ms | 0.015 ms | 0.226 ms |
| 1,000 | 410.61 ms | 0.033 ms | 0.589 ms |

These timings measure this calculation alone, not application FPS. Reproduce with `npx vitest run src/components/canvas/hooks/sectionPlayback.test.ts --disableConsoleIntercept --reporter=verbose`. Correctness is asserted; unstable wall-clock speed thresholds are deliberately not test gates.

### Actual canvas observations

A development-only profiler at `/scripts/playback-profile.html` mounts the real freeform/sequence canvases with the production playback hook. It offers 25/250/1,000-message fixtures with 20 participants, a section, mixed one-way/round-trip messages and concurrent steps. Each sample records two seconds of requestAnimationFrame intervals, canvas React commits/render duration and optional browser heap usage. It does not write fixture data to storage and is not imported into the shipped application.

Final observed results in the local in-app browser:

| View | Steps | FPS | p95 frame interval | Canvas React render time | Reported JS heap |
| --- | ---: | ---: | ---: | ---: | ---: |
| Freeform | 25 | 117.0 | 9.9 ms | 55.2 ms | 49.4 MB |
| Freeform | 250 | 68.5 | 33.4 ms | 76.6 ms | 72.1 MB |
| Freeform | 1,000 | 30.0 | 125.0 ms | 204.8 ms | 160.3 MB |
| Sequence | 25 | 115.5 | 10.2 ms | 18.4 ms | 37.2 MB |
| Sequence | 250 | 47.1 | 25.4 ms | 25.2 ms | 74.7 MB |
| Sequence | 1,000 | 3.6 | 308.3 ms | 34.0 ms | 107.7 MB |

A same-method sequence comparison before the particle callback change observed 120.0/45.1/3.6 FPS for 25/250/1,000 messages. The final measurements do **not** establish a meaningful overall FPS gain. The CPU reduction is real, but the large sequence canvas remains slow and requires a further rendering investigation, potentially viewport-aware message rendering. Any such change must preserve full-diagram export, fit-view, participant handles and seeking.

Limits: these are short synthetic development-build samples from one browser, without the full timeline panel or Confluence/Tauri host. They are diagnostic observations, not release performance budgets. Heap readings are total live browser heap at that moment; garbage collection and fixture order affect them, so they do not establish a memory leak or reduction. RAF rate is not a compositor/presentation measurement. Production-build tracing and real user diagrams remain needed before making broad speed claims.

Validation: all 169 tests and the production build pass, including existing legacy format, timing, pause/resume and sequence compatibility tests. Browser profiler checks completed in both views with no captured console errors. Existing build chunk-size warnings remain.


## Implementation progress: large sequence rendering (13 October 2026)

The sequence canvas now mounts message edges only within the vertical viewport plus 120 screen pixels of overscan for labels and smooth panning. Culling depends on viewport position/zoom and height, not simulation time. Participants, lifelines, fragments, complete slot maps and all incident handles remain intact. Consequently Fit view continues to use complete diagram bounds, and message endpoints retain their original handle coordinates. Unknown geometry and unmeasured viewports fall back to rendering all messages. Labels no longer request a backdrop blur and particles no longer request individual `will-change` hints.

This changes rendering only. Existing diagram schema, participant ordering, forward/return slot placement, sequence timings and stored metadata are unchanged. Offscreen edges unsubscribe on unmount; returning edges derive phase and particle position immediately from the current simulation clock, including seeks while paused. Horizontal culling is deliberately omitted to avoid clipping long messages/labels through approximate width checks. Participant handles still scale with the complete document, so initial mount and very large participant counts remain potential bottlenecks.

PNG, SVG and DOM video capture now enter a reference-counted full-render scope before cloning. It synchronously enables all message edges, waits for frame preparation and restores viewport rendering in `finally`, including capture errors and overlapping captures. Data-driven HTML, Mermaid and canvas-rendered media exports continue to read complete document data and need no viewport override. Image capture retains its previous viewport sizing/Fit view/minimum-zoom behavior; this change does not introduce a full-page export mode or change existing image dimensions.

### Measurements and verification

Using the same local development-browser profiler and two-second sequence samples:

| Messages | Previous FPS | Viewport-rendered FPS | New p95 frame interval |
| --- | ---: | ---: | ---: |
| 25 | 115.5 | 119.5 | 9.0 ms |
| 250 | 47.1 | 118.0 | 9.2 ms |
| 1,000 | 3.6 | 81.7 | 17.6 ms |

A fresh repeat of the 1,000-message case reached 106.0 FPS with a 16.7 ms p95 and no intervals above 33 ms. These short synthetic development runs establish a substantial improvement for this fixture, not a cross-device release guarantee or precise speedup. Viewport height, visible rows, warmup, garbage collection and concurrent browser load affect the results.

The 1,000-message browser fixture contains 1,334 forward/return edges. Normal rendering mounted 83–131 depending on viewport position/height. SVG capture was parsed and contained all 1,334 edges; normal rendering resumed afterward. PNG capture also succeeded. Both checks compared logical/visual data before and after and found no changes. Large SVG DOM exports remain expensive (the resulting data URL was about 103 million characters); reducing export size is separate work. The automated download check stalled, so delivery to a downloaded file was not verified in this pass.

Browser checks also exercised complete-layout Fit view, paused seeking into a visible forward message, and seeking backward to hide its particle. A clean final profiling tab had no captured console errors. The development profiler now includes seek and image-capture verification controls and cleans up its React root during hot reload.

Validation: 177 tests pass and TypeScript/production build pass. New regressions cover bounded rendering on a 1,000-step legacy-style diagram, return messages, fractional zoom/panning, exact overscan boundaries, unknown geometry, unchanged layout/handles, complete capture restoration, overlapping captures and cleanup on preparation/capture failures. Existing migration, export-layout, timing, seek/reset and subscription tests remain passing. Real Confluence/Tauri host tests and video encoding end-to-end remain outstanding; existing bundle warnings remain.


## Implementation progress: freeform canvas and simulation review (13 October 2026)

Editor and shared/embed playback now use the same frame-loop controller. The simulation clock still advances on every animation frame, while global store updates are throttled to 150 ms. Shared playback no longer updates the whole store and rebuilds its maximum duration on every frame. The shared and editor duration calculations use one memoized linear helper, preserving the two-second minimum and one-way internal-process tail. Playback rates, explicit stop/reset and loop overshoot behavior are unchanged.

Loop reset now synchronizes active-step IDs along with time zero, and pausing synchronizes active IDs at the exact clock position. This fixes stale highlights between throttled store updates. Queued callbacks stop after pause/disposal or non-loop completion. A browser smoke test caught an incorrect native frame-function binding during extraction; it was corrected before final validation.

Freeform edges mount particle groups only while an interaction is active, rather than keeping five particle groups for every edge. On the 1,000-edge fixture, a paused seek showed 100 mounted groups for 20 active edges instead of 5,000 groups. Remounting recomputes particle position from the current clock, including paused seeks; sampled path geometry is retained across activation changes and invalidated when the SVG path changes. Node animation state is only submitted to React when its displayed values change. Complete edge paths, labels, handles and editing controls remain mounted; freeform editing has not been virtualized.

### Canvas 2D media rendering

The media renderer now weakly caches node/edge/sequence indexes, nested absolute positions, edge step lists and parallel-edge offsets by immutable logical/visual document revision. It reuses these across simulation frames and invalidates after document/layout edits. This removes repeated nested position searches and parallel-edge sorting/sequence filtering from the frame loop. Existing ordering, dimensions/defaults and reverse-direction offset signs are preserved. Malformed parent cycles terminate rather than overflowing recursion.

A benchmark with 1,000 edges and 240 parallel-offset queries measured 153.01 ms with the previous searches versus 0.061 ms for cached queries, plus 1.23 ms setup. This is geometry CPU cost, not total export or playback time. The real browser Canvas 2D renderer drew twelve 1,000-edge simulation frames in 49.0 ms (4.08 ms/frame), and twelve 250-edge frames in 16.2 ms (1.35 ms/frame), with logical/visual data unchanged. These are short synthetic samples, not encoder-throughput guarantees.

A drawing-command regression fixture was recorded from the pre-cache renderer and verified against the new renderer at six transit/process/return/idle times. The drawing fingerprints match exactly. Additional tests check parallel/reverse offsets, nested positions, missing-node defaults, cache reuse/invalidation and no document writes.

### Live rendering observations and remaining work

Browser samples observed approximately 118 FPS for 25 freeform edges, 30 FPS for 250 edges and 28–30 FPS for 1,000 edges, with substantial long-frame variability. The actual shared freeform panel measured 31.6 FPS on 250 edges. These results do **not** establish a live-canvas FPS improvement; the dense freeform canvas remains the next performance bottleneck. Geometry/export gains and fewer mounted particles must not be presented as solving dense live SVG rendering. Existing labels, path glow/style transitions, overlapping parallel curves and path measurement should be investigated with production-browser tracing before further changes.

The development profiler now exercises shared freeform playback, paused freeform particle seeking, Canvas 2D frames and image capture. A 250-edge SVG capture included all 250 edges. As before, freeform export requests Fit view, which can update the stored viewport through the canvas move handler; export compatibility should compare logical data, timing and layout separately from that existing viewport behavior. Real Confluence/Tauri host and full GIF/video encoding checks remain outstanding.

Validation: 188 tests pass, TypeScript/production build pass, and whitespace checks pass. Existing diagram migration and timing tests remain passing. New simulation regressions cover throttling, rate changes, exact pause state, seek/resume, loop highlights, stop/disposal and one-way process tails. Existing bundle-size warnings remain.


## Combined release review and verification (13 October 2026)

**Decision: hold broad publication pending live Confluence verification and uninterrupted native save/close testing.** Automated and local browser checks pass after the fixes below. No deployment, marketplace publication, release tag or signed distribution was created.

### Review findings addressed

1. **Confluence save failures could appear successful.** Forge and Data Center diagram saves previously fell back to browser storage on backend errors, allowing the coordinator to clear dirty state and the editor to close. Host saves now propagate backend failures. Forge workspace save failures also propagate. Existing read fallbacks and document envelopes remain unchanged. Regression checks cover Forge rejection, Data Center HTTP 403, successful attachment payloads and no false local acknowledgement.
2. **Preview capture could make a successful save look stale.** Export Fit view previously persisted a new visual viewport revision during PNG generation. Capture now suppresses viewport persistence for its full-render scope, while ordinary pan/zoom remains dirty/persistent. Final browser PNG and SVG captures reported `unchanged: true` with no changed logical/visual fields. This supersedes the earlier observation that export fitting changes saved viewport state.
3. **Host modal parameters could choose the wrong storage driver.** Recognized Forge/Data Center contexts now take precedence over generic iframe/embed parameters. Seven driver-selection cases cover build targets, runtime Data Center flags, iframe/editor/viewer and ordinary web contexts. Navigation remains disabled in recognized hosts.
4. **Media export resumed from zero.** GIF, canvas video and DOM-video capture now snapshot the high-resolution clock time and resume from that position, rather than calling the explicit reset/start action. Browser smoke checks produced GIF89a and MP4 `ftyp/isom` headers and restored playing state at nonzero times.
5. **Collaboration could replace/leave a diagram after a failed save.** Join and leave now honor the shared save guard instead of ignoring its boolean result. A regression verifies that failed saves preserve the document and active session.
6. **Slow diagram loads could overwrite newer edits or win out of order.** Switching now verifies the captured document revision/workspace and latest request before installing loaded data. Regression checks preserve edits during loading and reject an older request completing after the latest one.

### Completed checks

| Area | Result | Evidence and scope |
| --- | --- | --- |
| Combined regression suite | PASS | 205 tests, zero failures; machine-readable result at `/tmp/yada-release-tests.json`. Includes migration, format, sequence, timing, save, navigation, host failure and rendering cases. |
| Web production build | PASS | TypeScript and Vite build, including the frontend used by the final native package. Existing chunk warnings remain. |
| Forge frontend | PASS | `npm run build:forge`, after review fixes. |
| Data Center frontend | PASS | `npm run build:dc`, after review fixes. |
| Forge CLI lint | PASS WITH WARNING | Zero errors; existing `@forge/api` storage deprecation. Successful run used Node 26 with a CLI runtime-support warning. Installed Node 22.23.1 was explicitly rejected by the CLI patch-version guard, so a supported-runtime lint rerun remains desirable. No guard was bypassed. |
| Data Center Maven verify | PASS, NOT HOST TESTED | Local cached dependencies; initial sandbox socket restriction resolved with elevated local test access. Maven reports no integration tests and no configured database source. This validates packaging, not Confluence behavior. |
| Final Data Center package | PASS | `mvn -o package -q` after the final frontend build. Log: `/tmp/yada-dc-package.log`. |
| Tauri Rust check/build | PASS | Locked offline Cargo check and build succeeded. |
| Final unsigned Tauri bundle | PASS | A separate debug `YADA Release Check.app` was built from the reviewed frontend without replacing the open test app. Product-name override only; no signing or notarization. Log: `/tmp/yada-tauri-release-build.log`. |
| Native launch | PARTIAL | The earlier unsigned test bundle opened at `tauri://localhost#yada=home` and rendered a workspace. Native UI automation stopped after another interaction selected an existing workspace. Save/close was not exercised on user data. |
| Real local iframe protocol | PASS | `scripts/embed-release-check.html` loaded a schema-v2 round-trip fixture into the real editor. Observed READY → SAVE_DIAGRAM (same sequence ID/round-trip flag, PNG preview) → CLOSE_DIAGRAM. Existing message names/payloads retained. |
| Embed failed-save close protection | PASS | Driver tests prevent CLOSE_DIAGRAM after a failed save or newer unsaved edits. Generic iframe protocol still lacks a durable parent-storage acknowledgement; local handoff success does not establish backend persistence. |
| PNG/SVG DOM capture | PASS | Actual local browser capture; all fields unchanged after capture fix. Earlier large sequence SVG check included all 1,334 message edges before restoring viewport culling. |
| GIF encoding | PASS, SMOKE | Produced a 17,649-byte `image/gif` blob with GIF89a header; resumed playback at a nonzero position. Short synthetic fixture only. |
| Canvas MP4 encoding | PASS, SMOKE | Produced a 22,400-byte `video/mp4` blob with MP4 header; resumed playback at a nonzero position. |
| DOM MP4 encoding | PASS, SMOKE | Produced an 81,364-byte `video/mp4` blob with MP4 header; resumed playback at a nonzero position. Full-render capture and cleanup exercised. |
| Whitespace validation | PASS | `git diff --check`. |

Media checks used actual export entry points and encoders with a development-only blob observer; download code ran, but OS file delivery and playback in independent media players were not verified. These are encoding smoke checks rather than complete media compatibility certification. The local host/profiler pages are development tools and are not production entry points.

### Remaining publication gates

- **Live Forge and Data Center:** install the reviewed candidate on a staging site; open an existing macro, play/seek and switch views; verify collaboration/new-diagram controls remain absent and action boundaries reject them. Edit/save/reopen and verify attachment contents, multiple macro IDs, page permissions and a denied/offline save that keeps the editor open. Packaging/CLI checks do not replace this. A staging URL has been requested; no credentials should be posted in chat.
- **Native Tauri save and close:** use a disposable workspace to verify edit → manual save → reopen, Back/Forward and seeking in both views, failed filesystem writes, and immediate window close with unsaved changes. Source review found no explicit native CloseRequested guard; browser beforeunload alone is insufficient evidence that native closing preserves changes. This is an unresolved release gate, not a verified successful check.
- **Native exports and distribution:** confirm file dialogs/write permissions for PNG/SVG/GIF/video and .dproj; verify signing/notarization and installer behavior on the intended release platforms. The local bundle is unsigned/debug and must not be distributed as the release.
- **Independent media playback:** open saved GIF/MP4/WebM output in target browsers/players and verify representative longer and large diagrams. WebCodecs fallback and native file delivery remain unverified.

Dense freeform playback remains a documented performance limitation rather than a demonstrated solved bottleneck. These local checks do not establish frame-rate guarantees across embedded hosts or native webviews. Existing users' diagram schemas and timing semantics remain unchanged by the reviewed fixes.

## Production loading and dense freeform optimization (16 October 2026)

This pass reduces loading and topology preparation costs; it does **not** establish a dense-freeform playback frame-rate improvement. Raw measurements are retained in `performance/2026-10-16/`.

### Loading measurements

The build report follows static JavaScript imports from the application entry and then the lazy default welcome route. It sums individual raw/gzip file sizes. CSS, fonts, background service-worker requests, network latency and parse/execute time are not included. These values are not LCP, transferred-byte traces or cold-start timing measurements.

| JavaScript dependency closure | Before, bytes | After, bytes | Reduction |
| --- | ---: | ---: | ---: |
| Initial application | 3,321,427 | 560,782 | 83.1% |
| Initial application, summed gzip | 976,359 | 168,257 | 82.8% |
| Default welcome route included | 3,393,826 | 631,265 | 81.4% |
| Welcome route included, summed gzip | 996,344 | 188,532 | 81.1% |

Technology SVG variants now use individual lazy imports, and a closed icon picker mounts no catalog. Media exports and host preview capture load their implementation on demand. HTML exports, the host viewer, automatic layout and import parsers have actual lazy boundaries. Explicit manual chunk ownership prevents shared build helpers from pulling the entire graph-layout/editor dependency chain into startup. Automatic layout checks the active workspace/diagram after loading, so a delayed import cannot modify a different document; load failures use translated feedback.

The web PWA precache changed from 154 entries / 10,991.33 KiB to 183 entries / 9,604.74 KiB. Optional technology variants are cached on use, with a 400-entry/30-day limit. **Offline tradeoff:** a variant never cached on that installation needs a connection on first use. Loading has a fixed-size placeholder and a local error boundary; image/DOM-video capture preloads the document's selected icon variants before capture. An actual offline/reconnect and old-PWA upgrade acceptance run is still required.

### Large-diagram CPU and playback measurements

Edges share weakly cached indexes for logical edge lookup, sequence membership and deterministic parallel-edge ordering. The indexes are keyed by immutable edge/sequence revisions and preserve the previous direction-independent ordering, minimum-step rule and ID tie-break. A five-run Node CPU benchmark with 1,000 edges/steps returned equal checksums: legacy median 232.413 ms, first new index construction plus queries 1.110 ms, subsequent new queries 0.037–0.096 ms. This is a pure computation benchmark, **not** browser document-opening time or FPS.

Single cubic particle paths are sampled numerically with adaptive subdivision instead of repeated SVG length/point queries. Compound and orthogonal paths retain the SVG fallback. Tests cover distance-based seeking, endpoints, reverse tangents, loops, degenerate paths and a long-curve dense numerical reference (under 0.5 canvas units in that test). Drawing paths, selected glow settings, labels, themes and saved document data remain unchanged. The Confluence viewer now uses the shared throttled frame clock rather than writing global time and recomputing its duration on every frame; its existing looping policy and editor loop preference are preserved independently.

Playback used the real production profiler, 1,000 messages, 20 participants, a section, concurrent steps and round trips, at 1440 × 900 / DPR 1, Chrome 155 on macOS, reported hardware concurrency 18. Each side contains five 30-second samples after a one-second warmup. No builds ran during those paired samples. Device model/power mode were not recorded and the host's other workload was not controlled, so these are local diagnostic results, not release certification.

| Median of five production samples | Before | After |
| --- | ---: | ---: |
| FPS | 18.2 | 17.8 |
| p95 frame interval | 133.3 ms | 141.7 ms |
| Frames over 33 ms per sample | 274 | 268 |

There is no demonstrated playback improvement; p95 is worse in these samples. The 60 FPS / ≤20 ms p95 target remains open. Heap snapshots fluctuate and do not establish either a memory improvement or a leak. Experiments changing default glows, canvas background blur and particle layering were not retained because they did not demonstrate a consistent frame-time benefit. Further optimization needs a browser rendering trace that separates SVG paint/compositing from JavaScript, followed by measured visibility/detail handling or a renderer change with export/style parity.

Validation: 34 files / 239 tests pass, including translation coverage, existing save/timing/export compatibility checks, parallel-edge index parity and numerical geometry tests. Web, Forge and Data Center production builds pass; optional heavy-feature chunk warnings remain. In the clean production UI, Turkish loading/default names, keyboard component insertion, expanding the lazy technology catalog and applying PostgreSQL were verified; the app remained saved and captured no console errors. Browser download automation stalled during SVG file-delivery verification, so that check is **unverified**, not a passed export test. Real host, mobile device, offline cache/update and independently opened export-file acceptance remain required.
