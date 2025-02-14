import { invoke } from "@tauri-apps/api/core";

export interface ModelUsage {
  name: string;
  last_used: string;
  usage_count: number;
  size: number;
}

export type SortColumn = 'name' | 'last_used' | 'usage_count' | 'size';
export type SortDirection = 'asc' | 'desc';

export async function getModelUsage(): Promise<ModelUsage[]> {
  console.log('Fetching model usage...');
  const models = await invoke<ModelUsage[]>("get_model_usage");
  console.log('Received models:', models);
  return models;
}

export async function deleteModel(modelName: string | string[]): Promise<void> {
  const models = Array.isArray(modelName) ? modelName : [modelName];
  console.log('Deleting models:', models);
  
  try {
    // Join models with commas to send them all in one request
    const modelString = models.join(',');
    await invoke("delete_model", { modelName: modelString });
    console.log('Successfully deleted models:', models);
  } catch (error) {
    console.error('Error deleting models:', models, error);
    throw error;
  }
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function isDeletedModel(model: ModelUsage): boolean {
  return model.name.endsWith('-deleted');
}

export function sortModels(
  models: ModelUsage[],
  column: SortColumn,
  direction: SortDirection
): ModelUsage[] {
  // Separate active and deleted models
  const activeModels = models.filter(model => !isDeletedModel(model));
  const deletedModels = models.filter(isDeletedModel);

  // Sort each group independently
  const sortFn = (a: ModelUsage, b: ModelUsage): number => {
    let comparison = 0;
    
    switch (column) {
      case 'name':
        // For deleted models, compare without the "-deleted" suffix
        const nameA = isDeletedModel(a) ? a.name.replace(/-deleted$/, '') : a.name;
        const nameB = isDeletedModel(b) ? b.name.replace(/-deleted$/, '') : b.name;
        comparison = nameA.localeCompare(nameB);
        break;
      case 'last_used':
        comparison = new Date(a.last_used).getTime() - new Date(b.last_used).getTime();
        break;
      case 'usage_count':
        comparison = a.usage_count - b.usage_count;
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  };

  // Sort both groups
  const sortedActive = [...activeModels].sort(sortFn);
  const sortedDeleted = [...deletedModels].sort(sortFn);

  // Return active models first, then deleted models
  return [...sortedActive, ...sortedDeleted];
}

export async function listUnusedModels(): Promise<string[]> {
  console.log('Fetching unused models...');
  try {
    const unusedModels = await invoke<string[]>("list_unused_models");
    console.log('Unused models:', unusedModels);
    return unusedModels;
  } catch (error) {
    console.error('Error fetching unused models:', error);
    throw error;
  }
}
