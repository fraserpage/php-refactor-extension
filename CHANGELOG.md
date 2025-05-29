# Change Log

All notable changes to the "php-refactor-extension" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2024-05-29

### Added
- Initial release of PHP Refactor Helper
- Automatic file watching for PHP file renames/moves
- Smart class name detection and extraction
- Reference finding across all PHP files in workspace
- Support for various PHP reference patterns:
  - Class instantiation (`new ClassName()`)
  - Static method calls (`ClassName::method()`)
  - Use statements (`use Namespace\ClassName`)
  - Class inheritance (`extends ClassName`)
  - Interface implementation (`implements ClassName`)
- Manual refactoring command: `phpRefactor.updateClassReferences`
- Configuration options for auto-update and notifications
- Comprehensive test suite with 30+ tests
- Support for kebab-case and snake_case filename conversion to PascalCase

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