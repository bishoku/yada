#!/usr/bin/env python3
"""
build_share_url.py — Validates diagram.json and produces a shareable YADA preview URL.

Usage:
  python build_share_url.py <diagram.json> --name "Diagram Title" [--description "..."] [--output-md path]

The diagram.json must contain both logicalData and visualData at the top level
(same structure used by pack_dproj.py).

The script writes the clickable URL to a markdown file (default: generated_link.md
in the current working directory) and prints only a short confirmation to stdout.
This avoids sending the full compressed URL back through LLM context, saving tokens.

Auto-repairs from pack_dproj.py are applied before compression.
If the resulting URL exceeds 32,000 characters, an error message is printed
suggesting the user fall back to .dproj export instead.
"""

import sys
import json
import os
import math
import argparse
from datetime import datetime, timezone

# ─── Import validation/repair from pack_dproj.py ──────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from pack_dproj import (
    repair_handles,
    repair_section_coordinates,
    repair_schema_v2,
    validate_diagram,
)

# ─── Embedded LZString compressToEncodedURIComponent (Pure Python) ─────────────
# Port of lz-string v1.5.0 by pieroxy (MIT License).
# Only the compressToEncodedURIComponent function is implemented here,
# which is what YADA's shareUtils.ts uses on the JS side.

_KEY_STR_URI_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$"


def _compress(uncompressed, bits_per_char, get_char_from_int):
    """Core LZ-based compression algorithm matching lz-string JS implementation."""
    if uncompressed is None:
        return ""
    if not uncompressed:
        return get_char_from_int(0)

    context_dictionary = {}
    context_dictionary_to_create = {}
    context_w = ""
    context_enlarge_in = 2
    context_dict_size = 3
    context_num_bits = 2
    context_data = []
    context_data_val = 0
    context_data_position = 0

    for ii in range(len(uncompressed)):
        context_c = uncompressed[ii]
        if context_c not in context_dictionary:
            context_dictionary[context_c] = context_dict_size
            context_dict_size += 1
            context_dictionary_to_create[context_c] = True

        context_wc = context_w + context_c
        if context_wc in context_dictionary:
            context_w = context_wc
        else:
            if context_w in context_dictionary_to_create:
                if ord(context_w[0]) < 256:
                    for _ in range(context_num_bits):
                        context_data_val = (context_data_val << 1)
                        if context_data_position == bits_per_char - 1:
                            context_data_position = 0
                            context_data.append(get_char_from_int(context_data_val))
                            context_data_val = 0
                        else:
                            context_data_position += 1
                    value = ord(context_w[0])
                    for _ in range(8):
                        context_data_val = (context_data_val << 1) | (value & 1)
                        if context_data_position == bits_per_char - 1:
                            context_data_position = 0
                            context_data.append(get_char_from_int(context_data_val))
                            context_data_val = 0
                        else:
                            context_data_position += 1
                        value = value >> 1
                else:
                    value = 1
                    for _ in range(context_num_bits):
                        context_data_val = (context_data_val << 1) | value
                        if context_data_position == bits_per_char - 1:
                            context_data_position = 0
                            context_data.append(get_char_from_int(context_data_val))
                            context_data_val = 0
                        else:
                            context_data_position += 1
                        value = 0
                    value = ord(context_w[0])
                    for _ in range(16):
                        context_data_val = (context_data_val << 1) | (value & 1)
                        if context_data_position == bits_per_char - 1:
                            context_data_position = 0
                            context_data.append(get_char_from_int(context_data_val))
                            context_data_val = 0
                        else:
                            context_data_position += 1
                        value = value >> 1

                context_enlarge_in -= 1
                if context_enlarge_in == 0:
                    context_enlarge_in = 2 ** context_num_bits
                    context_num_bits += 1
                del context_dictionary_to_create[context_w]
            else:
                value = context_dictionary[context_w]
                for _ in range(context_num_bits):
                    context_data_val = (context_data_val << 1) | (value & 1)
                    if context_data_position == bits_per_char - 1:
                        context_data_position = 0
                        context_data.append(get_char_from_int(context_data_val))
                        context_data_val = 0
                    else:
                        context_data_position += 1
                    value = value >> 1

            context_enlarge_in -= 1
            if context_enlarge_in == 0:
                context_enlarge_in = 2 ** context_num_bits
                context_num_bits += 1

            context_dictionary[context_wc] = context_dict_size
            context_dict_size += 1
            context_w = context_c

    # Output the code for w
    if context_w:
        if context_w in context_dictionary_to_create:
            if ord(context_w[0]) < 256:
                for _ in range(context_num_bits):
                    context_data_val = (context_data_val << 1)
                    if context_data_position == bits_per_char - 1:
                        context_data_position = 0
                        context_data.append(get_char_from_int(context_data_val))
                        context_data_val = 0
                    else:
                        context_data_position += 1
                value = ord(context_w[0])
                for _ in range(8):
                    context_data_val = (context_data_val << 1) | (value & 1)
                    if context_data_position == bits_per_char - 1:
                        context_data_position = 0
                        context_data.append(get_char_from_int(context_data_val))
                        context_data_val = 0
                    else:
                        context_data_position += 1
                    value = value >> 1
            else:
                value = 1
                for _ in range(context_num_bits):
                    context_data_val = (context_data_val << 1) | value
                    if context_data_position == bits_per_char - 1:
                        context_data_position = 0
                        context_data.append(get_char_from_int(context_data_val))
                        context_data_val = 0
                    else:
                        context_data_position += 1
                    value = 0
                value = ord(context_w[0])
                for _ in range(16):
                    context_data_val = (context_data_val << 1) | (value & 1)
                    if context_data_position == bits_per_char - 1:
                        context_data_position = 0
                        context_data.append(get_char_from_int(context_data_val))
                        context_data_val = 0
                    else:
                        context_data_position += 1
                    value = value >> 1
            context_enlarge_in -= 1
            if context_enlarge_in == 0:
                context_enlarge_in = 2 ** context_num_bits
                context_num_bits += 1
            del context_dictionary_to_create[context_w]
        else:
            value = context_dictionary[context_w]
            for _ in range(context_num_bits):
                context_data_val = (context_data_val << 1) | (value & 1)
                if context_data_position == bits_per_char - 1:
                    context_data_position = 0
                    context_data.append(get_char_from_int(context_data_val))
                    context_data_val = 0
                else:
                    context_data_position += 1
                value = value >> 1

    # Mark the end of the stream — value = 2 (end-of-stream marker)
    value = 2
    for _ in range(context_num_bits):
        context_data_val = (context_data_val << 1) | (value & 1)
        if context_data_position == bits_per_char - 1:
            context_data_position = 0
            context_data.append(get_char_from_int(context_data_val))
            context_data_val = 0
        else:
            context_data_position += 1
        value = value >> 1

    # Flush the last char
    while True:
        context_data_val = (context_data_val << 1)
        if context_data_position == bits_per_char - 1:
            context_data.append(get_char_from_int(context_data_val))
            break
        else:
            context_data_position += 1

    return "".join(context_data)


def compress_to_encoded_uri_component(input_str):
    """
    Compress a string to an encoded URI component — mirrors
    LZString.compressToEncodedURIComponent() in JavaScript.
    """
    if input_str is None:
        return ""
    return _compress(input_str, 6, lambda a: _KEY_STR_URI_SAFE[a])


# ─── Constants ─────────────────────────────────────────────────────────────────

BASE_URL = "https://bishoku.github.io/yada/"
MAX_URL_LENGTH = 32000  # Safe limit for modern browsers (hash fragments)


# ─── Main ──────────────────────────────────────────────────────────────────────

DEFAULT_OUTPUT_FILENAME = "generated_link.md"


def main():
    parser = argparse.ArgumentParser(
        description="Validate diagram.json and produce a shareable YADA preview URL.",
        epilog="The URL is written to a markdown file (not stdout) to avoid "
               "sending compressed data back through LLM context.",
    )
    parser.add_argument(
        "diagram",
        help="Path to diagram.json (must contain logicalData + visualData)",
    )
    parser.add_argument(
        "--name",
        required=True,
        help="Human-readable name for the diagram (e.g. 'CQRS Pattern')",
    )
    parser.add_argument(
        "--description",
        default="",
        help="Short description of the diagram architecture",
    )
    parser.add_argument(
        "--output-md",
        default=None,
        help=f"Path for the output markdown file (default: ./{DEFAULT_OUTPUT_FILENAME})",
    )
    args = parser.parse_args()

    diagram_path = args.diagram
    output_path = args.output_md or os.path.join(os.getcwd(), DEFAULT_OUTPUT_FILENAME)

    if not os.path.exists(diagram_path):
        print(f"ERROR: {diagram_path} not found")
        sys.exit(1)

    with open(diagram_path, "r", encoding="utf-8") as f:
        try:
            diagram_data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"ERROR: {diagram_path} is not valid JSON: {e}")
            sys.exit(1)

    # Validate basic structure
    if "logicalData" not in diagram_data:
        print("ERROR: diagram.json missing 'logicalData' object")
        sys.exit(1)
    if "visualData" not in diagram_data:
        print("ERROR: diagram.json missing 'visualData' object")
        sys.exit(1)

    # ── Auto-repairs (same as pack_dproj.py) ───────────────────────────────
    all_repairs = []
    all_repairs.extend(repair_section_coordinates(diagram_data))
    all_repairs.extend(repair_schema_v2(diagram_data))
    all_repairs.extend(repair_handles(diagram_data))

    if all_repairs:
        print(f"Auto-repaired {len(all_repairs)} issue(s):", file=sys.stderr)
        for r in all_repairs:
            print(r, file=sys.stderr)
        print(file=sys.stderr)

    # ── Validate ───────────────────────────────────────────────────────────
    errors = validate_diagram(diagram_data)
    if errors:
        print(f"Validation found {len(errors)} error(s):", file=sys.stderr)
        for err in errors:
            print(f"  ✗ {err}", file=sys.stderr)
        sys.exit(1)

    # ── Build share payload ────────────────────────────────────────────────
    share_payload = {
        "logicalData": diagram_data["logicalData"],
        "visualData": diagram_data["visualData"],
        "currentView": "diagram",
    }

    # ── Compress & build URL ───────────────────────────────────────────────
    json_str = json.dumps(share_payload, ensure_ascii=False, separators=(",", ":"))
    compressed = compress_to_encoded_uri_component(json_str)
    url = f"{BASE_URL}#share={compressed}"

    ld = diagram_data["logicalData"]
    n_nodes = len(ld.get("nodes", []))
    n_edges = len(ld.get("edges", []))

    if len(url) > MAX_URL_LENGTH:
        print(
            f"ERROR: Generated URL is {len(url):,} characters, exceeding the "
            f"{MAX_URL_LENGTH:,} character safe limit for browser URLs.\n"
            f"\n"
            f"This diagram is too large for a preview URL ({n_nodes} nodes, {n_edges} edges).\n"
            f"Please use pack_dproj.py to generate a .dproj file instead:\n"
            f"  python {SCRIPT_DIR}/pack_dproj.py output.dproj workspace.json {diagram_path}",
            file=sys.stderr,
        )
        sys.exit(1)

    # ── Write markdown file ────────────────────────────────────────────────
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    md_content = f"""# 🔗 {args.name}

{args.description}

**[▶ Open in YADA]({url})**

| Detail | Value |
|--------|-------|
| Nodes | {n_nodes} |
| Edges | {n_edges} |
| URL Size | {len(url):,} chars |
| Generated | {timestamp} |
"""

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    # ── Stdout: short confirmation only (no URL data) ─────────────────────
    abs_output = os.path.abspath(output_path)
    print(
        f"✓ Preview URL saved to {abs_output}\n"
        f"  ({n_nodes} nodes, {n_edges} edges, {len(url):,} chars)"
    )


if __name__ == "__main__":
    main()
