export type StorageMode = 'tauri' | 'localstorage' | 'fs-access';

export interface IStorageDriver {
  getMode(): StorageMode;
  
  // Workspace operations
  create_workspace(name: string, description: string): Promise<string>;
  load_workspace(path: string): Promise<string>;
  save_workspace(metaJson: string): Promise<void>;
  get_recent_workspaces(): Promise<string>;
  delete_workspace(path: string): Promise<void>;
  
  // Diagram operations
  save_diagram(path: string, diagramId: string, logicalJson: string, visualJson: string, diagramFileJson?: string): Promise<void>;
  load_diagram(path: string, diagramId?: string): Promise<string>;
  
  // Preferences
  save_preferences(preferencesJson: string): Promise<void>;
  load_preferences(): Promise<string>;
  
  // Generic file operations
  get_global_components_dir(): Promise<string>;
  save_text_file(path: string, content: string): Promise<void>;
  read_text_file(path: string): Promise<string>;
  list_json_files_in_dir(dirPath: string): Promise<string[]>;
  delete_file(path: string): Promise<void>;
}
