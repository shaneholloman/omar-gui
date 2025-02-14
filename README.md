# Ollama Model Report (OMAR) GUI

## Description
This application is designed to help users efficiently manage and prune their models. It provides tools for optimizing model performance and reducing unnecessary complexity.

## Installation from Releases
To install the application from the releases:
1. Go to the [Releases](https://github.com/yourusername/modelpruner/releases) page of the repository.
2. Download the appropriate package for your operating system (Linux, macOS, or Windows).
3. Follow the installation instructions provided for your OS.

## Building the Application
To build the application from source, you will need to have Rust installed. Follow these steps:

### Prerequisites
1. Install Rust by following the instructions at [rust-lang.org](https://www.rust-lang.org/tools/install).
2. Ensure you have the necessary tools installed:
   ```bash
   rustup update
   rustup toolchain install stable
   cargo install --locked
   ```

### Build Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/modelpruner.git
   cd modelpruner
   ```
2. Build the application:
   ```bash
   cargo build --release
   ```
3. The compiled binaries will be located in the `target/release` directory.
