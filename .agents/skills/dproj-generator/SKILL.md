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
- `parentId` references a `section` node for grouping. **Nested sections are supported** — a section can have `parentId` pointing to another section.

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
- `handles`: array of `{ id, side, offset }`. If omitted, the node gets 4 default handles (`top:50`, `right:50`, `bottom:50`, `left:50`).

**VisualEdge**: `{ id, sourceHandle?, targetHandle?, particleType?, showArrow?(true), color? }`
- Handles format: `"side:offset"` e.g. `"right:50"`, `"top:25"`. Offset = 0-100%.
- Particles: `dot` | `arrow` | `envelope` | `rest` | `grpc` | `ws` | `graphql` | `kafka` | `pkg` | `sql`
- LR layout: source=`right:50`, target=`left:50`. TB layout: source=`bottom:50`, target=`top:50`.

**TimelineTiming**: `{ sequenceId, duration(ms), delay(ms), animationMode?, repeatParticleCount?, internalProcess?: { text, duration } }`
- `delay` = step-local wait delay (ms). **Do NOT accumulate previous step durations into `delay`**. Each step's delay is independent.
- `animationMode`: `'normal'` | `'roundTrip'` | `'repeat'`.
- `repeatParticleCount`: particle count when animationMode is `'repeat'`.
- **Tooltip & Internal Process Durations**: `internalProcess.duration` controls tooltip visibility. **Set generous durations (1500ms – 3000ms minimum)**.
- **Duration Guide**: internal process / tooltip: `1500–3000ms`, edge transit (`duration`): `1000–2000ms`, DB query: `1200–2000ms`.

---

## 🎨 Visual Design System (Premium Diagrams)

Every diagram MUST look visually premium. Use the styling system below deliberately — generic defaults are NOT acceptable.

### Node Themes

Assign themes by architectural role for instant visual semantics:

| Theme | Hex | Best For |
|---|---|---|
| `indigo` | `#6366f1` | Clients, frontends, user-facing |
| `emerald` | `#10b981` | Gateways, load balancers, entry points |
| `amber` | `#f59e0b` | Services, microservices, workers |
| `rose` | `#f43f5e` | Databases, persistent stores |
| `violet` | `#8b5cf6` | Queues, event buses, message brokers |
| `cyan` | `#06b6d4` | Caches, CDNs, in-memory stores |
| `slate` | `#64748b` | Infrastructure, firewalls, generic |
| `white` | `#ffffff` | Neutral, minimal style |

Custom hex values (e.g. `"#2563eb"`) are also supported as theme values.

### 🖼️ Product Icons (Rich Node Visuals)

Use `customStyles.productIcon` + `productIconColored: true` for branded technology icons. Available icons:

**Cloud & Infra**: `aws`, `azure`, `gcp`, `docker`, `kubernetes`, `cloudflare`, `nginx`, `envoy`, `traefik`
**Languages**: `java`, `go`, `python`, `rust`, `ruby`, `csharp`, `php`, `nodejs`, `dotnet`
**Databases**: `postgresql`, `mysql`, `mongodb`, `cassandra`, `mariadb`, `sqlite`, `oracle`, `supabase`
**Messaging**: `kafka`, `rabbitmq`
**Caching/Search**: `redis`, `memcached`, `elasticsearch`
**Frameworks**: `spring`, `rails`, `prisma`, `graphql`
**Monitoring**: `grafana`, `prometheus`, `kibana`
**CI/CD**: `bamboo`, `bitbucket`, `jira`, `confluence`
**Other**: `firebase`, `apollo`, `chrome`, `firefox`, `safari`, `android`, `apple`, `linux`, `windows`

Set `productIconWordmark: true` for text-based logo variants where available.

### Node customStyles Reference

```json
{
  "productIcon": "postgresql",
  "productIconColored": true,
  "productIconWordmark": false,
  "backgroundColor": "#hex",
  "bgOpacity": 0.15,
  "borderColor": "#hex",
  "borderStyle": "solid | dashed | dotted",
  "borderRadius": 8,
  "borderOnly": false,
  "iconColor": "#hex",
  "iconLabelPosition": "none | top | bottom | left | right"
}
```

### 📦 Section Styling (Domain Boundaries)

Sections group related nodes into visual containers. Style them deliberately:

#### Section Themes
Sections use the same theme palette as nodes. Use color-coding to differentiate domains:
- `emerald` for public-facing boundaries
- `indigo` for internal service domains
- `violet` for event/messaging domains
- `rose` for data layer boundaries
- `amber` for compute/worker domains

#### Section Title Placement (`customStyles`)

Titles can be placed on **any of the 4 edges** with configurable alignment:

```json
{
  "sectionTitleMode": "inline | header | none",
  "sectionTitleEdge": "top | right | bottom | left",
  "sectionTitleAlign": "left | center | right",
  "borderStyle": "dashed | solid | dotted",
  "bgOpacity": 0.08,
  "headerBgColor": "#hex or theme-name",
  "backgroundColor": "#hex"
}
```

| Property | Values | Description |
|---|---|---|
| `sectionTitleMode` | `inline` (default), `header`, `none` | `inline` = floating tag on edge, `header` = solid banner strip, `none` = hidden |
| `sectionTitleEdge` | `top` (default), `right`, `bottom`, `left` | Which edge the title appears on |
| `sectionTitleAlign` | `left` (default), `center`, `right` | Alignment along the chosen edge (maps to start/center/end) |
| `borderStyle` | `dashed` (default), `solid`, `dotted` | Section border line style |
| `bgOpacity` | `0.0 – 1.0` | Background fill opacity (lower = more transparent, 0.05–0.15 recommended) |
| `headerBgColor` | hex or theme name | Solid fill color for header banner mode |

**Text direction for side edges:**
- **Left edge**: Text flows bottom → top
- **Right edge**: Text flows top → bottom
- **Top/Bottom edges**: Normal horizontal text

**Premium styling tips:**
- Use `"sectionTitleMode": "header"` with `"sectionTitleEdge": "left"` for a vertical sidebar label (elegant domain labeling).
- Use `"borderStyle": "solid"` + low `bgOpacity` (0.05-0.10) for clean modern boundaries.
- Mix `"sectionTitleEdge": "left"` for outer domain sections and `"top"` for inner subsections (nested sections).
- Set `"headerBgColor"` to the section theme color for a branded banner.

#### Nested Sections
Sections can contain other sections. Use `parentId` to nest:
```json
{"id": "s-outer", "type": "section", "name": "Platform"},
{"id": "s-inner", "type": "section", "name": "Core Services", "parentId": "s-outer"}
```
- Inner sections use **parent-relative coordinates** (same as child nodes).
- Z-index is automatic: root sections = -1, depth 1 = 0, depth 2 = 1, etc.
- Outer section must be sized to enclose inner sections + padding.

### 🎯 Premium Design Patterns

Apply these patterns to elevate visual quality:

**1. Consistent Color Coding**: All nodes of the same type share the same theme. All services = `amber`, all databases = `rose`, etc.

**2. Icon-First Nodes**: Every node should have a `productIcon` when a matching technology exists. This turns generic boxes into recognizable branded components.

**3. Section as Domain Context**: Use sections with `header` mode and side-edge titles to create clear bounded contexts. Color-code sections to match their domain's role.

**4. Edge Particles**: Match particle types to protocols — `rest` for HTTP, `kafka` for Kafka events, `sql` for DB queries, `grpc` for gRPC calls, `graphql` for GraphQL.

**5. Color-Coded Edges**: Use `color` on VisualEdge for critical paths (e.g. `"#ef4444"` for error flows, `"#22c55e"` for success paths).

**6. Generous Spacing**: Minimum 100px gap between nodes, 40px padding inside sections. Dense layouts look cluttered.

**7. Annotations**: Use dark-themed sticky notes (`backgroundColor: "#0f172a"`, `borderColor: "#6366f1"`) for architectural notes, pattern labels, or flow descriptions.

---

## 📝 Sticky Notes (Visual Annotations)

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

### 📐 Dynamic Layout Representation (LLM Choice)

Do **NOT** force every diagram into a rigid Left-to-Right layout. Choose the layout orientation (LR, TB, or Composite) that best fits the natural structure of the architecture being visualized:

| Layout Style | Best For | Flow Direction | Handle Strategy |
|---|---|---|---|
| **Left-to-Right (LR)** | Pipelines, stream processing, sequential chains | Left → Right | `sourceHandle: "right:50"`, `targetHandle: "left:50"` |
| **Top-to-Bottom (TB)** | Tiered architectures, tree hierarchies | Top → Bottom | `sourceHandle: "bottom:50"`, `targetHandle: "top:50"` |
| **Composite (Hybrid)** | Complex microservices with mixed flows | Primary LR + Secondary TB | Match relative positions |

### 📐 Standard Grid Coordinates

Ensure generous spacing (100px+ gap) so nodes never overlap:

- **LR Layout Grid**:
  - **Columns (X)**: Col 0 = `0`, Col 1 = `350`, Col 2 = `700`, Col 3 = `1050`
  - **Rows (Y)**: Row 0 = `0`, Row 1 = `150`, Row 2 = `300`
- **TB Layout Grid**:
  - **Columns (X)**: Col 0 = `0`, Col 1 = `300`, Col 2 = `600`
  - **Rows (Y)**: Row 0 = `0`, Row 1 = `180`, Row 2 = `360`, Row 3 = `540`
- **Composite Layout Grid**:
  - Primary services placed across Columns X (`0`, `350`, `700`...).
  - Auxiliary nodes (Databases, Caches, Event Brokers) placed directly above (Y = `-150`) or below (Y = `150`) their associated service.

### ⚠️ Section Child Coordinates (Critical)
Nodes with `parentId` use **section-relative coordinates** — (0,0) is the section's top-left corner:
```
child.x = absolute_canvas_x - section.x
child.y = absolute_canvas_y - section.y
```
Section bounds must enclose all children: `section.width ≥ child.x + child.width + 40`, same for height.

For **nested sections**, inner section coordinates are relative to the outer section's top-left corner (same rule).

### ⚠️ Handle Consistency (Critical)
Always use standard handle IDs (`"right:50"`, `"left:50"`, `"top:50"`, `"bottom:50"`) unless specifically adding a custom `handles` array to the node. Match handle orientation to relative node placement. Do NOT invent custom handle names.

## ⚠️ AI Agent Pre-Flight Checklist (Run Before Export)

1. `schemaVersion` is `2` in `diagram.json` and `logicalData`.
2. Every node ID in `logicalData.nodes` exists in `visualData.layoutNodes`.
3. Sticky notes exist ONLY in `visualData.annotations` and `visualData.layoutNodes` (NOT in `logicalData.nodes`).
4. Handles use exact standard format (`"right:50"`, `"left:50"`, `"top:50"`, `"bottom:50"`) and match relative node positioning.
5. Step timelines use per-step wait delay (`delay` is local to each step — **DO NOT accumulate previous step durations**).
6. Tooltip and internalProcess durations are set to at least **1500ms – 3000ms** so users have enough time to read them.
7. Layout orientation (LR, TB, or Composite) is explicitly chosen to provide the clearest visualization.
8. Every node has a `productIcon` if a matching technology icon exists in the registry.
9. Sections have deliberate title placement (`sectionTitleEdge`, `sectionTitleMode`, `sectionTitleAlign`).
10. For Magic Link output: share payload includes `currentView: "diagram"` alongside `logicalData` and `visualData`.

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

## Complete Example: Premium Microservices Architecture

```json
{
  "schemaVersion": 2,
  "logicalData": {
    "schemaVersion": 2,
    "nodes": [
      {"id":"n-client","type":"client","name":"Web Client"},
      {"id":"n-gw","type":"gateway","name":"API Gateway"},
      {"id":"s-core","type":"section","name":"Core Domain"},
      {"id":"n-order","type":"server","name":"Order Service","parentId":"s-core"},
      {"id":"n-pay","type":"server","name":"Payment Service","parentId":"s-core"},
      {"id":"s-data","type":"section","name":"Data Layer"},
      {"id":"n-db","type":"database","name":"PostgreSQL","parentId":"s-data"},
      {"id":"n-cache","type":"cache","name":"Redis","parentId":"s-data"},
      {"id":"n-bus","type":"queue","name":"Kafka"}
    ],
    "edges": [
      {"id":"e1","sourceId":"n-client","targetId":"n-gw","isAsync":false,"protocol":"HTTPS","description":"User Request"},
      {"id":"e2","sourceId":"n-gw","targetId":"n-order","isAsync":false,"protocol":"gRPC","description":"CreateOrder"},
      {"id":"e3","sourceId":"n-order","targetId":"n-db","isAsync":false,"protocol":"SQL","description":"INSERT order"},
      {"id":"e4","sourceId":"n-order","targetId":"n-cache","isAsync":false,"protocol":"Redis","description":"Cache order"},
      {"id":"e5","sourceId":"n-order","targetId":"n-bus","isAsync":true,"protocol":"Kafka","description":"OrderCreated"},
      {"id":"e6","sourceId":"n-bus","targetId":"n-pay","isAsync":true,"protocol":"Kafka","description":"ProcessPayment"}
    ],
    "sequences": [
      {"id":"s1","stepNumber":1,"edgeId":"e1","isAsync":false,"isRoundTrip":true},
      {"id":"s2","stepNumber":2,"edgeId":"e2","isAsync":false,"isRoundTrip":true},
      {"id":"s3","stepNumber":3,"edgeId":"e3","isAsync":false,"isRoundTrip":true},
      {"id":"s4","stepNumber":3,"edgeId":"e4","isAsync":false,"isRoundTrip":true},
      {"id":"s5","stepNumber":4,"edgeId":"e5","isAsync":true},
      {"id":"s6","stepNumber":5,"edgeId":"e6","isAsync":true}
    ]
  },
  "visualData": {
    "canvas":{"zoom":0.85,"pan":{"x":80,"y":60},"gridVisible":true},
    "layoutNodes":{
      "n-client":{"id":"n-client","x":0,"y":120,"width":224,"height":52,"theme":"indigo","customStyles":{"productIcon":"chrome","productIconColored":true}},
      "n-gw":{"id":"n-gw","x":350,"y":120,"width":224,"height":52,"theme":"emerald","customStyles":{"productIcon":"nginx","productIconColored":true}},
      "s-core":{"id":"s-core","x":680,"y":0,"width":540,"height":300,"zIndex":-1,"theme":"amber","customStyles":{"sectionTitleMode":"header","sectionTitleEdge":"left","sectionTitleAlign":"center","borderStyle":"solid","bgOpacity":0.08,"headerBgColor":"amber"}},
      "n-order":{"id":"n-order","x":40,"y":40,"width":224,"height":52,"theme":"amber","customStyles":{"productIcon":"spring","productIconColored":true}},
      "n-pay":{"id":"n-pay","x":40,"y":200,"width":224,"height":52,"theme":"amber","customStyles":{"productIcon":"java","productIconColored":true}},
      "s-data":{"id":"s-data","x":680,"y":370,"width":540,"height":180,"zIndex":-1,"theme":"rose","customStyles":{"sectionTitleMode":"header","sectionTitleEdge":"left","sectionTitleAlign":"center","borderStyle":"solid","bgOpacity":0.06,"headerBgColor":"rose"}},
      "n-db":{"id":"n-db","x":40,"y":40,"width":224,"height":52,"theme":"rose","customStyles":{"productIcon":"postgresql","productIconColored":true}},
      "n-cache":{"id":"n-cache","x":300,"y":40,"width":224,"height":52,"theme":"cyan","customStyles":{"productIcon":"redis","productIconColored":true}},
      "n-bus":{"id":"n-bus","x":350,"y":340,"width":224,"height":52,"theme":"violet","customStyles":{"productIcon":"kafka","productIconColored":true}}
    },
    "layoutEdges":{
      "e1":{"id":"e1","sourceHandle":"right:50","targetHandle":"left:50","particleType":"rest","showArrow":true},
      "e2":{"id":"e2","sourceHandle":"right:50","targetHandle":"left:50","particleType":"grpc","showArrow":true},
      "e3":{"id":"e3","sourceHandle":"bottom:50","targetHandle":"top:50","particleType":"sql","showArrow":true},
      "e4":{"id":"e4","sourceHandle":"bottom:50","targetHandle":"top:50","particleType":"dot","showArrow":true},
      "e5":{"id":"e5","sourceHandle":"left:50","targetHandle":"right:50","particleType":"kafka","showArrow":true},
      "e6":{"id":"e6","sourceHandle":"top:50","targetHandle":"bottom:50","particleType":"kafka","showArrow":true}
    },
    "timelines":{
      "s1":{"sequenceId":"s1","duration":1200,"delay":0,"animationMode":"roundTrip","internalProcess":{"text":"HTTPS → API Gateway routing","duration":2000}},
      "s2":{"sequenceId":"s2","duration":1000,"delay":0,"animationMode":"roundTrip","internalProcess":{"text":"gRPC CreateOrder call","duration":2000}},
      "s3":{"sequenceId":"s3","duration":1200,"delay":0,"animationMode":"roundTrip","internalProcess":{"text":"INSERT INTO orders","duration":2500}},
      "s4":{"sequenceId":"s4","duration":800,"delay":0,"animationMode":"roundTrip","internalProcess":{"text":"SET order:cache","duration":1500}},
      "s5":{"sequenceId":"s5","duration":1000,"delay":0,"animationMode":"normal","internalProcess":{"text":"Publish OrderCreated event","duration":2000}},
      "s6":{"sequenceId":"s6","duration":1000,"delay":0,"animationMode":"normal","internalProcess":{"text":"Consume → ProcessPayment","duration":2000}}
    },
    "annotations":{
      "note-arch":{"id":"note-arch","header":"Architecture Pattern","body":"Event-Driven Microservices\nwith CQRS separation\n\n• Sync: gRPC service mesh\n• Async: Kafka event bus\n• Cache: Redis for hot data","style":{"backgroundColor":"#0f172a","borderColor":"#6366f1","textColor":"#e2e8f0","fontFamily":"Inter","fontSize":11,"borderRadius":10,"opacity":0.95},"startTime":0,"endTime":9999,"alwaysVisible":true}
    }
  }
}
```
