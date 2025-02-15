# OMAR GUI Project Brief

## Project Overview

OMAR GUI (Ollama Model Analysis & Report GUI) is a desktop application designed to help users efficiently manage and prune their Ollama language models. Built with Tauri and TypeScript, it provides a user-friendly interface for monitoring model usage, analyzing storage consumption, and maintaining model collections.

## Core Requirements

### Model Management

- Display comprehensive list of installed Ollama models
- Show model usage statistics (last used, usage count, size)
- Enable model deletion with confirmation
- Support batch operations for multiple models

### Usage Analysis

- Track model usage patterns
- Identify unused models
- Calculate storage consumption
- Sort and filter model data

### User Interface

- Clean, intuitive desktop interface
- Real-time model status updates
- Responsive design
- Clear confirmation dialogs for destructive actions

### Technical Requirements

- Cross-platform compatibility (macOS, Linux, Windows)
- Integration with Ollama API
- Efficient log parsing and analysis
- Secure model deletion process

## Project Goals

### Primary Goals

1. Simplify Ollama model management
2. Reduce unnecessary storage usage
3. Provide clear usage insights
4. Enable informed model pruning decisions

### Success Metrics

1. Successful model operations (listing, deletion)
2. Accurate usage statistics
3. Responsive user interface
4. Reliable cross-platform functionality

## Scope

### In Scope

- Model listing and statistics
- Usage tracking and analysis
- Model deletion functionality
- Basic sorting and filtering
- Cross-platform desktop support

### Out of Scope

- Model training or fine-tuning
- Direct model downloads
- Advanced model configuration
- Server management
- Cloud synchronization

## Technical Stack

- Frontend: TypeScript, Vite
- Backend: Rust, Tauri
- API Integration: Ollama HTTP API
- Build System: npm, Cargo
