---
name: dproj-generator
description: >
  Generate YADA .dproj project files or shareable preview URLs from natural
  language descriptions of distributed system architectures, design patterns,
  and data flows. Use this skill when a user asks to visualize, diagram, or
  simulate any architecture pattern (SAGA, CQRS, Event Sourcing, microservices
  flows, etc.) with YADA. Output is either a .dproj ZIP archive for import or
  a Magic Link URL for instant browser preview.
---

# YADA .dproj Generator

YADA is an interactive architecture diagramming tool with real-time flow simulation. Generate `.dproj` files (ZIP archives) users can import to visualize and simulate distributed system patterns.

## .dproj Structure

ZIP containing `workspace.json` + `diagram.json` (+ optional `components/` folder).

**workspace.json**: `{ "name": "...", "description": "...", "path": "virtual://workspace/imported", "lastModified": "ISO8601" }`

**diagram.json**: `{ "schemaVersion": 2, "logicalData": LogicalDiagram, "visualData": VisualDiagram }`

## Output Modes

This skill supports two output formats. Choose based on user intent:

| User Intent | Trigger Phrases | Output |
|---|---|---|
| Project file | "prepare yada project for …", "generate .dproj …", "create project file" | `.dproj` ZIP (via `pack_dproj.py`) |
| Preview URL | "simulate … and give me the preview url", "… share link", "… preview link", "give me the magic link" | Clickable URL (via `build_share_url.py`) |
| Ambiguous | "simulate …", "visualize …", "diagram …" | Ask user: `.dproj file or preview URL?` |

When user intent is ambiguous, ask: *"Would you like a `.dproj` project file to import, or a preview URL you can open directly in the browser?"*

## Data Model

Two layers — **both required**. Logical (what components exist and communicate) + Visual (where drawn, styled, and animated).

### LogicalDiagram (Topology & Semantics — Zero Visual Data)

```json
{ "schemaVersion": 2, "nodes": "LogicalNode[]", "edges": "LogicalEdge[]", "sequences": "SequenceStep[]" }
```

**LogicalNode**: `{ id, type, name, parentId?, properties? }`
- `type` must be one of: `client` | `load_balancer` | `gateway` | `server` | `database` | `cache` | `queue` | `firewall` | `section`
- `server` is the catch-all for any microservice/backend. Do NOT invent types.
- `parentId` references a `section` node for grouping.

**LogicalEdge**: `{ id, sourceId, targetId, isAsync, protocol?, description?, properties? }`
- `isAsync: true` = fire-and-forget/event; `false` = synchronous request.

**SequenceStep**: `{ id, stepNumber, edgeId, isAsync, isRoundTrip? }`
- Same `stepNumber` = parallel execution. Different = sequential.
- `isRoundTrip: true` = animate A→B→A (request+response).

### VisualDiagram (Presentation, Layout & Animations)

```json
{ "canvas": { "zoom": 1, "pan": { "x": 0, "y": 0 }, "gridVisible": true, "bgColor": null },
  "layoutNodes": "Record<id, VisualNode>",
  "layoutEdges": "Record<id, VisualEdge>",
  "timelines": "Record<id, TimelineTiming>",
  "annotations": "Record<id, StickyNote>" }
```

**VisualNode**: `{ id, x, y, width?(224), height?(52), theme?, zIndex?, handles?, displayMode?, rotation?, customStyles? }`
- Themes: `indigo`(clients) | `emerald`(gateways) | `rose`(databases) | `amber`(servers) | `violet`(queues) | `cyan`(caches)
- Section nodes: `zIndex: -1`, sized to enclose children + 40px padding.
- `handles`: array of `{ id, side, offset }`. If omitted, the node gets 4 default handles (`top:50`, `right:50`, `bottom:50`, `left:50`).
- **Rich Icons (`customStyles`)**: Set `productIcon` (e.g. `'postgresql'`, `'redis'`, `'kafka'`, `'docker'`, `'kubernetes'`, `'aws'`, `'react'`, `'java'`, `'python'`, `'go'`, `'mongodb'`, `'rabbitmq'`) and `productIconColored: true` for stunning visuals.

**VisualEdge**: `{ id, sourceHandle?, targetHandle?, particleType?, showArrow?(true), color? }`
- Handles format: `"side:offset"` e.g. `"right:50"`, `"top:25"`. Offset = 0-100%.
- Particles: `dot` | `arrow` | `envelope` | `rest` | `grpc` | `ws` | `graphql` | `kafka` | `pkg` | `sql`
- LR layout: source=`right:50`, target=`left:50`. TB layout: source=`bottom:50`, target=`top:50`.

**TimelineTiming**: `{ sequenceId, duration(ms), delay(ms), animationMode?, repeatParticleCount?, internalProcess?: { text, duration } }`
- `delay` = cumulative start time. **Sequential**: `delay[i] = delay[i-1] + duration[i-1]`. **Parallel**: same `delay`.
- `animationMode`: `'normal'` | `'roundTrip'` | `'repeat'` (stored in visual timeline timing).
- `repeatParticleCount`: particle count when animationMode is `'repeat'`.
- Duration guide: internal 500-800ms, HTTP 800-1200ms, DB 500-1000ms, external 1000-2000ms, async publish 300-600ms.

### 📝 Sticky Notes (Visual Annotations)

Sticky notes are purely visual annotations. They belong exclusively in VisualData and require **both**:

**1. `visualData.annotations`** — content and style for the note ID:
```json
"note-1": {
  "id": "note-1", "header": "Title", "body": "Content line 1\nContent line 2",
  "style": { "backgroundColor": "#0f172a", "borderColor": "#6366f1", "textColor": "#e2e8f0", "fontFamily": "Inter", "fontSize": 12, "borderRadius": 8, "opacity": 0.95 },
  "startTime": 0, "endTime": 9999, "alwaysVisible": true
}
```

**2. `visualData.layoutNodes`** — position and size for that same ID:
```json
"note-1": {"id": "note-1", "x": 100, "y": 200, "width": 260, "height": 160}
```

- Sticky notes **must NOT** be added to `logicalData.nodes`.
- Sticky notes **cannot have edges** — they are visual-only annotations.

## Layout & Grid Guidelines

### 📐 Standard Grid Layout (Avoid Node Overlap)
For clean Left-to-Right (LR) diagrams:
- **Columns (X)**: Col 0 = `0`, Col 1 = `350`, Col 2 = `700`, Col 3 = `1050`
- **Rows (Y)**: Row 0 = `0`, Row 1 = `150`, Row 2 = `300`
- Node dimensions: Default `224×52px`. Spacing ensures 100px+ gap.

### ⚠️ Section Child Coordinates (Critical)
Nodes with `parentId` use **section-relative coordinates** — (0,0) is the section's top-left corner:
```
child.x = absolute_canvas_x - section.x
child.y = absolute_canvas_y - section.y
```
Section bounds must enclose all children: `section.width ≥ child.x + child.width + 40`, same for height.

### ⚠️ Handle Consistency (Critical)
Always use standard handle IDs (`"right:50"`, `"left:50"`, `"top:50"`, `"bottom:50"`) unless specifically adding a custom `handles` array to the node. Do NOT invent custom handle names.

## ⚠️ AI Agent Pre-Flight Checklist (Run Before Export)

1. `schemaVersion` is `2` in `diagram.json` and `logicalData`.
2. Every node ID in `logicalData.nodes` exists in `visualData.layoutNodes`.
3. Sticky notes exist ONLY in `visualData.annotations` and `visualData.layoutNodes` (NOT in `logicalData.nodes`).
4. Handles use exact standard format (`"right:50"`, `"left:50"`, `"top:50"`, `"bottom:50"`).
5. Sequential step timelines accumulate `delay`: `delay[i] = delay[i-1] + duration[i-1]`.
6. For Magic Link output: share payload includes `currentView: "diagram"` alongside `logicalData` and `visualData`.

## Building the .dproj

Use the bundled script which validates all IDs, foreign keys, and node types before packing:

```bash
python <skill_dir>/scripts/pack_dproj.py output.dproj /tmp/workspace.json /tmp/diagram.json
```

## Building the Preview URL (Magic Link)

For instant browser preview without file downloads. Uses LZ-String compression to embed the full diagram state in a URL hash fragment.

**Share Payload Format** (what the YADA app expects):
```json
{ "logicalData": { ... }, "visualData": { ... }, "currentView": "diagram" }
```

**How it works**: `JSON.stringify(payload)` → `LZString.compressToEncodedURIComponent()` → URL-safe string appended to `#share=`.

**URL Template**: `https://bishoku.github.io/yada/#share=<compressed_data>`

Use the bundled script which validates, repairs, compresses, and writes the URL to a markdown file:

```bash
python <skill_dir>/scripts/build_share_url.py /tmp/diagram.json \
  --name "CQRS Pattern" \
  --description "Command Query Responsibility Segregation with Event Store" \
  --output-md generated_link.md
```

### ⚠️ Token Efficiency (Critical)

The script writes the URL to a **markdown file** — it does **NOT** output the URL to stdout.
This is intentional: compressed URLs can be 2,000–30,000+ characters. Sending that data back
through LLM context wastes thousands of tokens on unreadable compressed noise.

**Agent behavior after running the script:**
- ✅ Tell the user: *"Preview URL has been generated. You can find the clickable link in `generated_link.md`."*
- ❌ Do NOT read the generated markdown file back into context.
- ❌ Do NOT try to extract or echo the URL from the file.
- ❌ Do NOT include any `#share=...` data in your response.

⚠️ **Size limit**: URLs over 32,000 characters may not work reliably in all browsers. The script exits with an error when this limit is exceeded — in that case, fall back to `.dproj` output using `pack_dproj.py`.

## Complete Example: 3-Service Flow with Event Bus

```json
{
  "schemaVersion": 2,
  "logicalData": {
    "schemaVersion": 2,
    "nodes": [
      {"id":"n-gw","type":"gateway","name":"API Gateway"},
      {"id":"n-order","type":"server","name":"Order Service","parentId":"s-svc"},
      {"id":"n-bus","type":"queue","name":"Event Bus"},
      {"id":"n-pay","type":"server","name":"Payment Service","parentId":"s-svc"},
      {"id":"n-db","type":"database","name":"Order DB"},
      {"id":"s-svc","type":"section","name":"Services"}
    ],
    "edges": [
      {"id":"e1","sourceId":"n-gw","targetId":"n-order","isAsync":false,"protocol":"HTTP","description":"POST /order"},
      {"id":"e2","sourceId":"n-order","targetId":"n-db","isAsync":false,"protocol":"SQL","description":"INSERT"},
      {"id":"e3","sourceId":"n-order","targetId":"n-bus","isAsync":true,"protocol":"Kafka","description":"OrderCreated"},
      {"id":"e4","sourceId":"n-bus","targetId":"n-pay","isAsync":true,"protocol":"Kafka","description":"Consume"},
      {"id":"e5","sourceId":"n-pay","targetId":"n-bus","isAsync":true,"protocol":"Kafka","description":"PaymentDone"}
    ],
    "sequences": [
      {"id":"s1","stepNumber":1,"edgeId":"e1","isAsync":false,"isRoundTrip":true},
      {"id":"s2","stepNumber":2,"edgeId":"e2","isAsync":false,"isRoundTrip":true},
      {"id":"s3","stepNumber":3,"edgeId":"e3","isAsync":true},
      {"id":"s4","stepNumber":4,"edgeId":"e4","isAsync":true},
      {"id":"s5","stepNumber":5,"edgeId":"e5","isAsync":true}
    ]
  },
  "visualData": {
    "canvas":{"zoom":0.9,"pan":{"x":50,"y":50},"gridVisible":true},
    "layoutNodes":{
      "n-gw":   {"id":"n-gw",   "x":0,  "y":100,"width":224,"height":52,"theme":"emerald"},
      "n-order":{"id":"n-order","x":350,"y":0,  "width":224,"height":52,"theme":"amber","customStyles":{"productIcon":"spring","productIconColored":true}},
      "n-bus":  {"id":"n-bus",  "x":350,"y":200,"width":224,"height":52,"theme":"violet","customStyles":{"productIcon":"kafka","productIconColored":true}},
      "n-pay":  {"id":"n-pay",  "x":700,"y":200,"width":224,"height":52,"theme":"amber","customStyles":{"productIcon":"go","productIconColored":true}},
      "n-db":   {"id":"n-db",   "x":700,"y":0,  "width":224,"height":52,"theme":"rose","customStyles":{"productIcon":"postgresql","productIconColored":true}},
      "s-svc":  {"id":"s-svc",  "x":310,"y":-50,"width":660,"height":340,"zIndex":-1,"theme":"amber"}
    },
    "layoutEdges":{
      "e1":{"id":"e1","sourceHandle":"right:50","targetHandle":"left:50","particleType":"rest","showArrow":true},
      "e2":{"id":"e2","sourceHandle":"right:50","targetHandle":"left:50","particleType":"sql","showArrow":true},
      "e3":{"id":"e3","sourceHandle":"bottom:50","targetHandle":"top:50","particleType":"kafka","showArrow":true},
      "e4":{"id":"e4","sourceHandle":"right:50","targetHandle":"left:50","particleType":"kafka","showArrow":true},
      "e5":{"id":"e5","sourceHandle":"top:50","targetHandle":"bottom:50","particleType":"kafka","showArrow":true}
    },
    "timelines":{
      "s1":{"sequenceId":"s1","duration":800,"delay":0,"animationMode":"roundTrip","internalProcess":{"text":"Routing","duration":300}},
      "s2":{"sequenceId":"s2","duration":600,"delay":800,"animationMode":"roundTrip","internalProcess":{"text":"INSERT order","duration":300}},
      "s3":{"sequenceId":"s3","duration":400,"delay":1400,"animationMode":"normal"},
      "s4":{"sequenceId":"s4","duration":500,"delay":1800,"animationMode":"normal"},
      "s5":{"sequenceId":"s5","duration":400,"delay":2300,"animationMode":"normal"}
    }
  }
}
```
