import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface PHPClass {
    name: string;
    namespace?: string;
    line: number;
    fullQualifiedName?: string;
}

interface ReferenceLocation {
    file: string;
    line: number;
    column: number;
    text: string;
    type: 'use' | 'new' | 'static' | 'extends' | 'implements' | 'other';
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

    // Check if any recently deleted file had a different class name or was in a different directory
    const fiveSecondsAgo = Date.now() - 5000;
    const recentDeletions = Array.from(recentlyDeleted.entries())
        .filter(([_, time]) => time > fiveSecondsAgo)
        .map(([filePath, _]) => filePath);

    for (const oldPath of recentDeletions) {
        const oldClassName = getClassNameFromFileName(oldPath);
        const oldDirectory = path.dirname(oldPath);
        const newDirectory = path.dirname(newPath);
        
        // Check if this is a move to a different directory or a simple rename
        const isDirectoryChange = oldDirectory !== newDirectory;
        const isClassNameChange = oldClassName !== newClassName;
        
        if (isDirectoryChange || isClassNameChange) {
            await promptForRefactoring(newUri, oldPath, oldClassName, newClassName, isDirectoryChange);
            recentlyDeleted.delete(oldPath);
            return;
        }
    }

    // If no matching deletion found, check if the current file's class name matches the filename
    await checkClassNameAlignment(newUri);
}

async function promptForRefactoring(uri: vscode.Uri, oldPath: string, oldClassName: string, newClassName: string, isDirectoryChange: boolean) {
    const config = vscode.workspace.getConfiguration('phpRefactor');
    const autoUpdate = config.get<boolean>('autoUpdate', false);
    const updateNamespaces = config.get<boolean>('updateNamespaces', true);

    let message = `PHP file ${isDirectoryChange ? 'moved' : 'renamed'}.`;
    
    if (oldClassName !== newClassName) {
        message += ` Update class name from "${oldClassName}" to "${newClassName}"`;
    }
    
    if (isDirectoryChange && updateNamespaces) {
        const oldNamespace = getNamespaceFromPath(oldPath);
        const newNamespace = getExpectedNamespace(uri.fsPath);
        
        if (oldNamespace !== newNamespace) {
            if (oldClassName !== newClassName) {
                message += ` and namespace from "${oldNamespace}" to "${newNamespace}"`;
            } else {
                message += ` Update namespace from "${oldNamespace}" to "${newNamespace}"`;
            }
        }
    }
    
    message += ` and all references?`;

    if (!autoUpdate) {
        const choice = await vscode.window.showInformationMessage(message, 'Yes', 'No');
        if (choice !== 'Yes') {
            return;
        }
    }

    await performRefactoring(uri, oldPath, oldClassName, newClassName, isDirectoryChange);
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
            await performRefactoring(uri, uri.fsPath, phpClass.name, expectedClassName, false);
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

    await performRefactoring(uri, uri.fsPath, phpClass.name, expectedClassName, false);
}

async function performRefactoring(uri: vscode.Uri, oldPath: string, oldClassName: string, newClassName: string, isDirectoryChange: boolean) {
    try {
        const config = vscode.workspace.getConfiguration('phpRefactor');
        const updateNamespaces = config.get<boolean>('updateNamespaces', true);
        
        let oldNamespace: string | null = null;
        let newNamespace: string | null = null;
        
        // Determine old and new namespaces if this is a directory change
        if (isDirectoryChange && updateNamespaces) {
            oldNamespace = getNamespaceFromPath(oldPath);
            newNamespace = getExpectedNamespace(uri.fsPath);
        }

        // Update the class name and namespace in the current file
        await updateClassInFile(uri, oldClassName, newClassName, oldNamespace || undefined, newNamespace || undefined);

        // Find and update all references
        const references = await findClassReferences(oldClassName, oldNamespace || undefined);
        await updateReferences(references, oldClassName, newClassName, oldNamespace || undefined, newNamespace || undefined);

        const config2 = vscode.workspace.getConfiguration('phpRefactor');
        const showNotifications = config2.get<boolean>('showNotifications', true);

        if (showNotifications) {
            let message = `Refactored class "${oldClassName}" to "${newClassName}".`;
            if (oldNamespace && newNamespace && oldNamespace !== newNamespace) {
                message += ` Updated namespace from "${oldNamespace}" to "${newNamespace}".`;
            }
            message += ` Updated ${references.length} references.`;
            
            vscode.window.showInformationMessage(message);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Refactoring failed: ${error}`);
    }
}

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
    const config = vscode.workspace.getConfiguration('phpRefactor');
    const enableLaravelConventions = config.get<boolean>('enableLaravelConventions', true);
    
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

async function updateClassInFile(uri: vscode.Uri, oldClassName: string, newClassName: string, oldNamespace?: string, newNamespace?: string) {
    const document = await vscode.workspace.openTextDocument(uri);
    const edit = new vscode.WorkspaceEdit();

    const content = document.getText();
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Update namespace declaration
        if (oldNamespace && newNamespace && oldNamespace !== newNamespace && line.match(/^namespace\s+/)) {
            const newLine = line.replace(/^namespace\s+[^;]+;/, `namespace ${newNamespace};`);
            const range = new vscode.Range(i, 0, i, line.length);
            edit.replace(uri, range, newLine);
        }

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

async function findClassReferences(className: string, namespace?: string): Promise<ReferenceLocation[]> {
    const references: ReferenceLocation[] = [];

    // Search for references in all PHP files
    const files = await vscode.workspace.findFiles('**/*.php', '**/node_modules/**');

    for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const content = document.getText();
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Create patterns for both simple class name and fully qualified name
            const fullyQualifiedName = namespace ? `${namespace}\\${className}` : className;
            
            // Standard PHP patterns
            const patterns = [
                { pattern: new RegExp(`\\b${className}::`), type: 'static' as const },
                { pattern: new RegExp(`\\bnew\\s+${className}\\b`), type: 'new' as const },
                { pattern: new RegExp(`\\buse\\s+[^;]*\\b${className}\\b`), type: 'use' as const },
                { pattern: new RegExp(`\\buse\\s+[^;]*\\b${fullyQualifiedName}\\b`), type: 'use' as const },
                { pattern: new RegExp(`\\bextends\\s+${className}\\b`), type: 'extends' as const },
                { pattern: new RegExp(`\\bimplements\\s+[^{]*\\b${className}\\b`), type: 'implements' as const },
                { pattern: new RegExp(`\\b${className}\\s*\\(`), type: 'other' as const },
                
                // Laravel-specific patterns
                { pattern: new RegExp(`\\[${className}::class,`), type: 'other' as const },
                { pattern: new RegExp(`${className}::class`), type: 'other' as const },
                { pattern: new RegExp(`'${className}'`), type: 'other' as const },
                { pattern: new RegExp(`"${className}"`), type: 'other' as const },
                { pattern: new RegExp(`\\$${className.toLowerCase()}`), type: 'other' as const },
            ];

            for (const { pattern, type } of patterns) {
                const match = line.match(pattern);
                if (match) {
                    references.push({
                        file: file.fsPath,
                        line: i,
                        column: match.index || 0,
                        text: line.trim(),
                        type: type
                    });
                    break; // Only count one match per line to avoid duplicates
                }
            }
        }
    }

    return references;
}

async function updateReferences(references: ReferenceLocation[], oldClassName: string, newClassName: string, oldNamespace?: string, newNamespace?: string) {
    const fileEdits = new Map<string, vscode.TextEdit[]>();

    for (const ref of references) {
        if (!fileEdits.has(ref.file)) {
            fileEdits.set(ref.file, []);
        }

        const edits = fileEdits.get(ref.file)!;
        const uri = vscode.Uri.file(ref.file);
        const document = await vscode.workspace.openTextDocument(uri);
        const line = document.lineAt(ref.line);

        let newText = line.text;

        // Handle different types of references
        if (ref.type === 'use' && oldNamespace && newNamespace && oldNamespace !== newNamespace) {
            // Update use statements with full namespace changes
            const oldFullName = `${oldNamespace}\\${oldClassName}`;
            const newFullName = `${newNamespace}\\${newClassName}`;
            newText = newText.replace(new RegExp(`\\b${oldFullName.replace(/\\/g, '\\\\')}\\b`, 'g'), newFullName);
        } else {
            // For other references, just update the class name
            newText = newText.replace(new RegExp(`\\b${oldClassName}\\b`, 'g'), newClassName);
        }

        if (newText !== line.text) {
            const range = new vscode.Range(ref.line, 0, ref.line, line.text.length);
            edits.push(vscode.TextEdit.replace(range, newText));
        }
    }

    // Apply all edits
    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const [filePath, edits] of fileEdits) {
        const uri = vscode.Uri.file(filePath);
        workspaceEdit.set(uri, edits);
    }

    await vscode.workspace.applyEdit(workspaceEdit);
}

function getNamespaceFromPath(filePath: string): string | null {
    const config = vscode.workspace.getConfiguration('phpRefactor');
    const rootNamespace = config.get<string>('rootNamespace', 'App');
    const srcDirectory = config.get<string>('srcDirectory', 'app');
    
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

export function deactivate() { } 