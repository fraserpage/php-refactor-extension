import * as assert from 'assert';
import * as path from 'path';

// Mock VS Code configuration for testing
const mockConfig = {
    rootNamespace: 'App',
    srcDirectory: 'app',
    updateNamespaces: true
};

// Recreate functions from extension.ts for testing
function getNamespaceFromPath(filePath: string): string | null {
    const rootNamespace = mockConfig.rootNamespace;
    const srcDirectory = mockConfig.srcDirectory;
    
    // Normalize the path
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Find the src directory in the path
    const srcIndex = normalizedPath.toLowerCase().indexOf('/' + srcDirectory.toLowerCase() + '/');
    if (srcIndex === -1) {
        return null;
    }
    
    // Extract the path after the src directory
    const relativePath = normalizedPath.substring(srcIndex + srcDirectory.length + 2);
    const directoryPath = path.dirname(relativePath);
    
    if (directoryPath === '.' || directoryPath === '') {
        return rootNamespace;
    }
    
    // Convert directory path to namespace
    const namespaceParts = directoryPath.split('/').filter(part => part.length > 0);
    return rootNamespace + '\\' + namespaceParts.join('\\');
}

function getExpectedNamespace(filePath: string): string | null {
    return getNamespaceFromPath(filePath);
}

suite('Namespace Management Tests', () => {
    suite('Namespace Detection', () => {
        test('should extract namespace from simple path', () => {
            assert.strictEqual(
                getNamespaceFromPath('/project/app/Models/User.php'),
                'App\\Models'
            );
        });

        test('should extract namespace from nested path', () => {
            assert.strictEqual(
                getNamespaceFromPath('/project/app/Http/Controllers/Admin/UserController.php'),
                'App\\Http\\Controllers\\Admin'
            );
        });

        test('should return root namespace for files in app root', () => {
            assert.strictEqual(
                getNamespaceFromPath('/project/app/User.php'),
                'App'
            );
        });

        test('should return null for files outside app directory', () => {
            assert.strictEqual(
                getNamespaceFromPath('/project/config/database.php'),
                null
            );
        });

        test('should handle Windows-style paths', () => {
            assert.strictEqual(
                getNamespaceFromPath('C:\\project\\app\\Models\\User.php'),
                'App\\Models'
            );
        });

        test('should handle Laravel directory structure', () => {
            const testCases = [
                { path: '/project/app/Http/Controllers/UserController.php', expected: 'App\\Http\\Controllers' },
                { path: '/project/app/Http/Requests/StoreUserRequest.php', expected: 'App\\Http\\Requests' },
                { path: '/project/app/Jobs/ProcessPayment.php', expected: 'App\\Jobs' },
                { path: '/project/app/Events/UserRegistered.php', expected: 'App\\Events' },
                { path: '/project/app/Listeners/SendWelcomeEmail.php', expected: 'App\\Listeners' },
                { path: '/project/app/Http/Middleware/Authenticate.php', expected: 'App\\Http\\Middleware' },
                { path: '/project/app/Http/Resources/UserResource.php', expected: 'App\\Http\\Resources' },
                { path: '/project/app/Policies/UserPolicy.php', expected: 'App\\Policies' },
            ];

            testCases.forEach(({ path, expected }) => {
                assert.strictEqual(
                    getNamespaceFromPath(path),
                    expected,
                    `Failed for path: ${path}`
                );
            });
        });

        test('should handle case insensitive app directory matching', () => {
            assert.strictEqual(
                getNamespaceFromPath('/project/APP/Models/User.php'),
                'App\\Models'
            );
        });
    });

    suite('Namespace Reference Patterns', () => {
        test('should identify use statements with namespaces', () => {
            const patterns = [
                /\buse\s+[^;]*\bUserService\b/,
                /\buse\s+[^;]*\bApp\\Services\\UserService\b/,
            ];

            const testCases = [
                'use App\\Services\\UserService;',
                'use App\\Services\\{UserService, OtherService};',
                'use App\\Services\\UserService as Service;',
            ];

            testCases.forEach(testCase => {
                const hasMatch = patterns.some(pattern => pattern.test(testCase));
                assert.ok(hasMatch, `Should match: ${testCase}`);
            });
        });

        test('should handle fully qualified class names', () => {
            const fullyQualifiedPattern = /\bApp\\Services\\UserService\b/;
            
            assert.ok(fullyQualifiedPattern.test('use App\\Services\\UserService;'));
            assert.ok(fullyQualifiedPattern.test('$service = new App\\Services\\UserService();'));
            assert.ok(fullyQualifiedPattern.test('return App\\Services\\UserService::create();'));
        });
    });

    suite('Directory Change Detection', () => {
        test('should detect when file moves between directories', () => {
            const oldPath = '/project/app/Services/UserService.php';
            const newPath = '/project/app/Http/Services/UserService.php';
            
            const oldNamespace = getNamespaceFromPath(oldPath);
            const newNamespace = getNamespaceFromPath(newPath);
            
            assert.strictEqual(oldNamespace, 'App\\Services');
            assert.strictEqual(newNamespace, 'App\\Http\\Services');
            assert.notStrictEqual(oldNamespace, newNamespace);
        });

        test('should detect no change when file renamed in same directory', () => {
            const oldPath = '/project/app/Services/UserService.php';
            const newPath = '/project/app/Services/UserManager.php';
            
            const oldNamespace = getNamespaceFromPath(oldPath);
            const newNamespace = getNamespaceFromPath(newPath);
            
            assert.strictEqual(oldNamespace, 'App\\Services');
            assert.strictEqual(newNamespace, 'App\\Services');
            assert.strictEqual(oldNamespace, newNamespace);
        });
    });

    suite('Edge Cases', () => {
        test('should handle empty directory path', () => {
            assert.strictEqual(
                getNamespaceFromPath('/project/app/.php'),
                'App'
            );
        });

        test('should handle multiple consecutive slashes', () => {
            assert.strictEqual(
                getNamespaceFromPath('/project//app//Models//User.php'),
                'App\\Models'
            );
        });

        test('should handle path without file extension', () => {
            assert.strictEqual(
                getNamespaceFromPath('/project/app/Models/User'),
                'App\\Models'
            );
        });
    });
}); 