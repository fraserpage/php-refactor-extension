# PHP Refactor Helper

A VS Code extension that automatically watches for PHP file renames/moves and offers to update class names and all references throughout your codebase.

## Features

- **Automatic File Watching**: Monitors PHP files for rename and move operations
- **Smart Class Name Detection**: Extracts class names from PHP files and compares with filename conventions
- **Reference Finding**: Searches across all PHP files for class references including:
  - Class instantiation (`new ClassName()`)
  - Static method calls (`ClassName::method()`)
  - Use statements (`use Namespace\ClassName`)
  - Class inheritance (`extends ClassName`)
  - Interface implementation (`implements ClassName`)
- **Batch Updates**: Updates all references in a single operation
- **Manual Refactoring**: Command to manually trigger refactoring for the current file
- **Configurable Behavior**: Settings to control automatic updates and notifications

## Installation

1. Clone or download this repository
2. Open the folder in VS Code
3. Press `F5` to launch a new Extension Development Host window
4. The extension will be active in the new window

To package the extension:
```bash
npm install -g vsce
vsce package
```

## Usage

### Automatic Mode
1. Open a PHP project in VS Code
2. Rename or move a PHP file
3. The extension will detect the change and prompt you to update the class name and references
4. Choose "Yes" to apply the changes automatically

### Manual Mode
1. Open a PHP file
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the command palette
3. Type "Update PHP Class References" and select the command
4. The extension will analyze the current file and update class names to match the filename

## Configuration

Access settings via `File > Preferences > Settings` and search for "PHP Refactor":

- `phpRefactor.autoUpdate`: Automatically update class names and references without prompting (default: false)
- `phpRefactor.showNotifications`: Show notifications when refactoring is performed (default: true)

## Examples

### File Rename Detection
```
Before: UserService.php containing "class UserManager"
After:  Rename file to UserManager.php
Result: Extension prompts to rename class to "UserManager" and update all references
```

### Class Name Alignment
```
Before: user-service.php containing "class SomeClass"
After:  Open the file
Result: Extension suggests renaming class to "UserService"
```

### Reference Updates
When a class is renamed from `UserService` to `UserManager`, the extension will update:
```php
// Before
use App\Services\UserService;
$service = new UserService();
UserService::staticMethod();
class Controller extends UserService {}

// After
use App\Services\UserManager;
$service = new UserManager();
UserManager::staticMethod();
class Controller extends UserManager {}
```

## File Naming Conventions

The extension converts filenames to PascalCase class names:
- `user-service.php` → `UserService`
- `user_manager.php` → `UserManager`
- `api-controller.php` → `ApiController`

## Development

### Prerequisites
- Node.js 16.x or higher
- VS Code 1.74.0 or higher

### Setup
```bash
npm install
npm run compile
```

### Running Tests
```bash
npm test
```

The test suite includes:
- **Unit Tests**: Test core functionality like filename conversion and PHP class extraction
- **Integration Tests**: Test VS Code API interactions and workspace operations
- **Pattern Matching Tests**: Verify reference detection patterns work correctly
- **Edge Case Tests**: Handle malformed input and error conditions

### Test Coverage
- ✅ **Extension Functions**: Class name extraction, filename conversion
- ✅ **Reference Patterns**: Static calls, constructors, use statements, inheritance
- ✅ **VS Code Integration**: Commands, configuration, file operations
- ✅ **Workspace Operations**: File watching, text editing, error handling
- ✅ **Edge Cases**: Empty files, malformed PHP, missing workspaces

### Development Workflow
1. Make changes to the source code in `src/`
2. Run `npm run compile` to build
3. Run `npm test` to verify all tests pass
4. Press `F5` to test in Extension Development Host
5. Use `npm run watch` for continuous compilation during development

## Requirements

- VS Code 1.74.0 or higher
- PHP files with standard class declarations

## Known Limitations

- Only detects class declarations (not traits or interfaces yet)
- Basic regex-based parsing (doesn't handle complex PHP syntax edge cases)
- Rename detection has a 5-second window for matching deletions with creations

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License 