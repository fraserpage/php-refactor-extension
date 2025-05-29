import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface PHPClass {
    name: string;
    namespace?: string;
    line: number;
}

interface ReferenceLocation {
    file: string;
    line: number;
    column: number;
    text: string;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('PHP Refactor Helper is now active!');

    // Register file system watcher for PHP files
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.php');

    // Handle file rename/move events
    watcher.onDidCreate(async (uri) => {
        // Check if this might be a rename operation by looking for recently deleted files
        await handlePossibleRename(uri);
    });

    watcher.onDidDelete(async (uri) => {
        // Store deleted file info for potential rename detection
        recentlyDeleted.set(uri.fsPath, Date.now());

        // Clean up old entries (older than 5 seconds)
        setTimeout(() => {
            recentlyDeleted.delete(uri.fsPath);
        }, 5000);
    });

    // Register command for manual refactoring
    const disposable = vscode.commands.registerCommand('phpRefactor.updateClassReferences', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.languageId !== 'php') {
            vscode.window.showWarningMessage('Please open a PHP file to refactor.');
            return;
        }

        await refactorCurrentFile(activeEditor.document.uri);
    });

    context.subscriptions.push(disposable, watcher);
}

// Map to track recently deleted files for rename detection
const recentlyDeleted = new Map<string, number>();

async function handlePossibleRename(newUri: vscode.Uri) {
    // Wait a bit to see if there was a recent deletion (indicating a rename)
    await new Promise(resolve => setTimeout(resolve, 100));

    const newPath = newUri.fsPath;
    const newClassName = getClassNameFromFileName(newPath);

    // Check if any recently deleted file had a different class name
    const fiveSecondsAgo = Date.now() - 5000;
    const recentDeletions = Array.from(recentlyDeleted.entries())
        .filter(([_, time]) => time > fiveSecondsAgo)
        .map(([filePath, _]) => filePath);

    for (const oldPath of recentDeletions) {
        const oldClassName = getClassNameFromFileName(oldPath);
        if (oldClassName !== newClassName) {
            // This looks like a rename that might need refactoring
            await promptForRefactoring(newUri, oldClassName, newClassName);
            recentlyDeleted.delete(oldPath);
            return;
        }
    }

    // If no matching deletion found, check if the current file's class name matches the filename
    await checkClassNameAlignment(newUri);
}

async function promptForRefactoring(uri: vscode.Uri, oldClassName: string, newClassName: string) {
    const config = vscode.workspace.getConfiguration('phpRefactor');
    const autoUpdate = config.get<boolean>('autoUpdate', false);

    if (!autoUpdate) {
        const choice = await vscode.window.showInformationMessage(
            `PHP file renamed. Update class name from "${oldClassName}" to "${newClassName}" and all references?`,
            'Yes', 'No'
        );

        if (choice !== 'Yes') {
            return;
        }
    }

    await performRefactoring(uri, oldClassName, newClassName);
}

async function checkClassNameAlignment(uri: vscode.Uri) {
    const document = await vscode.workspace.openTextDocument(uri);
    const phpClass = extractPHPClass(document.getText());

    if (!phpClass) {
        return;
    }

    const expectedClassName = getClassNameFromFileName(uri.fsPath);

    if (phpClass.name !== expectedClassName) {
        const choice = await vscode.window.showInformationMessage(
            `Class name "${phpClass.name}" doesn't match filename. Rename to "${expectedClassName}"?`,
            'Yes', 'No'
        );

        if (choice === 'Yes') {
            await performRefactoring(uri, phpClass.name, expectedClassName);
        }
    }
}

async function refactorCurrentFile(uri: vscode.Uri) {
    const document = await vscode.workspace.openTextDocument(uri);
    const phpClass = extractPHPClass(document.getText());

    if (!phpClass) {
        vscode.window.showWarningMessage('No PHP class found in this file.');
        return;
    }

    const expectedClassName = getClassNameFromFileName(uri.fsPath);

    if (phpClass.name === expectedClassName) {
        vscode.window.showInformationMessage('Class name already matches filename.');
        return;
    }

    await performRefactoring(uri, phpClass.name, expectedClassName);
}

async function performRefactoring(uri: vscode.Uri, oldClassName: string, newClassName: string) {
    try {
        // Update the class name in the current file
        await updateClassInFile(uri, oldClassName, newClassName);

        // Find and update all references
        const references = await findClassReferences(oldClassName);
        await updateReferences(references, oldClassName, newClassName);

        const config = vscode.workspace.getConfiguration('phpRefactor');
        const showNotifications = config.get<boolean>('showNotifications', true);

        if (showNotifications) {
            vscode.window.showInformationMessage(
                `Refactored class "${oldClassName}" to "${newClassName}". Updated ${references.length} references.`
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Refactoring failed: ${error}`);
    }
}

function getClassNameFromFileName(filePath: string): string {
    const basename = path.basename(filePath, '.php');
    // Convert kebab-case or snake_case to PascalCase
    return basename
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');
}

function extractPHPClass(content: string): PHPClass | null {
    // Match class declaration
    const classMatch = content.match(/^(?:abstract\s+|final\s+)?class\s+(\w+)/m);
    if (!classMatch) {
        return null;
    }

    const className = classMatch[1];
    const lines = content.split('\n');
    const classLine = lines.findIndex(line => line.includes(classMatch[0]));

    // Extract namespace if present
    const namespaceMatch = content.match(/^namespace\s+([^;]+);/m);
    const namespace = namespaceMatch ? namespaceMatch[1] : undefined;

    return {
        name: className,
        namespace,
        line: classLine
    };
}

async function updateClassInFile(uri: vscode.Uri, oldClassName: string, newClassName: string) {
    const document = await vscode.workspace.openTextDocument(uri);
    const edit = new vscode.WorkspaceEdit();

    const content = document.getText();
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Update class declaration
        if (line.match(new RegExp(`class\\s+${oldClassName}\\b`))) {
            const newLine = line.replace(new RegExp(`\\b${oldClassName}\\b`, 'g'), newClassName);
            const range = new vscode.Range(i, 0, i, line.length);
            edit.replace(uri, range, newLine);
        }

        // Update constructor calls (new ClassName)
        if (line.includes(`new ${oldClassName}`)) {
            const newLine = line.replace(new RegExp(`\\bnew\\s+${oldClassName}\\b`, 'g'), `new ${newClassName}`);
            const range = new vscode.Range(i, 0, i, line.length);
            edit.replace(uri, range, newLine);
        }
    }

    await vscode.workspace.applyEdit(edit);
}

async function findClassReferences(className: string): Promise<ReferenceLocation[]> {
    const references: ReferenceLocation[] = [];

    // Search for references in all PHP files
    const files = await vscode.workspace.findFiles('**/*.php', '**/node_modules/**');

    for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const content = document.getText();
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Look for various types of references
            const patterns = [
                new RegExp(`\\b${className}::`), // Static calls
                new RegExp(`\\bnew\\s+${className}\\b`), // Constructor calls
                new RegExp(`\\buse\\s+[^;]*\\b${className}\\b`), // Use statements
                new RegExp(`\\bextends\\s+${className}\\b`), // Inheritance
                new RegExp(`\\bimplements\\s+[^{]*\\b${className}\\b`), // Interface implementation
                new RegExp(`\\b${className}\\s*\\(`), // Function-style calls
            ];

            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    references.push({
                        file: file.fsPath,
                        line: i,
                        column: match.index || 0,
                        text: line.trim()
                    });
                }
            }
        }
    }

    return references;
}

async function updateReferences(references: ReferenceLocation[], oldClassName: string, newClassName: string) {
    const fileEdits = new Map<string, vscode.TextEdit[]>();

    for (const ref of references) {
        if (!fileEdits.has(ref.file)) {
            fileEdits.set(ref.file, []);
        }

        const edits = fileEdits.get(ref.file)!;
        const uri = vscode.Uri.file(ref.file);
        const document = await vscode.workspace.openTextDocument(uri);
        const line = document.lineAt(ref.line);

        // Replace the old class name with the new one
        const newText = line.text.replace(new RegExp(`\\b${oldClassName}\\b`, 'g'), newClassName);
        const range = new vscode.Range(ref.line, 0, ref.line, line.text.length);

        edits.push(vscode.TextEdit.replace(range, newText));
    }

    // Apply all edits
    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const [filePath, edits] of fileEdits) {
        const uri = vscode.Uri.file(filePath);
        workspaceEdit.set(uri, edits);
    }

    await vscode.workspace.applyEdit(workspaceEdit);
}

export function deactivate() { } 