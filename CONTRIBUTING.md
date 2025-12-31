# Contributing to Chroma Detect

Thank you for your interest in contributing to Chroma Detect! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to see if the problem has already been reported. If it has, add your information as a comment to the existing issue.

When creating a bug report, please include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Environment details (browser, OS, Node.js version, etc.)
- Relevant code snippets or error messages
- Screenshots if applicable

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) when creating an issue.

### Suggesting Features

Feature suggestions are welcome! Please use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

- A clear description of the feature
- Use cases and examples
- Potential implementation approach (if you have ideas)
- Any alternatives you've considered

### Pull Requests

1. **Fork the repository** and create a branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**:

   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

3. **Commit your changes**:

   ```bash
   git commit -m "Description of your changes"
   ```

   Write clear, descriptive commit messages.

4. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**:
   - Use the PR template
   - Reference any related issues
   - Describe your changes clearly
   - Wait for CI checks to pass

## Development Setup

### Prerequisites

- **Rust** (stable): Install from [rustup.rs](https://rustup.rs/)
- **wasm-pack**: `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`
- **Node.js** v18+ and npm

### Getting Started

1. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/ChromaDetect-wasm.git
   cd ChromaDetect-wasm
   ```

2. Install dependencies:

   ```bash
   cd js && npm install
   ```

3. Build the project:

   ```bash
   ./scripts/build.sh
   ```

4. Run tests:

   ```bash
   # Rust tests
   cd rust && cargo test

   # JavaScript tests
   cd js && npm test
   ```

## Code Style

### Rust

- Follow Rust conventions (use `rustfmt`)
- Run `cargo clippy` and fix warnings
- Write tests for new functionality
- Document public APIs with doc comments

### TypeScript

- Use TypeScript strict mode
- Follow existing code style
- Add JSDoc comments for public APIs
- Run `npm run build` to check for type errors

## Testing

### Rust Tests

```bash
cd rust
cargo test              # Run all tests
cargo test --verbose    # Verbose output
```

### JavaScript Tests

```bash
cd js
npm test                # Run tests in watch mode
npm test -- --run       # Run tests once
```

**Before submitting a PR, ensure all tests pass.**

## Project Structure

```
.
├── rust/              # Rust/WASM core library
│   ├── src/
│   │   ├── lib.rs     # Main WASM bindings
│   │   ├── detection.rs
│   │   ├── clustering.rs
│   │   └── ...
│   └── tests/         # Integration tests
├── js/                # TypeScript wrapper
│   ├── src/
│   │   ├── index.ts   # Main API
│   │   ├── image-processor.ts
│   │   └── ...
│   └── wasm/          # Generated WASM files (gitignored)
└── scripts/
    └── build.sh       # Build script
```

## Commit Messages

Write clear, descriptive commit messages:

- Use present tense ("Add feature" not "Added feature")
- First line should be a summary (50 chars or less)
- Include more details in the body if needed
- Reference issues: "Fix #123"

Examples:

```
Add support for custom detection thresholds

Allow users to configure minSaturation and confidenceThreshold
through the setConfig API. Closes #45.
```

## Review Process

1. All PRs require at least one review
2. CI checks must pass
3. Code should be well-tested and documented
4. Maintainers may request changes before merging

## Questions?

Feel free to open an issue with the "question" label if you need help or clarification.

Thank you for contributing! 🎉
