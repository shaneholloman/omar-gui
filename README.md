# Ollama Model Report (OMAR) GUI

## Description

This application is designed to help users efficiently manage and prune their models. It provides tools for optimizing model performance and reducing unnecessary complexity. Built with Tauri and TypeScript.

## Prerequisites

Before building the application, ensure you have the following installed:

1. Rust and Cargo

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup update
   rustup toolchain install stable
   ```

2. Node.js (v16 or later) and npm

3. System Dependencies (for Tauri)
   - On macOS: (works)

     ```bash
     xcode-select --install
     ```

   - On Linux: (untested)

     ```bash
     sudo apt update
     sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
     ```

   - On Windows: (untested)
     - Install Microsoft Visual Studio C++ Build Tools
     - Install WebView2

## Installation from Releases

To install the application from the releases:

1. Go to the [Releases](https://github.com/shaneholloman/omar-gui/releases) page
2. Download the appropriate package for your operating system:
   - `.dmg` for macOS
   - `.AppImage` or `.deb` for Linux
   - `.msi` for Windows
3. Follow your operating system's standard installation procedure

## Building from Source

1. Clone the repository:

   ```bash
   git clone https://github.com/shaneholloman/omar-gui.git
   cd omar-gui
   ```

2. Install dependencies:

   ```bash
   # Install npm dependencies
   npm install
   npm install @tauri-apps/cli @tauri-apps/api

   # Install Rust dependencies
   cd src-tauri
   cargo build
   cd ..
   ```

3. Build and run the application:

   For development:

   ```bash
   npm run build  # Build the frontend
   npx tauri dev  # Run in development mode with hot reloading
   ```

   For production build:

   ```bash
   npm run build  # Build the frontend
   npx tauri build  # Build the production app
   ```

The compiled binaries will be available in `src-tauri/target/release/`.
