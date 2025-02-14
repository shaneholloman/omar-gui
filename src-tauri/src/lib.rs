// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use anyhow::{Context, Result};
use chrono::{DateTime, Local, NaiveDateTime, TimeZone};
use glob::glob;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    env,
    fs::{self, File},
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
};

#[derive(Debug, Deserialize)]
struct ModelLayer {
    #[serde(rename = "mediaType")]
    media_type: String,
    digest: String,
    size: u64,
}

#[derive(Debug, Deserialize)]
struct ModelManifest {
    layers: Vec<ModelLayer>,
}

#[derive(Debug, Serialize)]
struct ModelUsage {
    name: String,
    last_used: DateTime<Local>,
    usage_count: usize,
    size: u64,
}

#[derive(Debug, Deserialize, Serialize)]
struct OllamaModel {
    name: String,
    modified_at: String,
    size: u64,
    digest: String,
    details: ModelDetails,
}

#[derive(Debug, Deserialize, Serialize)]
struct ModelDetails {
    format: String,
    family: String,
    #[serde(rename = "parameter_size")]
    size: String,
    #[serde(rename = "quantization_level")]
    quantization: String,
}

#[derive(Debug, Deserialize)]
struct OllamaModelList {
    models: Vec<OllamaModel>,
}

fn get_model_dir() -> PathBuf {
    if let Ok(custom_path) = env::var("OLLAMA_MODELS") {
        return PathBuf::from(custom_path);
    }

    #[cfg(target_os = "macos")]
    {
        dirs::home_dir()
            .unwrap()
            .join(".ollama")
            .join("models")
    }

    #[cfg(target_os = "windows")]
    {
        dirs::home_dir()
            .unwrap()
            .join(".ollama")
    }

    #[cfg(target_os = "linux")]
    {
        PathBuf::from("/usr/share/ollama")
    }
}

fn get_log_paths() -> Vec<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let mut paths: Vec<_> = glob(
            dirs::home_dir()
                .unwrap()
                .join(".ollama")
                .join("logs")
                .join("server*.log")
                .to_str()
                .unwrap(),
        )
        .unwrap()
        .filter_map(Result::ok)
        .collect();

        paths.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
        paths
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(local_app_data) = dirs::data_local_dir() {
            vec![local_app_data.join("Ollama")]
        } else {
            vec![]
        }
    }

    #[cfg(target_os = "linux")]
    {
        vec![]
    }
}

fn parse_manifest_path(path: &Path) -> Option<String> {
    let components: Vec<_> = path.components().collect();
    let len = components.len();
    if len >= 4 {
        let _registry = components[len - 4].as_os_str().to_string_lossy();
        let user = components[len - 3].as_os_str().to_string_lossy();
        let model = components[len - 2].as_os_str().to_string_lossy();
        let tag = path.file_name()?.to_string_lossy();

        let prefix = if user == "library" {
            String::new()
        } else {
            format!("{}/", user)
        };

        Some(format!("{}{}:{}", prefix, model, tag))
    } else {
        None
    }
}

fn find_model_manifests() -> Result<HashMap<String, (String, u64)>> {
    let mut hash_to_name_size = HashMap::new();

    let model_dir = get_model_dir();
    let manifest_dir = model_dir.join("manifests");

    for entry in glob(&format!("{}/**/*", manifest_dir.display()))
        .context("Failed to read glob pattern")?
    {
        let path = entry.context("Failed to get manifest path")?;
        if path.is_file() {
            let content = fs::read_to_string(&path).context("Failed to read manifest file")?;
            if let Ok(manifest) = serde_json::from_str::<ModelManifest>(&content) {
                if let Some(model_layer) = manifest
                    .layers
                    .iter()
                    .find(|l| l.media_type == "application/vnd.ollama.image.model")
                {
                    let hash = model_layer
                        .digest
                        .strip_prefix("sha256:")
                        .unwrap_or(&model_layer.digest)
                        .to_string();

                    if let Some(model_name) = parse_manifest_path(&path) {
                        let entry = hash_to_name_size.entry(hash).or_insert_with(|| (String::new(), 0));
                        if !entry.0.is_empty() {
                            entry.0.push_str(", ");
                        }
                        entry.0.push_str(&model_name);
                        entry.1 = model_layer.size;
                    }
                }
            }
        }
    }

    Ok(hash_to_name_size)
}

fn parse_logs(hash_to_name_size: &HashMap<String, (String, u64)>) -> Result<HashMap<String, ModelUsage>> {
    let mut model_usage = HashMap::new();
    let log_paths = get_log_paths();
    let mut seen_hashes = HashSet::new();

    for log_path in log_paths {
        let file = File::open(&log_path)?;
        let metadata = file.metadata()?;
        let file_time = metadata.modified()?.into();

        let reader = BufReader::new(file);
        let mut last_timestamp: Option<DateTime<Local>> = None;

        for line in reader.lines() {
            let line = line?;
            if line.starts_with("time=") {
                if let Ok(timestamp) = DateTime::parse_from_rfc3339(&line[5..]) {
                    last_timestamp = Some(timestamp.with_timezone(&Local));
                }
            } else if line.len() > 19 && &line[4..5] == "/" && &line[7..8] == "/" {
                if let Ok(naive) = NaiveDateTime::parse_from_str(&line[0..19], "%Y/%m/%d %H:%M:%S") {
                    last_timestamp = Some(Local.from_local_datetime(&naive).unwrap());
                }
            } else if line.starts_with("llama_model_loader: loaded meta data") {
                if let Some(hash_start) = line.find("sha256-") {
                    let hash = line[hash_start + 7..hash_start + 71].to_string();
                    seen_hashes.insert(hash.clone());

                    let (model_name, size) = hash_to_name_size
                        .get(&hash)
                        .map(|(name, size)| (name.clone(), *size))
                        .unwrap_or_else(|| (format!("{}...-deleted", &hash[..8]), 0));

                    let entry = model_usage.entry(model_name.clone()).or_insert_with(|| ModelUsage {
                        name: model_name,
                        last_used: last_timestamp.unwrap_or(file_time),
                        usage_count: 0,
                        size,
                    });

                    entry.usage_count += 1;
                    if let Some(timestamp) = last_timestamp {
                        if timestamp > entry.last_used {
                            entry.last_used = timestamp;
                        }
                    }
                }
            }
        }
    }

    Ok(model_usage)
}

#[tauri::command]
async fn get_model_usage() -> Result<Vec<ModelUsage>, String> {
    // First, get used models from logs
    let mut used_models = parse_logs(&find_model_manifests()
        .map_err(|e| format!("Failed to find model manifests: {}", e))?
    )
    .map_err(|e| format!("Failed to parse logs: {}", e))?;

    // Fetch all local models from Ollama
    let client = reqwest::Client::new();
    let models_response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    let model_list: OllamaModelList = models_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse model list: {}", e))?;

    // Add unused models to the list with default values
    for model in model_list.models {
        if !used_models.contains_key(&model.name) {
            used_models.insert(model.name.clone(), ModelUsage {
                name: model.name,
                last_used: Local.timestamp_opt(0, 0).unwrap(), // Unix epoch
                usage_count: 0, // No usage
                size: model.size,
            });
        }
    }

    // Convert to Vec and sort
    let mut result: Vec<ModelUsage> = used_models.into_values().collect();
    result.sort_by(|a, b| {
        // Sort by usage count (descending), then by last used, then by name
        b.usage_count.cmp(&a.usage_count)
            .then_with(|| b.last_used.cmp(&a.last_used))
            .then_with(|| a.name.cmp(&b.name))
    });

    Ok(result)
}

#[tauri::command]
async fn list_unused_models() -> Result<Vec<String>, String> {
    // Fetch all local models from Ollama
    let client = reqwest::Client::new();
    let models_response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    let model_list: OllamaModelList = models_response
        .json()
        .await
        .map_err(|e| format!("Failed to parse model list: {}", e))?;

    // Fetch model usage from logs
    let used_models = parse_logs(&find_model_manifests()
        .map_err(|e| format!("Failed to find model manifests: {}", e))?
    )
    .map_err(|e| format!("Failed to parse logs: {}", e))?;

    // Find models that exist but haven't been used
    let unused_models: Vec<String> = model_list.models
        .iter()
        .filter(|model| !used_models.contains_key(&model.name))
        .map(|model| model.name.clone())
        .collect();

    Ok(unused_models)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn delete_model(model_name: String) -> Result<(), String> {
    println!("Attempting to delete model via Ollama API: {}", model_name);
    
    // Split model name in case it contains multiple models separated by commas
    let models: Vec<&str> = model_name.split(',').map(|s| s.trim()).collect();
    let mut errors = Vec::new();

    for model in models {
        println!("Deleting model: {}", model);
        let client = reqwest::Client::new();
        let response = client
            .delete("http://localhost:11434/api/delete")
            .json(&serde_json::json!({
                "model": model
            }))
            .send()
            .await
            .map_err(|e| format!("Failed to send delete request for {}: {}", model, e))?;

        if !response.status().is_success() {
            let error_msg = format!(
                "Failed to delete model {}. Status: {}, Body: {}", 
                model,
                response.status(),
                response.text().await.unwrap_or_default()
            );
            println!("{}", error_msg);
            errors.push(error_msg);
        } else {
            println!("Successfully deleted model: {}", model);
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_model_usage, list_unused_models, delete_model, greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
