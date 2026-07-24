use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::Utc;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LlmProfile {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub api_url: String,
    pub api_key: String,
    pub model: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LlmPreferences {
    pub active_profile_id: Option<String>,
    pub profiles: Option<Vec<LlmProfile>>,
    pub provider: String, // "openrouter", "openai", "gemini", "anthropic"
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    pub short_term_memory_limit: usize,
}

impl Default for LlmPreferences {
    fn default() -> Self {
        Self {
            active_profile_id: Some("openrouter-default".to_string()),
            profiles: None,
            provider: "openrouter".to_string(),
            api_url: "https://openrouter.ai/api/v1".to_string(),
            api_key: "".to_string(),
            model: "anthropic/claude-3.5-sonnet".to_string(),
            short_term_memory_limit: 20,
        }
    }
}


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub sender: String, // "user" | "assistant" | "system"
    pub text: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ChatMemory {
    pub diagram_summary: String,
    pub short_term_messages: Vec<ChatMessage>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DiagramPatchResponse {
    pub message: String,
    pub updated_logical: Option<serde_json::Value>,
    pub updated_visual: Option<serde_json::Value>,
    pub summary: Option<String>,
}

pub fn get_chat_memory_file(workspace_path: &str, diagram_id: &str) -> std::path::PathBuf {
    let ws_path = Path::new(workspace_path);
    let diagrams_dir = ws_path.join("diagrams");
    diagrams_dir.join(format!("{}_chat_memory.json", diagram_id))
}

pub fn load_chat_memory(workspace_path: &str, diagram_id: &str) -> ChatMemory {
    let file_path = get_chat_memory_file(workspace_path, diagram_id);
    if file_path.exists() {
        if let Ok(content) = fs::read_to_string(&file_path) {
            if let Ok(mem) = serde_json::from_str::<ChatMemory>(&content) {
                return mem;
            }
        }
    }
    ChatMemory::default()
}

pub fn save_chat_memory(workspace_path: &str, diagram_id: &str, memory: &ChatMemory) -> Result<(), String> {
    let file_path = get_chat_memory_file(workspace_path, diagram_id);
    if let Some(parent) = file_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json_content = serde_json::to_string_pretty(memory).map_err(|e| e.to_string())?;
    fs::write(file_path, json_content).map_err(|e| format!("Failed to write memory file: {}", e))?;
    Ok(())
}

const SYSTEM_PROMPT: &str = r##"
You are YADA AI Assistant, an expert software architecture modeling and flow simulation agent embedded in YADA diagramming application.

Your goal is to converse with the user, answer questions about the current architecture, and generate or update both the LOGICAL topology and the VISUAL layout & simulation timelines according to YADA specifications.

==================================================
DATA MODEL ARCHITECTURE (SCHEMA VERSION 2)
==================================================
YADA uses two complementary layers — BOTH ARE REQUIRED IN YOUR OUTPUT:
1. `updatedLogical` (Topology, Semantics & Execution Flow)
2. `updatedVisual` (Layout, Coordinates, Icons, Edge Handles, and Sequence Timelines)

--------------------------------------------------
1. LOGICAL MODEL (`updatedLogical`)
--------------------------------------------------
{
  "schemaVersion": 2,
  "nodes": [
    { "id": "n-gw", "type": "gateway", "name": "API Gateway" },
    { "id": "n-order", "type": "server", "name": "Order Service", "parentId": "s-svc" },
    { "id": "n-pay", "type": "server", "name": "Payment Service", "parentId": "s-svc" },
    { "id": "s-svc", "type": "section", "name": "Backend Services" }
  ],
  "edges": [
    { "id": "e1", "sourceId": "n-gw", "targetId": "n-order", "isAsync": false, "protocol": "HTTP", "description": "POST /order" },
    { "id": "e2", "sourceId": "n-order", "targetId": "n-pay", "isAsync": false, "protocol": "gRPC", "description": "Process Payment" }
  ],
  "sequences": [
    { "id": "s1", "stepNumber": 1, "edgeId": "e1", "isAsync": false, "isRoundTrip": true },
    { "id": "s2", "stepNumber": 2, "edgeId": "e2", "isAsync": false, "isRoundTrip": true }
  ]
}

Rules for Logical Nodes:
- `type` MUST BE ONLY ONE OF: "client", "load_balancer", "gateway", "server", "database", "cache", "queue", "firewall", "section".
- "server" is the catch-all for microservices and backend applications. Do NOT invent new node types.
- "section" nodes group children. Child nodes set `parentId` to the section's ID.

Rules for Logical Edges:
- `isAsync`: true for fire-and-forget/event-driven communication; false for synchronous request-response.
- `protocol`: e.g. "HTTP", "gRPC", "Kafka", "SQL", "WebSocket".
- `description`: label for the action or payload e.g. "POST /order", "OrderCreated", "SELECT *".

Rules for Sequence Steps:
- `stepNumber`: 1, 2, 3... steps with the same stepNumber execute in parallel.
- `isRoundTrip`: true for sync request-response (animates A -> B -> A).

--------------------------------------------------
2. VISUAL MODEL (`updatedVisual`)
--------------------------------------------------
{
  "canvas": { "zoom": 1, "pan": { "x": 0, "y": 0 }, "gridVisible": true, "bgColor": null },
  "layoutNodes": {
    "n-gw":   { "id": "n-gw",   "x": 0,   "y": 100, "width": 224, "height": 52, "theme": "emerald", "customStyles": { "productIcon": "react", "productIconColored": true } },
    "s-svc":  { "id": "s-svc",  "x": 310, "y": 20,  "width": 640, "height": 240, "zIndex": -1, "theme": "amber" },
    "n-order":{ "id": "n-order","x": 40,  "y": 40,  "width": 224, "height": 52, "theme": "amber", "customStyles": { "productIcon": "spring", "productIconColored": true } },
    "n-pay":  { "id": "n-pay",  "x": 350, "y": 40,  "width": 224, "height": 52, "theme": "amber", "customStyles": { "productIcon": "go", "productIconColored": true } }
  },
  "layoutEdges": {
    "e1": { "id": "e1", "sourceHandle": "right:50", "targetHandle": "left:50", "particleType": "rest", "showArrow": true },
    "e2": { "id": "e2", "sourceHandle": "right:50", "targetHandle": "left:50", "particleType": "grpc", "showArrow": true }
  },
  "timelines": {
    "s1": { "sequenceId": "s1", "duration": 800, "delay": 0, "animationMode": "roundTrip", "internalProcess": { "text": "Routing request", "duration": 300 } },
    "s2": { "sequenceId": "s2", "duration": 600, "delay": 800, "animationMode": "roundTrip", "internalProcess": { "text": "Executing payment", "duration": 250 } }
  },
  "annotations": {}
}

Rules for Visual Nodes (`layoutNodes`):
- Node Themes:
  * "indigo" -> clients
  * "emerald" -> gateways & load balancers
  * "amber" -> servers & microservices
  * "rose" -> databases
  * "violet" -> queues / event buses
  * "cyan" -> caches

==================================================
CRITICAL SECTION NODE & COORDINATE RULES
==================================================
1. SECTION NODE POSITIONING:
   - Section nodes MUST set `zIndex: -1` in `layoutNodes`.
   - Section `x` and `y` are the ABSOLUTE canvas top-left coordinates of the section box (e.g. `x: 310, y: 20`).
   - Section `width` and `height` MUST be large enough to enclose all child nodes + 40px padding on all sides (e.g. `width: 640, height: 240`).

2. CHILD NODE COORDINATES (SECTION-RELATIVE):
   - Any node with a `parentId` MUST use **SECTION-RELATIVE COORDINATES** — where (0,0) is the section box's top-left corner!
   - FORMULA:
     `child.x = absolute_canvas_x - section.x`
     `child.y = absolute_canvas_y - section.y`
   - EXAMPLE:
     Section `s-svc` is placed at absolute canvas `(x: 310, y: 20)`.
     Child `n-order` should appear at absolute canvas `(x: 350, y: 60)` -> set `n-order` `"x": 40, "y": 40` (`350 - 310 = 40`, `60 - 20 = 40`).
     Child `n-pay` should appear at absolute canvas `(x: 660, y: 60)` -> set `n-pay` `"x": 350, "y": 40` (`660 - 310 = 350`, `60 - 20 = 40`).
   - 🚨 CRITICAL: NEVER put absolute canvas coordinates (`350`, `700`) on a node that has `parentId`! Child `x` and `y` MUST be small relative offsets (e.g. `40`, `350`).

- Rich Product Icons (`customStyles`): Set `productIcon` (e.g. "postgresql", "redis", "kafka", "docker", "kubernetes", "aws", "react", "java", "python", "go", "mongodb", "rabbitmq", "spring") and `productIconColored: true`.

Rules for Layout Grid (Avoid Overlap):
- Columns (X): Col 0 = 0, Col 1 = 350, Col 2 = 700, Col 3 = 1050
- Rows (Y): Row 0 = 0, Row 1 = 150, Row 2 = 300
- Standard node size: 224 x 52px.

Rules for Visual Edges (`layoutEdges`):
- Handles format: "side:offset" e.g. "right:50", "left:50", "top:50", "bottom:50".
- For Left-to-Right layout: sourceHandle = "right:50", targetHandle = "left:50".
- Particle types: "dot", "arrow", "envelope", "rest", "grpc", "ws", "graphql", "kafka", "pkg", "sql".

Rules for Timelines & Flow Simulation (`timelines`):
- Every `SequenceStep` in `logicalData.sequences` MUST have a matching `TimelineTiming` entry keyed by sequence ID in `visualData.timelines`.
- `delay`: Cumulative start time in milliseconds.
  * Sequential steps: `delay[i] = delay[i-1] + duration[i-1]`
  * Parallel steps (same stepNumber): same `delay`.
- `duration`: Transition duration in ms (500ms - 1200ms typical).
- `animationMode`: "normal", "roundTrip", or "repeat".

Rules for Sticky Notes (`annotations`):
Sticky notes belong exclusively in `visualData` and require BOTH:
1. `visualData.annotations[id]`: {
     "id": "note-1", "header": "Note Title", "body": "Content markdown",
     "style": { "backgroundColor": "#0f172a", "borderColor": "#6366f1", "textColor": "#e2e8f0", "fontFamily": "Inter", "fontSize": 12, "borderRadius": 8, "opacity": 0.95 },
     "startTime": 0, "endTime": 9999, "alwaysVisible": true
   }
2. `visualData.layoutNodes[id]`: { "id": "note-1", "x": 100, "y": 200, "width": 260, "height": 160 }
Sticky notes must NOT be added to `logicalData.nodes` or `logicalData.edges`.


==================================================
PRE-FLIGHT CHECKLIST (MUST VERIFY BEFORE OUTPUT)
==================================================
1. `schemaVersion` is 2 in `updatedLogical`.
2. Every node in `updatedLogical.nodes` has an entry in `updatedVisual.layoutNodes`.
3. Every edge in `updatedLogical.edges` has an entry in `updatedVisual.layoutEdges`.
4. Every sequence in `updatedLogical.sequences` has a timeline timing in `updatedVisual.timelines`.
5. Handles use valid standard format ("right:50", "left:50", "top:50", "bottom:50").
6. Sequential step timelines accumulate delay: delay[i] = delay[i-1] + duration[i-1].
7. Nodes with `parentId` use SECTION-RELATIVE coordinates (e.g., x: 40, y: 40), NOT absolute canvas coordinates, and the section node has zIndex: -1.

==================================================
REQUIRED JSON OUTPUT FORMAT & CHAT TEXT FORMATTING
==================================================
- Write the `message` field in clean Markdown format (use bold, lists, inline code blocks).
- Do NOT use LaTeX math symbols, LaTeX macros, or dollar-sign formulas (e.g. NEVER output `$\rightarrow$` or `\rightarrow`). Use standard Unicode symbols instead (e.g. '→', '←', '⇒').

Respond ONLY with a valid JSON object matching this schema:
{
  "message": "Markdown response explaining changes, architecture design rationale, or answers.",
  "updatedLogical": { "schemaVersion": 2, "nodes": [...], "edges": [...], "sequences": [...] },
  "updatedVisual": { "canvas": {"zoom": 1, "pan": {"x":0,"y":0}}, "layoutNodes": {...}, "layoutEdges": {...}, "timelines": {...}, "annotations": {} },
  "summary": "1-2 sentence high-level summary of what this diagram architecture does."
}

If user asks off-topic non-architecture questions, decline politely.
"##;





pub async fn execute_agent_chat(
    prefs: &LlmPreferences,
    current_logical: serde_json::Value,
    current_visual: serde_json::Value,
    mut memory: ChatMemory,
    user_message: String,
) -> Result<(DiagramPatchResponse, ChatMemory), String> {
    let active_profile = prefs.profiles.as_ref().and_then(|list| {
        if let Some(ref id) = prefs.active_profile_id {
            list.iter().find(|p| p.id == *id).cloned()
        } else {
            list.first().cloned()
        }
    });

    let active_provider = active_profile.as_ref().map(|p| p.provider.clone()).unwrap_or_else(|| prefs.provider.clone());
    let active_api_url = active_profile.as_ref().map(|p| p.api_url.clone()).unwrap_or_else(|| prefs.api_url.clone());
    let active_api_key = active_profile.as_ref().map(|p| p.api_key.clone()).unwrap_or_else(|| prefs.api_key.clone());
    let active_model = active_profile.as_ref().map(|p| p.model.clone()).unwrap_or_else(|| prefs.model.clone());


    if active_api_key.trim().is_empty() {
        return Err("API key is not configured. Please set your API key in Preferences.".to_string());
    }

    let user_msg_struct = ChatMessage {
        id: Uuid::new_v4().to_string(),
        sender: "user".to_string(),
        text: user_message.clone(),
        timestamp: Utc::now().to_rfc3339(),
    };
    memory.short_term_messages.push(user_msg_struct);

    // Build context prompt including diagram summary and current logical/visual JSON
    let history_str = memory.short_term_messages
        .iter()
        .map(|m| format!("{}: {}", m.sender, m.text))
        .collect::<Vec<String>>()
        .join("\n");

    let prompt_payload = format!(
        "{}\n\nCURRENT DIAGRAM SUMMARY:\n{}\n\nCURRENT LOGICAL DATA:\n{}\n\nCURRENT VISUAL DATA:\n{}\n\nCONVERSATION HISTORY:\n{}\n\nUSER PROMPT:\n{}",
        SYSTEM_PROMPT,
        if memory.diagram_summary.is_empty() { "Empty diagram" } else { &memory.diagram_summary },
        serde_json::to_string(&current_logical).unwrap_or_default(),
        serde_json::to_string(&current_visual).unwrap_or_default(),
        history_str,
        user_message
    );

    // Call LLM Provider using HTTP reqwest supporting OpenRouter, OpenAI, Anthropic, and Gemini natively
    let client = reqwest::Client::new();
    let provider = active_provider.to_lowercase();

    let raw_text = match provider.as_str() {
        "anthropic" => {
            let base_url = if active_api_url.trim().is_empty() {
                "https://api.anthropic.com/v1".to_string()
            } else {
                active_api_url.trim_end_matches('/').to_string()
            };
            let url = if base_url.ends_with("/messages") { base_url } else { format!("{}/messages", base_url) };

            let body = serde_json::json!({
                "model": active_model,
                "max_tokens": 4096,
                "system": SYSTEM_PROMPT,
                "messages": [
                    { "role": "user", "content": prompt_payload }
                ]
            });

            let res = client
                .post(&url)
                .header("x-api-key", &active_api_key)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("HTTP Request failed: {}", e))?;

            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Anthropic Provider Error: {}", err_text));
            }

            let res_json: serde_json::Value = res
                .json()
                .await
                .map_err(|e| format!("Failed to parse Anthropic response JSON: {}", e))?;

            res_json["content"][0]["text"]
                .as_str()
                .ok_or_else(|| "No content in Anthropic response".to_string())?
                .to_string()
        }

        "gemini" => {
            let model_name = if active_model.is_empty() { "gemini-1.5-pro" } else { &active_model };
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                model_name, active_api_key
            );

            let body = serde_json::json!({
                "contents": [
                    {
                        "parts": [
                            { "text": format!("{}\n\n{}", SYSTEM_PROMPT, prompt_payload) }
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            });

            let res = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await

                .map_err(|e| format!("HTTP Request failed: {}", e))?;

            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Gemini Provider Error: {}", err_text));
            }

            let res_json: serde_json::Value = res
                .json()
                .await
                .map_err(|e| format!("Failed to parse Gemini response JSON: {}", e))?;

            res_json["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .ok_or_else(|| "No content in Gemini response".to_string())?
                .to_string()
        }

        _ => {
            // Default: OpenAI / OpenRouter / OpenAI-compatible
            let default_url = if provider == "openai" {
                "https://api.openai.com/v1/chat/completions"
            } else {
                "https://openrouter.ai/api/v1/chat/completions"
            };

            let url = if active_api_url.trim().is_empty() {
                default_url.to_string()
            } else if active_api_url.ends_with("/chat/completions") {
                active_api_url.clone()
            } else {
                format!("{}/chat/completions", active_api_url.trim_end_matches('/'))
            };

            let body = serde_json::json!({
                "model": active_model,
                "response_format": { "type": "json_object" },
                "messages": [
                    { "role": "system", "content": SYSTEM_PROMPT },
                    { "role": "user", "content": prompt_payload }
                ]
            });

            let res = client
                .post(&url)
                .header("Authorization", format!("Bearer {}", active_api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("HTTP Request failed: {}", e))?;

            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("LLM Provider Error: {}", err_text));
            }

            let res_json: serde_json::Value = res
                .json()
                .await
                .map_err(|e| format!("Failed to parse LLM response JSON: {}", e))?;

            res_json["choices"][0]["message"]["content"]
                .as_str()
                .ok_or_else(|| "No content in LLM response choice".to_string())?
                .to_string()
        }
    };


    let content = &raw_text;


    // Clean up response if wrapped in ```json ``` markdown codeblocks
    let clean_content = content
        .trim()
        .strip_prefix("```json")
        .unwrap_or(content)
        .strip_prefix("```")
        .unwrap_or(content)
        .strip_suffix("```")
        .unwrap_or(content)
        .trim();

    let patch_resp: DiagramPatchResponse = serde_json::from_str(clean_content)
        .map_err(|e| format!("Failed to parse patch response JSON: {}. Content was: {}", e, clean_content))?;

    let assistant_msg_struct = ChatMessage {
        id: Uuid::new_v4().to_string(),
        sender: "assistant".to_string(),
        text: patch_resp.message.clone(),
        timestamp: Utc::now().to_rfc3339(),
    };
    memory.short_term_messages.push(assistant_msg_struct);

    if let Some(ref new_sum) = patch_resp.summary {
        if !new_sum.is_empty() {
            memory.diagram_summary = new_sum.clone();
        }
    }

    // Auto-summarize if memory limit reached
    if memory.short_term_messages.len() > prefs.short_term_memory_limit {
        let truncate_at = memory.short_term_messages.len() - (prefs.short_term_memory_limit / 2);
        memory.short_term_messages.drain(0..truncate_at);
    }

    Ok((patch_resp, memory))
}
