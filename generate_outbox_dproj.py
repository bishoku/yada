import zipfile, json, io, os

workspace_meta = {
  "name": "Outbox Transaction Pattern",
  "description": "Visualizes the Transactional Outbox pattern for reliable event publishing",
  "path": "virtual://workspace/imported",
  "lastModified": "2026-07-18T14:00:00.000Z"
}

diagram_data = {
  "schemaVersion": 1,
  "logicalData": {
    "schemaVersion": 1,
    "nodes": [
      { "id": "client", "type": "client", "name": "User / Client App" },
      { "id": "order-svc", "type": "server", "name": "Order Service" },
      { "id": "order-db", "type": "database", "name": "Order DB\n(orders, outbox)" },
      { "id": "msg-relay", "type": "server", "name": "Message Relay\n(CDC / Poller)" },
      { "id": "event-bus", "type": "queue", "name": "Event Bus (Kafka)" },
      { "id": "billing-svc", "type": "server", "name": "Billing Service" },
      { "id": "billing-db", "type": "database", "name": "Billing DB" }
    ],
    "edges": [
      { "id": "e1", "sourceId": "client", "targetId": "order-svc", "isAsync": False, "protocol": "HTTP", "description": "POST /orders" },
      { "id": "e2", "sourceId": "order-svc", "targetId": "order-db", "isAsync": False, "protocol": "SQL", "description": "Atomic TX: Insert Order + Outbox" },
      { "id": "e4", "sourceId": "msg-relay", "targetId": "order-db", "isAsync": False, "protocol": "SQL", "description": "Poll Outbox / CDC Log" },
      { "id": "e5", "sourceId": "msg-relay", "targetId": "event-bus", "isAsync": True, "protocol": "Kafka", "description": "Publish Event" },
      { "id": "e6", "sourceId": "msg-relay", "targetId": "order-db", "isAsync": False, "protocol": "SQL", "description": "Delete Published Event" },
      { "id": "e7", "sourceId": "event-bus", "targetId": "billing-svc", "isAsync": True, "protocol": "Kafka", "description": "Consume Event" },
      { "id": "e8", "sourceId": "billing-svc", "targetId": "billing-db", "isAsync": False, "protocol": "SQL", "description": "Update Billing" }
    ],
    "sequences": [
      { "id": "seq-1", "stepNumber": 1, "edgeId": "e1", "isAsync": False, "isRoundTrip": True },
      { "id": "seq-2", "stepNumber": 2, "edgeId": "e2", "isAsync": False, "isRoundTrip": True },
      { "id": "seq-3", "stepNumber": 3, "edgeId": "e4", "isAsync": False, "isRoundTrip": True },
      { "id": "seq-4", "stepNumber": 4, "edgeId": "e5", "isAsync": True },
      { "id": "seq-5", "stepNumber": 5, "edgeId": "e6", "isAsync": False, "isRoundTrip": True },
      { "id": "seq-6", "stepNumber": 5, "edgeId": "e7", "isAsync": True },
      { "id": "seq-7", "stepNumber": 6, "edgeId": "e8", "isAsync": False, "isRoundTrip": True }
    ]
  },
  "visualData": {
    "canvas": { "zoom": 0.85, "pan": { "x": 50, "y": 50 }, "gridVisible": True },
    "layoutNodes": {
      "client":        { "id": "client",      "x": 0,   "y": 150, "width": 224, "height": 52, "theme": "indigo" },
      "order-svc":     { "id": "order-svc",   "x": 350, "y": 150, "width": 224, "height": 52, "theme": "amber" },
      "order-db":      { "id": "order-db",    "x": 700, "y": 150, "width": 224, "height": 70, "theme": "rose" },
      "msg-relay":     { "id": "msg-relay",   "x": 700, "y": 350, "width": 224, "height": 70, "theme": "emerald" },
      "event-bus":     { "id": "event-bus",   "x": 1050, "y": 350, "width": 224, "height": 52, "theme": "violet" },
      "billing-svc":   { "id": "billing-svc", "x": 1400, "y": 350, "width": 224, "height": 52, "theme": "amber" },
      "billing-db":    { "id": "billing-db",  "x": 1400, "y": 150, "width": 224, "height": 52, "theme": "rose" }
    },
    "layoutEdges": {
      "e1": { "id": "e1", "sourceHandle": "right:50", "targetHandle": "left:50", "particleType": "rest", "showArrow": True },
      "e2": { "id": "e2", "sourceHandle": "right:50", "targetHandle": "left:50", "particleType": "sql", "showArrow": True },
      "e4": { "id": "e4", "sourceHandle": "top:70", "targetHandle": "bottom:70", "particleType": "sql", "showArrow": True },
      "e5": { "id": "e5", "sourceHandle": "right:50", "targetHandle": "left:50", "particleType": "kafka", "showArrow": True },
      "e6": { "id": "e6", "sourceHandle": "top:30", "targetHandle": "bottom:30", "particleType": "sql", "showArrow": True },
      "e7": { "id": "e7", "sourceHandle": "right:50", "targetHandle": "left:50", "particleType": "kafka", "showArrow": True },
      "e8": { "id": "e8", "sourceHandle": "top:50", "targetHandle": "bottom:50", "particleType": "sql", "showArrow": True }
    },
    "timelines": {
      "seq-1": { "sequenceId": "seq-1", "duration": 1000, "delay": 0 },
      "seq-2": { "sequenceId": "seq-2", "duration": 1000, "delay": 1000, "internalProcess": { "text": "BEGIN; INSERT order; INSERT outbox; COMMIT;", "duration": 800 } },
      "seq-3": { "sequenceId": "seq-3", "duration": 800,  "delay": 2500, "internalProcess": { "text": "Poll outbox table", "duration": 600 } },
      "seq-4": { "sequenceId": "seq-4", "duration": 600,  "delay": 3300 },
      "seq-5": { "sequenceId": "seq-5", "duration": 600,  "delay": 3900, "internalProcess": { "text": "Delete outbox row", "duration": 400 } },
      "seq-6": { "sequenceId": "seq-6", "duration": 600,  "delay": 3900 },
      "seq-7": { "sequenceId": "seq-7", "duration": 800,  "delay": 4500, "internalProcess": { "text": "Process & Update", "duration": 600 } }
    },
    "annotations": {
      "note-outbox": {
        "id": "note-outbox",
        "header": "Transactional Outbox Pattern",
        "body": "Solves the dual-write problem. 1. Service writes business data AND an outbox event in ONE database transaction. 2. A separate process reads the outbox table and publishes events to the bus reliably.",
        "style": {
          "backgroundColor": "#eff6ff",
          "borderColor": "#3b82f6",
          "textColor": "#1e3a5f",
          "fontFamily": "Inter",
          "fontSize": 14,
          "borderRadius": 8,
          "opacity": 0.95,
          "shadow": True
        },
        "startTime": 0,
        "endTime": 8000,
        "alwaysVisible": True
      }
    }
  }
}

buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('workspace.json', json.dumps(workspace_meta, indent=2))
    zf.writestr('diagram.json', json.dumps(diagram_data, indent=2))

output_path = '/Users/barishoku/devel/diagramer/outbox-pattern.dproj'
with open(output_path, 'wb') as f:
    f.write(buf.getvalue())
print(f"Created {output_path}")
