# PHP Refactor Helper

A VS Code extension that automatically watches for PHP file renames/moves and offers to update class names and all references throughout your codebase.

## Features

- **Automatic File Watching**: Monitors PHP files for rename and move operations
- **Smart Class Name Detection**: Extracts class names from PHP files and compares with filename conventions
- **Namespace Management**: Automatically updates namespace declarations when files are moved between directories
- **Reference Finding**: Searches across all PHP files for class references including:
  - Class instantiation (`new ClassName()`)
  - Static method calls (`ClassName::method()`)
  - Use statements (`use Namespace\ClassName`)
  - Class inheritance (`extends ClassName`)
  - Interface implementation (`implements ClassName`)
  - Fully qualified class names (`App\Services\ClassName::method()`)
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
- `phpRefactor.enableLaravelConventions`: Apply Laravel naming conventions based on directory structure (default: true)
- `phpRefactor.laravelDirectories`: Configure Laravel component directory patterns
- `phpRefactor.updateNamespaces`: Automatically update namespace declarations when files are moved to different directories (default: true)
- `phpRefactor.rootNamespace`: The root namespace for your PHP project (default: "App")
- `phpRefactor.srcDirectory`: The source directory containing your PHP classes (default: "app")

## Laravel Integration

This extension includes special support for Laravel projects:

### **Laravel Naming Conventions**
Automatically applies Laravel naming conventions based on directory structure:

- **Controllers** (`/Controllers/`): Adds "Controller" suffix
  - `user.php` → `UserController`
  - `user-profile.php` → `UserProfileController`

- **Form Requests** (`/Requests/`): Adds "Request" suffix
  - `store-user.php` → `StoreUserRequest`

- **Jobs** (`/Jobs/`): Adds "Job" suffix  
  - `process-payment.php` → `ProcessPaymentJob`

- **Events** (`/Events/`): Adds "Event" suffix
  - `user-registered.php` → `UserRegisteredEvent`

- **Listeners** (`/Listeners/`): Adds "Listener" suffix
  - `send-welcome-email.php` → `SendWelcomeEmailListener`

- **Middleware** (`/Middleware/`): Adds "Middleware" suffix
  - `authenticate.php` → `AuthenticateMiddleware`

- **Resources** (`/Resources/`): Adds "Resource" suffix
  - `user.php` → `UserResource`

- **Policies** (`/Policies/`): Adds "Policy" suffix
  - `user.php` → `UserPolicy`

### **Laravel Reference Detection**
Finds and updates Laravel-specific patterns:
- Route definitions: `[UserController::class, 'method']`
- Class constants: `User::class`
- String references in config files and views
- Variable names based on class names

### **Disable Laravel Features**
If you're not using Laravel, disable the conventions:
```json
{
  "phpRefactor.enableLaravelConventions": false
}
```

## Examples

### File Rename Detection
```
Before: UserService.php containing "class UserManager"
After:  Rename file to UserManager.php
Result: Extension prompts to rename class to "UserManager" and update all references
```

### File Move with Namespace Update
```
Before: app/Services/UserService.php with "namespace App\Services;"
After:  Move to app/Http/Services/UserService.php
Result: Extension updates namespace to "App\Http\Services" and all use statements
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

### Namespace Updates
When `UserService` is moved from `app/Services/` to `app/Http/Services/`:
```php
// File: app/Http/Services/UserService.php
// Before
<?php
namespace App\Services;
class UserService {}

// After  
<?php
namespace App\Http\Services;
class UserService {}

// Other files with references
// Before
use App\Services\UserService;

// After
use App\Http\Services\UserService;
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