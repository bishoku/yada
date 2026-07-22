#!/usr/bin/env python3
"""
pack_dproj.py — Validates and packs workspace.json + diagram.json into a .dproj ZIP archive.

Usage:
  python pack_dproj.py <output.dproj> <workspace.json> <diagram.json>

Auto-repairs applied silently before packing (Schema V2):
  1. Handle IDs referenced in layoutEdges but missing from node handles → injected.
  2. Child nodes (parentId set) using absolute canvas coordinates → converted to
     section-relative coordinates using a two-condition heuristic.
  3. Purge pseudo-logical sticky_note entries from logicalData.nodes (belong in annotations).
  4. Move animationMode and repeatParticleCount from SequenceStep to VisualDiagram.timelines.
  5. Bump schemaVersion to 2.
"""

import sys
import json
import zipfile
import os

VALID_TYPES = {
    "client", "load_balancer", "gateway", "server", "database",
    "cache", "queue", "firewall", "section",
}
VALID_SIDES = {"top", "right", "bottom", "left"}
DEFAULT_HANDLES = [
    {"id": "top:50",    "side": "top",    "offset": 50},
    {"id": "right:50",  "side": "right",  "offset": 50},
    {"id": "bottom:50", "side": "bottom", "offset": 50},
    {"id": "left:50",   "side": "left",   "offset": 50},
]
DEFAULT_HANDLE_IDS = {h["id"] for h in DEFAULT_HANDLES}


def parse_handle_id(handle_id: str):
    parts = handle_id.split(":")
    if len(parts) != 2:
        return None
    side, raw_offset = parts
    if side not in VALID_SIDES:
        return None
    try:
        offset = int(raw_offset)
    except ValueError:
        return None
    if not (0 <= offset <= 100):
        return None
    return side, offset


# ─── Workspace validation ──────────────────────────────────────────────────────

def validate_workspace(data: dict) -> list:
    errors = []
    for key in ("name", "path"):
        if key not in data:
            errors.append(f"workspace.json missing required field: '{key}'")
    return errors


# ─── Repair 1: Handle injection ────────────────────────────────────────────────

def repair_handles(data: dict) -> list:
    """
    Inject handle IDs referenced in layoutEdges that are missing from node
    handles arrays. Mutates data in place.
    """
    repairs = []
    ld = data.get("logicalData", {})
    vd = data.get("visualData", {})
    edges = ld.get("edges", [])
    layout_nodes = vd.get("layoutNodes", {})
    layout_edges = vd.get("layoutEdges", {})

    required: dict = {}
    for le in edges:
        ve = layout_edges.get(le.get("id", ""))
        if not ve:
            continue
        src = le.get("sourceId")
        tgt = le.get("targetId")
        if ve.get("sourceHandle") and src:
            required.setdefault(src, set()).add(ve["sourceHandle"])
        if ve.get("targetHandle") and tgt:
            required.setdefault(tgt, set()).add(ve["targetHandle"])

    for node_id, handle_ids in required.items():
        vn = layout_nodes.get(node_id)
        if not vn:
            continue

        existing = vn.get("handles")
        if existing and len(existing) > 0:
            existing_ids = {h["id"] for h in existing}
            current = list(existing)
        else:
            existing_ids = set(DEFAULT_HANDLE_IDS)
            current = [dict(h) for h in DEFAULT_HANDLES]

        changed = False
        for hid in sorted(handle_ids):
            if hid in existing_ids:
                continue
            parsed = parse_handle_id(hid)
            if not parsed:
                repairs.append(f"  ⚠  Node '{node_id}': cannot parse handle id '{hid}' — skipped")
                continue
            side, offset = parsed
            current.append({"id": hid, "side": side, "offset": offset})
            existing_ids.add(hid)
            changed = True
            repairs.append(f"  ✎  Node '{node_id}': injected missing handle '{hid}'")

        if changed:
            vn["handles"] = current

    return repairs


# ─── Repair 2: Section-relative coordinates ────────────────────────────────────

def repair_section_coordinates(data: dict) -> list:
    """
    Child nodes with parentId must use section-relative coordinates.
    Detects and converts absolute canvas coordinates to relative using a
    two-condition heuristic. Mutates data in place.
    """
    repairs = []
    ld = data.get("logicalData", {})
    vd = data.get("visualData", {})
    nodes = ld.get("nodes", [])
    layout_nodes = vd.get("layoutNodes", {})

    sections = {}
    for n in nodes:
        if n.get("type") == "section":
            vn = layout_nodes.get(n["id"])
            if vn:
                sections[n["id"]] = vn

    for n in nodes:
        parent_id = n.get("parentId")
        if not parent_id or parent_id not in sections:
            continue

        vn = layout_nodes.get(n["id"])
        if not vn:
            continue

        section = sections[parent_id]
        sx = section.get("x", 0)
        sy = section.get("y", 0)
        sw = section.get("width", 9999)
        sh = section.get("height", 9999)
        nx = vn.get("x", 0)
        ny = vn.get("y", 0)
        nw = vn.get("width", 224)
        nh = vn.get("height", 52)

        outside_as_relative = nx > sw or ny > sh or nx < -nw or ny < -nh
        rel_x = nx - sx
        rel_y = ny - sy
        inside_after_conversion = 0 <= rel_x < sw and 0 <= rel_y < sh

        if outside_as_relative and inside_after_conversion:
            vn["x"] = rel_x
            vn["y"] = rel_y
            repairs.append(
                f"  ✎  Node '{n['id']}': abs ({nx},{ny}) → relative ({rel_x},{rel_y})"
                f" within section '{parent_id}'"
            )

    return repairs


# ─── Repair 3: Schema V2 Cleanups (Sticky notes & Sequence animations) ─────────

def repair_schema_v2(data: dict) -> list:
    """
    Migrates diagram data to Schema V2:
      1. Purge sticky_note entries from logicalData.nodes (belong in visualData.annotations).
      2. Ensure layoutNodes entry exists for every annotation.
      3. Move animationMode / repeatParticleCount from SequenceStep to VisualDiagram.timelines.
      4. Bump schemaVersion to 2.
    """
    repairs = []
    ld = data.get("logicalData", {})
    vd = data.get("visualData", {})

    # 1. Clean sticky_note from logicalData.nodes
    nodes = ld.get("nodes", [])
    clean_nodes = [n for n in nodes if n.get("type") != "sticky_note" and not (n.get("properties") or {}).get("_visualOnly")]
    if len(clean_nodes) != len(nodes):
        ld["nodes"] = clean_nodes
        repairs.append(f"  ✎  Removed {len(nodes) - len(clean_nodes)} legacy sticky_note entries from logicalData.nodes")

    # 2. Ensure layoutNodes entry exists for every annotation
    annotations = vd.get("annotations", {})
    layout_nodes = vd.setdefault("layoutNodes", {})
    for note_id in annotations:
        if note_id not in layout_nodes:
            layout_nodes[note_id] = {
                "id": note_id,
                "x": 50,
                "y": 50,
                "width": 280,
                "height": 160
            }
            repairs.append(f"  ✎  Annotation '{note_id}': synthesised missing layoutNodes entry at (50, 50)")

    # 3. Move animation fields from sequences to timelines
    sequences = ld.get("sequences", [])
    timelines = vd.setdefault("timelines", {})
    for s in sequences:
        mode = s.pop("animationMode", None)
        count = s.pop("repeatParticleCount", None)
        if mode is not None or count is not None:
            seq_id = s.get("id")
            if seq_id:
                t = timelines.setdefault(seq_id, {"sequenceId": seq_id, "duration": 1000, "delay": 0})
                if mode is not None:
                    t["animationMode"] = mode
                if count is not None:
                    t["repeatParticleCount"] = count
                repairs.append(f"  ✎  Sequence '{seq_id}': moved animation parameters to timelines")

    # 4. Bump schemaVersion
    if data.get("schemaVersion") != 2:
        data["schemaVersion"] = 2
        ld["schemaVersion"] = 2
        repairs.append("  ✎  Bumped schemaVersion to 2")

    return repairs


# ─── Diagram validation ────────────────────────────────────────────────────────

def validate_diagram(data: dict) -> list:
    errors = []

    if data.get("schemaVersion") not in (1, 2):
        errors.append("diagram.json: 'schemaVersion' must be 1 or 2")

    ld = data.get("logicalData")
    if not isinstance(ld, dict):
        errors.append("diagram.json: missing 'logicalData' object")
        return errors

    vd = data.get("visualData")
    if not isinstance(vd, dict):
        errors.append("diagram.json: missing 'visualData' object")
        return errors

    nodes     = ld.get("nodes", [])
    edges     = ld.get("edges", [])
    sequences = ld.get("sequences", [])
    layout_nodes = vd.get("layoutNodes", {})
    layout_edges = vd.get("layoutEdges", {})
    timelines    = vd.get("timelines", {})

    node_ids = {n["id"] for n in nodes if "id" in n}
    edge_ids = {e["id"] for e in edges if "id" in e}
    seq_ids  = {s["id"] for s in sequences if "id" in s}

    for nid in node_ids:
        if nid not in layout_nodes:
            errors.append(f"LogicalNode '{nid}' has no matching VisualNode in layoutNodes")

    for eid in edge_ids:
        if eid not in layout_edges:
            errors.append(f"LogicalEdge '{eid}' has no matching VisualEdge in layoutEdges")

    for e in edges:
        if e.get("sourceId") not in node_ids:
            errors.append(f"Edge '{e.get('id')}': sourceId '{e.get('sourceId')}' not found")
        if e.get("targetId") not in node_ids:
            errors.append(f"Edge '{e.get('id')}': targetId '{e.get('targetId')}' not found")

    for s in sequences:
        if s.get("edgeId") not in edge_ids:
            errors.append(f"Sequence '{s.get('id')}': edgeId '{s.get('edgeId')}' not found")

    for tid, t in timelines.items():
        if t.get("sequenceId") not in seq_ids:
            errors.append(f"Timeline '{tid}': sequenceId '{t.get('sequenceId')}' not found")

    for n in nodes:
        ntype = n.get("type", "")
        if ntype and not ntype.startswith("custom-comp-") and ntype not in VALID_TYPES:
            errors.append(
                f"Node '{n.get('id')}': unknown type '{ntype}'"
                f" (valid: {', '.join(sorted(VALID_TYPES))})"
            )

    # Post-repair handle consistency check
    for le in edges:
        ve = layout_edges.get(le.get("id", ""))
        if not ve:
            continue
        for attr, node_id in [("sourceHandle", le.get("sourceId")), ("targetHandle", le.get("targetId"))]:
            hid = ve.get(attr)
            if not hid or not node_id:
                continue
            vn = layout_nodes.get(node_id)
            if not vn:
                continue
            node_handles = vn.get("handles")
            if node_handles:
                declared = {h["id"] for h in node_handles}
                if hid not in declared:
                    errors.append(
                        f"Edge '{le.get('id')}' {attr} '{hid}' not in node '{node_id}' handles"
                        " (repair failed — check manually)"
                    )
            elif hid not in DEFAULT_HANDLE_IDS:
                errors.append(
                    f"Edge '{le.get('id')}' {attr} '{hid}' is not a default handle"
                    f" and node '{node_id}' has no handles array (repair failed)"
                )

    return errors


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 4:
        print("Usage: pack_dproj.py <output.dproj> <workspace.json> <diagram.json>")
        sys.exit(1)

    output_path    = sys.argv[1]
    workspace_path = sys.argv[2]
    diagram_path   = sys.argv[3]

    if not output_path.endswith(".dproj"):
        output_path += ".dproj"

    for path in (workspace_path, diagram_path):
        if not os.path.exists(path):
            print(f"ERROR: {path} not found")
            sys.exit(1)

    with open(workspace_path, "r", encoding="utf-8") as f:
        try:
            workspace_data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"ERROR: {workspace_path} is not valid JSON: {e}")
            sys.exit(1)

    with open(diagram_path, "r", encoding="utf-8") as f:
        try:
            diagram_data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"ERROR: {diagram_path} is not valid JSON: {e}")
            sys.exit(1)

    # ── Auto-repairs ────────────────────────────────────────────────────────
    all_repairs = []
    coord_repairs = repair_section_coordinates(diagram_data)
    all_repairs.extend(coord_repairs)
    schema_repairs = repair_schema_v2(diagram_data)
    all_repairs.extend(schema_repairs)
    handle_repairs = repair_handles(diagram_data)
    all_repairs.extend(handle_repairs)

    if all_repairs:
        print(f"Auto-repaired {len(all_repairs)} issue(s):")
        for r in all_repairs:
            print(r)
        print()

    # ── Validate ────────────────────────────────────────────────────────────
    ws_errors   = validate_workspace(workspace_data)
    diag_errors = validate_diagram(diagram_data)
    all_errors  = ws_errors + diag_errors

    if all_errors:
        print(f"Validation found {len(all_errors)} error(s):")
        for err in all_errors:
            print(f"  ✗ {err}")
        sys.exit(1)

    # ── Pack ────────────────────────────────────────────────────────────────
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("workspace.json", json.dumps(workspace_data, indent=2, ensure_ascii=False))
        zf.writestr("diagram.json",   json.dumps(diagram_data,   indent=2, ensure_ascii=False))

    abs_path = os.path.abspath(output_path)
    size_kb  = os.path.getsize(abs_path) / 1024

    ld      = diagram_data["logicalData"]
    n_nodes = len(ld.get("nodes", []))
    n_edges = len(ld.get("edges", []))
    n_seqs  = len(ld.get("sequences", []))

    print(f"✓ Created {abs_path} ({size_kb:.1f} KB)")
    print(f"  {n_nodes} nodes, {n_edges} edges, {n_seqs} sequences")


if __name__ == "__main__":
    main()
