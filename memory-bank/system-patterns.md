# OMAR GUI System Patterns

## Architecture Overview

### Frontend Architecture

1. **Component Structure**
    - Main application container
    - Model list component
    - Sorting and filtering controls
    - Confirmation dialogs
    - Status indicators

2. **State Management**
    - Local state for UI components
    - Model data management
    - Sort state handling
    - Refresh mechanism

3. **Event Handling**
    - User interactions
    - Model operations
    - Sort/filter actions
    - Error handling

### Backend Architecture

1. **Rust Core (src-tauri/src/lib.rs)**
    - Model management logic
    - File system operations
    - Log parsing system
    - API integration

2. **Data Flow**
    - Tauri commands interface
    - Model data structures
    - Error handling patterns
    - Async operations

3. **File System Integration**
    - Model directory management
    - Log file processing
    - Cross-platform path handling
    - File operation safety

## Design Patterns

### Frontend Patterns

1. **Component Patterns**

   ```typescript
   // Model list management
   let modelTableBody: HTMLElement | null;
   let currentModels: ModelUsage[] = [];
   let currentSort: { column: SortColumn; direction: SortDirection };
   ```

2. **Event Handling Pattern**

   ```typescript
   // Event delegation for delete buttons
   modelTableBody.addEventListener('click', async (event) => {
     if (target.classList.contains('delete-btn')) {
       const modelName = target.getAttribute('data-model');
       await handleDelete(modelName);
     }
   });
   ```

3. **Data Management Pattern**

   ```typescript
   // Model sorting implementation
   function sortModels(
     models: ModelUsage[],
     column: SortColumn,
     direction: SortDirection
   ): ModelUsage[]
   ```

### Backend Patterns

1. **Model Management Pattern**

   ```rust
   // Model usage tracking
   struct ModelUsage {
       name: String,
       last_used: DateTime<Local>,
       usage_count: usize,
       size: u64,
   }
   ```

2. **File System Pattern**

   ```rust
   // Cross-platform path handling
   fn get_model_dir() -> PathBuf {
       if let Ok(custom_path) = env::var("OLLAMA_MODELS") {
           return PathBuf::from(custom_path);
       }
       // Platform-specific paths...
   }
   ```

3. **API Integration Pattern**

   ```rust
   // HTTP client pattern
   async fn delete_model(model_name: String) -> Result<(), String> {
       let client = reqwest::Client::new();
       let response = client
           .delete("http://localhost:11434/api/delete")
           .json(&serde_json::json!({
               "model": model_name
           }))
           .send()
           .await
   }
   ```

## Key Technical Decisions

### 1. Technology Stack

- **Tauri**: Desktop application framework
    - Lightweight runtime
    - Native performance
    - Secure by default

- **TypeScript**: Frontend development
    - Type safety
    - Better IDE support
    - Enhanced maintainability

- **Rust**: Backend implementation
    - High performance
    - Memory safety
    - Cross-platform support

### 2. Data Management

- Local state management
- File-based model tracking
- Real-time updates
- Efficient sorting algorithms

### 3. Error Handling

- Comprehensive error types
- User-friendly error messages
- Graceful degradation
- Recovery mechanisms

### 4. Cross-Platform Support

- Platform-specific paths
- Unified API interface
- Consistent user experience
- Native integration

## Implementation Guidelines

### 1. Code Organization

- Separate concerns
- Modular components
- Clear interfaces
- Consistent naming

### 2. Error Management

- Detailed error logging
- User-friendly messages
- Recovery procedures
- Validation checks

### 3. Performance

- Efficient data structures
- Optimized file operations
- Responsive UI
- Resource management

### 4. Security

- Input validation
- Safe file operations
- API security
- Error sanitization
