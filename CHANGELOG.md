# Change Log

All notable changes to the "php-refactor-extension" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2025-01-29

### ✨ Added
- **Laravel Integration**: Complete Laravel support with automatic naming conventions
  - Controllers: Adds "Controller" suffix in Controllers directories
  - Form Requests: Adds "Request" suffix in Requests directories  
  - Jobs: Adds "Job" suffix in Jobs directories
  - Events: Adds "Event" suffix in Events directories
  - Listeners: Adds "Listener" suffix in Listeners directories
  - Middleware: Adds "Middleware" suffix in Middleware directories
  - Resources: Adds "Resource" suffix in Resources directories
  - Policies: Adds "Policy" suffix in Policies directories
- **Laravel Reference Patterns**: Enhanced detection for Laravel-specific patterns
  - Route definitions: `[UserController::class, 'method']`
  - Class constants: `User::class`
  - String references in config files and views
  - Variable names based on class names
- **Configuration Options**: 
  - `phpRefactor.enableLaravelConventions`: Enable/disable Laravel naming conventions
  - `phpRefactor.laravelDirectories`: Configure Laravel component directory patterns
- **Comprehensive Test Suite**: 45+ tests including Laravel-specific functionality

### 🐛 Fixed
- **Critical Bug**: Fixed filename casing logic that was incorrectly lowercasing already-proper PascalCase filenames
  - `StoreFinancialAidRequestRequest.php` now correctly preserves as `StoreFinancialAidRequestRequest`
  - Enhanced logic to detect and preserve existing PascalCase filenames
  - Improved handling of kebab-case, snake_case, and dot-separated filenames

### 🚀 Enhanced
- **Filename to Class Name Conversion**: More intelligent logic that preserves existing PascalCase
- **Reference Detection**: Added Laravel-specific patterns and improved accuracy
- **Directory Structure Awareness**: Smart suffix application based on Laravel directory conventions

## [0.0.1] - 2025-01-28

### ✨ Added
- Initial extension release
- Automatic PHP file watching for renames/moves  
- Class name and reference detection
- Workspace-wide reference updates
- Manual refactoring command
- Configuration options for auto-update and notifications
- Comprehensive test coverage (30+ tests)

### Features
- Batch updates of all class references in a single operation
- Configurable behavior through VS Code settings
- File system watcher integration
- Error handling for edge cases
- Class name alignment suggestions for mismatched filenames

### Technical
- TypeScript implementation
- Mocha test framework integration
- ESLint code quality checks
- VS Code API integration
- Comprehensive documentation 