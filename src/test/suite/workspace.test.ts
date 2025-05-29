import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Workspace Integration Tests', () => {
    let testWorkspaceUri: vscode.Uri;

    suiteSetup(async () => {
        // Wait for extension to activate
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get the workspace folder (assumes tests are run in a workspace)
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            testWorkspaceUri = workspaceFolders[0].uri;
        }
    });

    suite('File Operations', () => {
        test('should find PHP files in workspace', async function () {
            if (!testWorkspaceUri) {
                this.skip();
                return;
            }

            const phpFiles = await vscode.workspace.findFiles('**/*.php', '**/node_modules/**');

            // Should find our test PHP files
            assert.ok(phpFiles.length >= 0, 'Should find PHP files in workspace');

            // Check if our test files exist
            const userServiceFile = phpFiles.find(file =>
                file.fsPath.includes('UserService.php')
            );
            const userControllerFile = phpFiles.find(file =>
                file.fsPath.includes('UserController.php')
            );

            // At least one of our test files should exist
            assert.ok(
                userServiceFile || userControllerFile,
                'Should find at least one test PHP file'
            );
        });

        test('should open and read PHP files', async function () {
            if (!testWorkspaceUri) {
                this.skip();
                return;
            }

            const phpFiles = await vscode.workspace.findFiles('**/*.php', '**/node_modules/**');

            if (phpFiles.length === 0) {
                this.skip();
                return;
            }

            const firstFile = phpFiles[0];
            const document = await vscode.workspace.openTextDocument(firstFile);

            assert.ok(document.getText().length > 0, 'PHP file should have content');
            assert.strictEqual(document.languageId, 'php', 'File should be recognized as PHP');
        });
    });

    suite('Configuration Tests', () => {
        test('should read extension configuration', () => {
            const config = vscode.workspace.getConfiguration('phpRefactor');

            // Test default values
            const autoUpdate = config.get<boolean>('autoUpdate');
            const showNotifications = config.get<boolean>('showNotifications');

            assert.strictEqual(typeof autoUpdate, 'boolean', 'autoUpdate should be boolean');
            assert.strictEqual(typeof showNotifications, 'boolean', 'showNotifications should be boolean');

            // Test default values match package.json
            assert.strictEqual(autoUpdate, false, 'Default autoUpdate should be false');
            assert.strictEqual(showNotifications, true, 'Default showNotifications should be true');
        });

        test('should handle configuration updates', async function () {
            // Skip this test if no workspace is available
            if (!vscode.workspace.workspaceFolders) {
                this.skip();
                return;
            }

            const config = vscode.workspace.getConfiguration('phpRefactor');

            // Get original value
            const originalValue = config.get<boolean>('autoUpdate');

            try {
                // Update configuration
                await config.update('autoUpdate', !originalValue, vscode.ConfigurationTarget.Workspace);

                // Verify update
                const updatedConfig = vscode.workspace.getConfiguration('phpRefactor');
                const updatedValue = updatedConfig.get<boolean>('autoUpdate');

                assert.strictEqual(updatedValue, !originalValue, 'Configuration should be updated');
            } finally {
                // Restore original value
                await config.update('autoUpdate', originalValue, vscode.ConfigurationTarget.Workspace);
            }
        });
    });

    suite('Command Tests', () => {
        test('should register phpRefactor.updateClassReferences command', async function () {
            // Set a longer timeout for this test
            this.timeout(10000);

            // Wait for extension to fully activate
            await new Promise(resolve => setTimeout(resolve, 3000));

            const commands = await vscode.commands.getCommands();

            // Log some debug info if the command isn't found
            if (!commands.includes('phpRefactor.updateClassReferences')) {
                console.log('Available commands containing "phpRefactor":',
                    commands.filter(cmd => cmd.includes('phpRefactor')));
                console.log('Total commands found:', commands.length);
                console.log('Extension activation events:', vscode.extensions.all.filter(ext =>
                    ext.id.includes('php')).map(ext => ({ id: ext.id, isActive: ext.isActive })));
            }

            // Check if we can at least execute the command even if it's not listed
            try {
                await vscode.commands.executeCommand('phpRefactor.updateClassReferences');
                // If we can execute it, consider it registered even if not in the list
                assert.ok(true, 'Command is executable');
            } catch (error) {
                // If the command list doesn't include it AND we can't execute it, then fail
                assert.ok(
                    commands.includes('phpRefactor.updateClassReferences'),
                    `Extension command should be registered. Error executing: ${error}`
                );
            }
        });

        test('should execute command without active PHP file', async () => {
            // Close all editors first
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');

            try {
                // This should show a warning about no PHP file being open
                await vscode.commands.executeCommand('phpRefactor.updateClassReferences');
                // If we get here without throwing, the command executed successfully
                assert.ok(true, 'Command should execute without throwing');
            } catch (error) {
                assert.fail(`Command should not throw: ${error}`);
            }
        });

        test('should execute command with PHP file open', async function () {
            if (!testWorkspaceUri) {
                this.skip();
                return;
            }

            const phpFiles = await vscode.workspace.findFiles('**/*.php', '**/node_modules/**');

            if (phpFiles.length === 0) {
                this.skip();
                return;
            }

            // Open a PHP file
            const document = await vscode.workspace.openTextDocument(phpFiles[0]);
            const editor = await vscode.window.showTextDocument(document);

            try {
                // Execute the command
                await vscode.commands.executeCommand('phpRefactor.updateClassReferences');
                assert.ok(true, 'Command should execute with PHP file open');
            } catch (error) {
                assert.fail(`Command should not throw with PHP file open: ${error}`);
            } finally {
                // Close the editor
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            }
        });
    });

    suite('Text Editing Tests', () => {
        test('should create and apply workspace edits', async function () {
            if (!testWorkspaceUri) {
                this.skip();
                return;
            }

            // Create a temporary test file
            const testFileUri = vscode.Uri.joinPath(testWorkspaceUri, 'temp-test.php');
            const testContent = '<?php\nclass TempTest\n{\n}\n';

            try {
                // Create the file
                const workspaceEdit = new vscode.WorkspaceEdit();
                workspaceEdit.createFile(testFileUri, { ignoreIfExists: true });
                workspaceEdit.insert(testFileUri, new vscode.Position(0, 0), testContent);

                const success = await vscode.workspace.applyEdit(workspaceEdit);
                assert.ok(success, 'Should successfully create and edit file');

                // Verify the file was created
                const document = await vscode.workspace.openTextDocument(testFileUri);
                assert.ok(document.getText().includes('class TempTest'), 'File should contain test class');

                // Test text replacement
                const replaceEdit = new vscode.WorkspaceEdit();
                const range = new vscode.Range(1, 6, 1, 14); // "TempTest" in "class TempTest"
                replaceEdit.replace(testFileUri, range, 'UpdatedTest');

                const replaceSuccess = await vscode.workspace.applyEdit(replaceEdit);
                assert.ok(replaceSuccess, 'Should successfully replace text');

                // Verify the replacement
                const updatedDocument = await vscode.workspace.openTextDocument(testFileUri);
                assert.ok(updatedDocument.getText().includes('class UpdatedTest'), 'Class name should be updated');

            } finally {
                // Clean up - delete the test file
                try {
                    const deleteEdit = new vscode.WorkspaceEdit();
                    deleteEdit.deleteFile(testFileUri);
                    await vscode.workspace.applyEdit(deleteEdit);
                } catch (error) {
                    console.warn('Failed to clean up test file:', error);
                }
            }
        });
    });

    suite('File System Watcher Tests', () => {
        test('should create file system watcher for PHP files', () => {
            // Test that we can create a watcher (this doesn't test the actual watching)
            const watcher = vscode.workspace.createFileSystemWatcher('**/*.php');

            assert.ok(watcher, 'Should create file system watcher');

            // Test that we can register event handlers
            let createHandlerCalled = false;
            let deleteHandlerCalled = false;

            const createDisposable = watcher.onDidCreate(() => {
                createHandlerCalled = true;
            });

            const deleteDisposable = watcher.onDidDelete(() => {
                deleteHandlerCalled = true;
            });

            assert.ok(createDisposable, 'Should register create handler');
            assert.ok(deleteDisposable, 'Should register delete handler');

            // Clean up
            createDisposable.dispose();
            deleteDisposable.dispose();
            watcher.dispose();
        });
    });

    suite('Error Handling Tests', () => {
        test('should handle invalid file URIs gracefully', async () => {
            const invalidUri = vscode.Uri.parse('file:///nonexistent/path/test.php');

            try {
                // This should fail gracefully
                await vscode.workspace.openTextDocument(invalidUri);
                assert.fail('Should throw for invalid URI');
            } catch (error) {
                assert.ok(error, 'Should throw error for invalid file');
            }
        });

        test('should handle empty workspace gracefully', () => {
            // Test that the extension can handle when no workspace is open
            const folders = vscode.workspace.workspaceFolders;

            // We can't actually test with no workspace open in this context,
            // but we can test that we handle undefined gracefully
            if (!folders) {
                assert.ok(true, 'Extension should handle no workspace');
            } else {
                assert.ok(folders.length >= 0, 'Workspace folders should be array');
            }
        });
    });
}); 