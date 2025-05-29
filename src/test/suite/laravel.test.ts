import * as assert from 'assert';
import * as path from 'path';

// Mock the VS Code configuration for testing
const mockConfig = {
    enableLaravelConventions: true,
    laravelDirectories: {
        controllers: ['Controllers', 'Http/Controllers'],
        models: ['Models'],
        requests: ['Requests', 'Http/Requests'],
        jobs: ['Jobs'],
        events: ['Events'],
        listeners: ['Listeners'],
        middleware: ['Middleware', 'Http/Middleware'],
        resources: ['Resources', 'Http/Resources'],
        policies: ['Policies']
    }
};

// Recreate the functions from extension.ts for testing
function getClassNameFromFileName(filePath: string): string {
    const basename = path.basename(filePath, '.php');
    const directory = path.dirname(filePath);
    
    // If the filename contains hyphens, underscores, or dots, convert to PascalCase
    if (basename.includes('-') || basename.includes('_') || basename.includes('.')) {
        const converted = basename
            .split(/[-_.]+/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join('');
        return applyLaravelConventions(converted, directory);
    }
    
    // If the filename is all lowercase, capitalize the first letter
    if (basename === basename.toLowerCase()) {
        const capitalized = basename.charAt(0).toUpperCase() + basename.slice(1);
        return applyLaravelConventions(capitalized, directory);
    }
    
    // If the filename already has mixed case (likely PascalCase), return as-is
    return applyLaravelConventions(basename, directory);
}

function applyLaravelConventions(className: string, directory: string): string {
    const enableLaravelConventions = mockConfig.enableLaravelConventions;
    
    if (!enableLaravelConventions) {
        return className;
    }
    
    // Laravel naming conventions based on directory structure
    if (directory.includes('/Controllers') || directory.includes('\\Controllers')) {
        // Controllers should end with "Controller"
        if (!className.endsWith('Controller')) {
            return className + 'Controller';
        }
    } else if (directory.includes('/Requests') || directory.includes('\\Requests')) {
        // Form Requests should end with "Request"
        if (!className.endsWith('Request')) {
            return className + 'Request';
        }
    } else if (directory.includes('/Jobs') || directory.includes('\\Jobs')) {
        // Jobs should end with "Job"
        if (!className.endsWith('Job')) {
            return className + 'Job';
        }
    } else if (directory.includes('/Events') || directory.includes('\\Events')) {
        // Events should end with "Event"
        if (!className.endsWith('Event')) {
            return className + 'Event';
        }
    } else if (directory.includes('/Listeners') || directory.includes('\\Listeners')) {
        // Listeners should end with "Listener"
        if (!className.endsWith('Listener')) {
            return className + 'Listener';
        }
    } else if (directory.includes('/Middleware') || directory.includes('\\Middleware')) {
        // Middleware should end with "Middleware"
        if (!className.endsWith('Middleware')) {
            return className + 'Middleware';
        }
    } else if (directory.includes('/Resources') || directory.includes('\\Resources')) {
        // Resources should end with "Resource"
        if (!className.endsWith('Resource')) {
            return className + 'Resource';
        }
    } else if (directory.includes('/Policies') || directory.includes('\\Policies')) {
        // Policies should end with "Policy"
        if (!className.endsWith('Policy')) {
            return className + 'Policy';
        }
    }
    
    return className;
}

suite('Laravel Integration Tests', () => {
    suite('Laravel Naming Conventions', () => {
        test('should add Controller suffix in Controllers directory', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Http/Controllers/User.php'),
                'UserController'
            );
            assert.strictEqual(
                getClassNameFromFileName('/app/Http/Controllers/user-profile.php'),
                'UserProfileController'
            );
        });

        test('should not double-add Controller suffix', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Http/Controllers/UserController.php'),
                'UserController'
            );
        });

        test('should add Request suffix in Requests directory', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Http/Requests/StoreUser.php'),
                'StoreUserRequest'
            );
            assert.strictEqual(
                getClassNameFromFileName('/app/Http/Requests/store-user.php'),
                'StoreUserRequest'
            );
        });

        test('should add Job suffix in Jobs directory', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Jobs/ProcessPayment.php'),
                'ProcessPaymentJob'
            );
            assert.strictEqual(
                getClassNameFromFileName('/app/Jobs/process-payment.php'),
                'ProcessPaymentJob'
            );
        });

        test('should add Event suffix in Events directory', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Events/UserRegistered.php'),
                'UserRegisteredEvent'
            );
            assert.strictEqual(
                getClassNameFromFileName('/app/Events/user-registered.php'),
                'UserRegisteredEvent'
            );
        });

        test('should add Listener suffix in Listeners directory', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Listeners/SendWelcomeEmail.php'),
                'SendWelcomeEmailListener'
            );
        });

        test('should add Middleware suffix in Middleware directory', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Http/Middleware/Authenticate.php'),
                'AuthenticateMiddleware'
            );
        });

        test('should add Resource suffix in Resources directory', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Http/Resources/UserResource.php'),
                'UserResource'
            );
            assert.strictEqual(
                getClassNameFromFileName('/app/Http/Resources/User.php'),
                'UserResource'
            );
        });

        test('should add Policy suffix in Policies directory', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Policies/UserPolicy.php'),
                'UserPolicy'
            );
            assert.strictEqual(
                getClassNameFromFileName('/app/Policies/User.php'),
                'UserPolicy'
            );
        });

        test('should not add suffixes outside Laravel directories', () => {
            assert.strictEqual(
                getClassNameFromFileName('/app/Models/User.php'),
                'User'
            );
            assert.strictEqual(
                getClassNameFromFileName('/app/Services/UserService.php'),
                'UserService'
            );
        });
    });

    suite('Laravel Reference Patterns', () => {
        test('should identify Laravel route patterns', () => {
            const patterns = [
                /\[UserController::class,/, // Route definitions
                /UserController::class/, // Class constants
                /'UserController'/, // String references
                /"UserController"/, // Double-quoted string references
            ];

            const testCases = [
                "Route::get('/users', [UserController::class, 'index']);",
                "return UserController::class;",
                "config('auth.providers.users.model' => 'UserController')",
                'return view("users.index", ["controller" => "UserController"]);',
            ];

            testCases.forEach((testCase, index) => {
                assert.ok(
                    patterns[index].test(testCase),
                    `Pattern ${index} should match: ${testCase}`
                );
            });
        });

        test('should not match unrelated text', () => {
            const pattern = /\[UserController::class,/;
            assert.ok(
                !pattern.test('SomeOtherController::class'),
                'Should not match different class'
            );
        });
    });
}); 