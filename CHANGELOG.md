# Change Log

All notable changes to the "php-refactor-extension" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2025-01-29

### ✨ Added
- **Namespace Auto-Update**: Automatically updates namespace declarations when PHP files are moved between directories
  - Detects directory changes and calculates new namespaces based on project structure
  - Updates `namespace` declarations in moved files
  - Updates all `use` statements across the entire workspace with new fully qualified names
  - Configurable root namespace and source directory settings
- **Enhanced Reference Detection**: Improved reference finding with categorized patterns
  - Categorizes references by type (use statements, static calls, instantiation, etc.)
  - Better handling of fully qualified class names in references
  - Enhanced Laravel-specific reference patterns
- **Configuration Options**: 
  - `phpRefactor.updateNamespaces`: Enable/disable automatic namespace updates (default: true)
  - `phpRefactor.rootNamespace`: Set project root namespace (default: "App")  
  - `phpRefactor.srcDirectory`: Set source directory path (default: "app")
- **Comprehensive Test Coverage**: Added 18+ new tests for namespace functionality
  - Namespace detection from file paths
  - Directory change detection logic
  - Fully qualified name handling
  - Edge case coverage for various path formats

### 🚀 Enhanced  
- **Move Detection**: Now distinguishes between simple renames and directory moves
- **Reference Updates**: Smarter handling of different reference types during updates
- **User Messages**: More descriptive prompts showing both class name and namespace changes
- **Error Handling**: Better validation and error reporting for namespace operations

### 🔧 Technical
- Added `ReferenceLocation` type classification for better reference handling
- Enhanced `PHPClass` interface with fully qualified name support
- Improved path normalization for cross-platform compatibility
- Better regex patterns for namespace and use statement matching

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