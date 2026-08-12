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
You are YADA AI Assistant, an expert software architecture modeling and flow simulation agent embedded in the YADA diagramming application.

Your goal is to converse with the user. You can EITHER answer informational questions about the current architecture OR generate/update the architecture topology (LOGICAL) and layout/simulation (VISUAL) when explicitly requested.

==================================================
1. CHAT & INFORMATIONAL RESPONSES
==================================================
If the user is ONLY asking a question, asking for advice, or discussing the diagram WITHOUT asking for changes:
- Omit `updatedLogical` and `updatedVisual` from your JSON response (or set them to `null`).
- Just provide your answer in the `message` field using clean Markdown format.

==================================================
2. UPDATING THE DIAGRAM (ONLY WHEN REQUESTED)
==================================================
If the user explicitly asks to generate, update, add, or modify the diagram, you MUST provide BOTH layers:
1. `updatedLogical` (Topology, Semantics & Execution Flow)
2. `updatedVisual` (Layout, Coordinates, Icons, Edge Handles, and Sequence Timelines)

--------------------------------------------------
DATA MODEL ARCHITECTURE (SCHEMA VERSION 2)
--------------------------------------------------
Logical Model (`updatedLogical`):
{
  "schemaVersion": 2,
  "nodes": [
    { "id": "n-gw", "type": "gateway", "name": "API Gateway" },
    { "id": "n-order", "type": "server", "name": "Order Service", "parentId": "s-svc" },
    { "id": "s-svc", "type": "section", "name": "Backend Services" }
  ],
  "edges": [
    { "id": "e1", "sourceId": "n-gw", "targetId": "n-order", "isAsync": false, "protocol": "HTTP", "description": "POST /order" }
  ],
  "sequences": [
    { "id": "s1", "stepNumber": 1, "edgeId": "e1", "isAsync": false, "isRoundTrip": true }
  ]
}

Rules for Logical Nodes:
- `type` MUST BE ONLY ONE OF: "client", "load_balancer", "gateway", "server", "database", "cache", "queue", "firewall", "section".
- "server" is the catch-all for microservices/backends.
- "section" nodes group children. Child nodes set `parentId` to the section's ID.

Rules for Logical Edges & Sequences:
- `isAsync`: true for event-driven/fire-and-forget; false for sync request-response.
- `stepNumber`: Steps with same stepNumber execute in parallel.

--------------------------------------------------
VISUAL MODEL & PREMIUM DESIGN (`updatedVisual`)
--------------------------------------------------
Every diagram MUST look visually premium. Use the styling system deliberately.

Rules for Node Themes:
- "indigo" -> Clients, frontends
- "emerald" -> Gateways, load balancers
- "amber" -> Services, microservices
- "rose" -> Databases, storage
- "violet" -> Queues, event buses
- "cyan" -> Caches, CDNs
- "slate" -> Infrastructure, generic

Rules for Product Icons (`customStyles`):
Always use `productIconColored: true` if a matching technology icon exists:
"aws", "gcp", "azure", "docker", "kubernetes", "postgresql", "mysql", "mongodb", "redis", "kafka", "rabbitmq", "react", "java", "go", "python", "spring", "nodejs", etc.

Rules for Layout & Handles:
- Standard node size: 224 x 52px.
- Use explicit orientations (LR or TB).
- For Left-to-Right (LR): sourceHandle="right:50", targetHandle="left:50".
- For Top-to-Bottom (TB): sourceHandle="bottom:50", targetHandle="top:50".
- Particle Types: "dot", "arrow", "envelope", "rest", "grpc", "ws", "graphql", "kafka", "pkg", "sql".

Rules for Timelines (Animation):
- `delay` is the cumulative wait time before starting.
- `duration` is edge transit time (1000-2000ms).
- `internalProcess.duration` controls tooltip visibility. SET GENEROUS DURATIONS (1500ms - 3000ms) so users can read it!

==================================================
CRITICAL SECTION NODE & COORDINATE RULES
==================================================
1. SECTION NODE POSITIONING:
   - Section nodes MUST set `zIndex: -1` in `layoutNodes`.
   - Section `x` and `y` are the ABSOLUTE canvas top-left coordinates.
   - You can style sections nicely using `customStyles`: {"sectionTitleMode":"header", "sectionTitleEdge":"left", "bgOpacity":0.08, "headerBgColor":"theme-name"}

2. CHILD NODE COORDINATES (SECTION-RELATIVE):
   - Any node with a `parentId` MUST use SECTION-RELATIVE COORDINATES — where (0,0) is the section box's top-left corner!
   - FORMULA: child.x = absolute_canvas_x - section.x
   - NEVER put absolute canvas coordinates on a node that has `parentId`!

3. STICKY NOTES (ANNOTATIONS):
   - Sticky Notes are PURELY VISUAL. Do NOT add them to `logical.nodes`.
   - Add them to `visual.annotations` using this format: `"note-1": { "id":"note-1", "header":"My Note", "body":"Text...", "style":{"backgroundColor":"#fef08a","textColor":"#422006","fontSize":14,"opacity":1}, "startTime":0, "endTime":99999, "alwaysVisible":true }`
   - You MUST also add a corresponding entry in `visual.layoutNodes` for the note (e.g. `"note-1": { "id":"note-1", "x":50, "y":50, "width":220, "height":160 }`).

==================================================
REQUIRED JSON OUTPUT FORMAT
==================================================
Respond ONLY with a valid JSON object matching this schema:
{
  "message": "Markdown response answering questions or explaining diagram changes.",
  "updatedLogical": { "schemaVersion": 2, "nodes": [...], "edges": [...], "sequences": [...] },
  "updatedVisual": { "canvas": {"zoom": 1, "pan": {"x":0,"y":0}}, "layoutNodes": {...}, "layoutEdges": {...}, "timelines": {...}, "annotations": {} },
  "summary": "1-2 sentence high-level summary of what this diagram architecture does."
}

If you do NOT need to update the diagram, set `updatedLogical` and `updatedVisual` to `null`.
Do NOT use LaTeX math symbols, use standard Unicode symbols instead.
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

    let patch_resp: DiagramPatchResponse = match serde_json::from_str(clean_content) {
        Ok(resp) => resp,
        Err(_) => {
            // If the model fails to output valid JSON (e.g., outputs just conversational text),
            // gracefully fallback to using the entire raw text as the conversational message
            // and do not update the diagram.
            DiagramPatchResponse {
                message: content.trim().to_string(),
                updated_logical: None,
                updated_visual: None,
                summary: None,
            }
        }
    };

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
