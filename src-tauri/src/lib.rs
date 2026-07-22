

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceMeta {
    id: String,
    name: String,
    description: String,
    created_at: String,
    last_accessed: String,
    path: String,
}

// Helper to safely parse workspace.json without serde alias/duplicate conflicts
fn parse_workspace_meta(content: &str, dir_path: &Path) -> Result<WorkspaceMeta, String> {
    let val: serde_json::Value = serde_json::from_str(content)
        .map_err(|e| format!("Failed to parse workspace.json: {}", e))?;

    let obj = val.as_object().ok_or_else(|| "workspace.json is not a valid JSON object".to_string())?;

    let folder_name = dir_path.file_name().unwrap_or_default().to_string_lossy().to_string();

    let name = obj.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&folder_name)
        .to_string();

    let description = obj.get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let created_at = obj.get("createdAt")
        .or_else(|| obj.get("created_at"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let last_accessed = obj.get("lastAccessed")
        .or_else(|| obj.get("last_accessed"))
        .or_else(|| obj.get("lastModified"))
        .and_then(|v| v.as_str())
        .unwrap_or(&created_at)
        .to_string();

    let id = obj.get("id")
        .and_then(|v| v.as_str())
        .unwrap_or(&name)
        .to_string();

    Ok(WorkspaceMeta {
        id,
        name,
        description,
        created_at,
        last_accessed,
        path: dir_path.to_string_lossy().to_string(),
    })
}

// Helper to scan home/.yada directory for all valid workspace subfolders
fn scan_workspaces_dir(app_handle: &AppHandle) -> Result<Vec<WorkspaceMeta>, String> {
    let home = app_handle
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;
    let base_dir = home.join(".yada");

    let mut list: Vec<WorkspaceMeta> = Vec::new();

    if base_dir.exists() && base_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&base_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let ws_json = path.join("workspace.json");
                    if ws_json.exists() {
                        if let Ok(content) = fs::read_to_string(&ws_json) {
                            if let Ok(meta) = parse_workspace_meta(&content, &path) {
                                list.push(meta);
                            }
                        }
                    }
                }
            }
        }
    }

    list.sort_by(|a, b| b.last_accessed.cmp(&a.last_accessed));
    Ok(list)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn create_workspace(
    app_handle: AppHandle,
    name: String,
    description: String,
) -> Result<String, String> {
    // 1. Resolve workspace path: home_dir/.yada/name
    let home = app_handle
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;
    let base_dir = home.join(".yada");
    let ws_dir = base_dir.join(&name);

    if ws_dir.exists() {
        return Err(
            "A workspace or folder with this name already exists in the `.yada` directory."
                .to_string(),
        );
    }

    // 2. Create the workspace directory (creates base_dir too if missing)
    fs::create_dir_all(&ws_dir)
        .map_err(|e| format!("Failed to create workspace directory: {}", e))?;

    // 3. Create the diagrams/ subfolder
    let diagrams_dir = ws_dir.join("diagrams");
    fs::create_dir_all(&diagrams_dir)
        .map_err(|e| format!("Failed to create diagrams subfolder: {}", e))?;

    // 4. Build WorkspaceMeta
    let current_time = Utc::now().to_rfc3339();
    let meta = WorkspaceMeta {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        created_at: current_time.clone(),
        last_accessed: current_time,
        path: ws_dir.to_string_lossy().to_string(),
    };

    // 5. Save workspace.json inside workspace directory
    let workspace_json_path = ws_dir.join("workspace.json");
    let json_content = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(&workspace_json_path, json_content)
        .map_err(|e| format!("Failed to write workspace.json: {}", e))?;

    // Return serialized meta string
    let result_json = serde_json::to_string(&meta).map_err(|e| e.to_string())?;
    Ok(result_json)
}

fn resolve_workspace_dir(app_handle: &AppHandle, path_str: &str) -> Result<std::path::PathBuf, String> {
    let p = Path::new(path_str);
    if p.is_absolute() && p.exists() {
        Ok(p.to_path_buf())
    } else {
        let home = app_handle
            .path()
            .home_dir()
            .map_err(|e| format!("Failed to get home directory: {}", e))?;
        let resolved = home.join(".yada").join(path_str);
        if resolved.exists() {
            Ok(resolved)
        } else if p.exists() {
            Ok(p.to_path_buf())
        } else {
            Ok(resolved)
        }
    }
}

#[tauri::command]
fn load_workspace(app_handle: AppHandle, path: String) -> Result<String, String> {
    let ws_dir = resolve_workspace_dir(&app_handle, &path)?;
    let workspace_json_path = ws_dir.join("workspace.json");

    if !workspace_json_path.exists() {
        return Err(
            "This directory is not a valid workspace. workspace.json is missing.".to_string(),
        );
    }

    // Read and parse workspace.json dynamically
    let content = fs::read_to_string(&workspace_json_path)
        .map_err(|e| format!("Failed to read workspace.json: {}", e))?;
    let mut meta = parse_workspace_meta(&content, &ws_dir)?;

    // Update last accessed time
    meta.last_accessed = Utc::now().to_rfc3339();

    // Write updated metadata back to workspace.json
    let json_content = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(&workspace_json_path, json_content)
        .map_err(|e| format!("Failed to update workspace.json: {}", e))?;

    // Return serialized meta string
    let result_json = serde_json::to_string(&meta).map_err(|e| e.to_string())?;
    Ok(result_json)
}

#[tauri::command]
fn get_recent_workspaces(app_handle: AppHandle) -> Result<String, String> {
    let list = scan_workspaces_dir(&app_handle)?;
    let result_json = serde_json::to_string(&list).map_err(|e| e.to_string())?;
    Ok(result_json)
}

#[tauri::command]
fn save_recent_workspaces(_app_handle: AppHandle, _workspaces_json: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn save_workspace(app_handle: AppHandle, meta_json: String) -> Result<(), String> {
    let val: serde_json::Value = serde_json::from_str(&meta_json).map_err(|e| e.to_string())?;
    let path_str = val.get("path").and_then(|v| v.as_str()).unwrap_or("");
    let ws_dir = resolve_workspace_dir(&app_handle, path_str)?;

    if !ws_dir.exists() {
        return Err("Workspace directory does not exist".to_string());
    }

    let meta = parse_workspace_meta(&meta_json, &ws_dir)?;
    let workspace_json_path = ws_dir.join("workspace.json");
    let json_content = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(&workspace_json_path, json_content)
        .map_err(|e| format!("Failed to save workspace.json: {}", e))?;

    Ok(())
}

#[tauri::command]
fn load_preferences(app_handle: AppHandle) -> Result<String, String> {
    let home = app_handle
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to resolve home dir: {}", e))?;
    let base_dir = home.join(".yada");
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir)
            .map_err(|e| format!("Failed to create .yada dir: {}", e))?;
    }
    let pref_file = base_dir.join("preferences.json");
    if !pref_file.exists() {
        let default_pref = serde_json::json!({
            "language": "system",
            "theme": "dark"
        });
        return Ok(default_pref.to_string());
    }
    let content = fs::read_to_string(&pref_file)
        .map_err(|e| format!("Failed to read preferences.json: {}", e))?;
    Ok(content)
}

#[tauri::command]
fn save_preferences(app_handle: AppHandle, preferences_json: String) -> Result<(), String> {
    let home = app_handle
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to resolve home dir: {}", e))?;
    let base_dir = home.join(".yada");
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir)
            .map_err(|e| format!("Failed to create .yada dir: {}", e))?;
    }
    let pref_file = base_dir.join("preferences.json");
    fs::write(&pref_file, preferences_json)
        .map_err(|e| format!("Failed to write preferences.json: {}", e))?;
    Ok(())
}

#[tauri::command]
fn get_global_components_dir(app_handle: AppHandle) -> Result<String, String> {
    let home = app_handle
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to resolve home dir: {}", e))?;
    let components_dir = home.join(".yada").join("components");
    if !components_dir.exists() {
        fs::create_dir_all(&components_dir)
            .map_err(|e| format!("Failed to create global components dir: {}", e))?;
    }
    Ok(components_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn load_diagram(path: String, diagram_id: String) -> Result<String, String> {
    let ws_path = Path::new(&path);
    if !ws_path.exists() {
        return Err("Workspace directory does not exist".to_string());
    }

    let diagrams_dir = ws_path.join("diagrams");
    let mut logical_file = diagrams_dir.join(format!("{}_logical.json", diagram_id));
    let mut visual_file = diagrams_dir.join(format!("{}_visual.json", diagram_id));

    // Backward compatibility: if the specific diagram files don't exist, check root
    if !logical_file.exists() && ws_path.join("logical.json").exists() {
        logical_file = ws_path.join("logical.json");
        visual_file = ws_path.join("visual.json");
    }

    let logical_content = if logical_file.exists() {
        fs::read_to_string(&logical_file)
            .map_err(|e| format!("Failed to read logical.json: {}", e))?
    } else {
        r#"{"nodes":[],"edges":[]}"#.to_string()
    };

    let visual_content = if visual_file.exists() {
        fs::read_to_string(&visual_file)
            .map_err(|e| format!("Failed to read visual.json: {}", e))?
    } else {
        r#"{"canvas":{"zoom":1,"pan":{"x":0,"y":0}},"layoutNodes":{}}"#.to_string()
    };

    let combined = serde_json::json!({
        "logical": serde_json::from_str::<serde_json::Value>(&logical_content).unwrap_or(serde_json::json!({"nodes":[],"edges":[]})),
        "visual": serde_json::from_str::<serde_json::Value>(&visual_content).unwrap_or(serde_json::json!({"canvas":{"zoom":1,"pan":{"x":0,"y":0}},"layoutNodes":{}}))
    });

    Ok(combined.to_string())
}

#[tauri::command]
fn save_diagram(path: String, diagram_id: String, logical_json: String, visual_json: String) -> Result<(), String> {
    let ws_path = Path::new(&path);
    if !ws_path.exists() {
        return Err("Workspace directory does not exist".to_string());
    }

    let diagrams_dir = ws_path.join("diagrams");
    if !diagrams_dir.exists() {
        fs::create_dir_all(&diagrams_dir).map_err(|e| format!("Failed to create diagrams dir: {}", e))?;
    }

    let logical_file = diagrams_dir.join(format!("{}_logical.json", diagram_id));
    let visual_file = diagrams_dir.join(format!("{}_visual.json", diagram_id));

    // Parse to validate JSON structures
    let logical_val: serde_json::Value = serde_json::from_str(&logical_json)
        .map_err(|e| format!("Invalid logical JSON format: {}", e))?;
    let visual_val: serde_json::Value = serde_json::from_str(&visual_json)
        .map_err(|e| format!("Invalid visual JSON format: {}", e))?;

    fs::write(
        &logical_file,
        serde_json::to_string_pretty(&logical_val).unwrap(),
    )
    .map_err(|e| format!("Failed to write logical.json: {}", e))?;

    fs::write(
        &visual_file,
        serde_json::to_string_pretty(&visual_val).unwrap(),
    )
    .map_err(|e| format!("Failed to write visual.json: {}", e))?;

    Ok(())
}

#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }
    fs::write(file_path, content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err("File not found".to_string());
    }
    let content =
        fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    Ok(content)
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    if file_path.exists() {
        if file_path.is_dir() {
            fs::remove_dir_all(file_path).map_err(|e| format!("Failed to delete directory: {}", e))?;
        } else {
            fs::remove_file(file_path).map_err(|e| format!("Failed to delete file: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn list_json_files_in_dir(dir_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&dir_path);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let mut results = Vec::new();
    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();
        if file_path.is_file() && file_path.extension().map_or(false, |ext| ext == "json") {
            if let Ok(content) = fs::read_to_string(&file_path) {
                results.push(content);
            }
        }
    }
    Ok(results)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_workspace,
            load_workspace,
            get_recent_workspaces,
            save_recent_workspaces,
            save_workspace,
            load_preferences,
            save_preferences,
            get_global_components_dir,
            load_diagram,
            save_diagram,
            save_text_file,
            read_text_file,
            delete_file,
            list_json_files_in_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
