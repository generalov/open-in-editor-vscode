'use strict';
import * as vscode from 'vscode';
import { configure as findEditor } from '@generalov/open-in-editor';

const extension = 'alt-editor';

interface EditorConfig {
    name?: String;
    binary?: String;
    args?: String;
    terminal?: Boolean;
}

interface EditorOptions {
    editor?: String;
    cmd?: String;
    pattern?: String;
    terminal?: Boolean;
}

interface Editor {
    open(path: String): Promise<any>;
}

function getEditorOptions(config: EditorConfig): EditorOptions {
    const editorOptions: EditorOptions  = {};

    if (config.name != null) {
        editorOptions.editor = String(config.name);
    }
    if (config.binary != null) {
        editorOptions.cmd = String(config.binary);
    }
    if (config.args != null) {
        editorOptions.pattern = String(config.args);
    }
    if (config.terminal != null) {
        editorOptions.terminal = Boolean(config.terminal);
    }

    return editorOptions;
}

function createEditor(editorOptions: EditorOptions) {
    return new Promise((resolve, reject) => {
        if (!Object.keys(editorOptions)) {
            reject(new Error(`No editor configuration found. Please check the "${extension}" settings.`));
            return;
        }

        const editor = findEditor(editorOptions);

        if (!editor) {
            reject(new Error(`External editor not found. Please check the "${extension}" settings.`));
            return;
        } else {
            resolve(editor);
            return;
        }
    });
}

function openFile(fileName: String, line: Number = 1, column: Number = 1, config: EditorConfig={}) {
    if (!config || Object.keys(config).length === 0) {
        config = <EditorConfig>vscode.workspace.getConfiguration(extension);
    }
    const options = getEditorOptions(config);
    const fileLoc = `${fileName}:${line}:${column}`;
    const intro = vscode.window.setStatusBarMessage(`Opening ${fileLoc}...`);
    const res = createEditor(options)
        .then((editor: Editor) => editor.open(fileLoc))
        .then((openResult: any) => {
            intro.dispose();
            vscode.window.setStatusBarMessage(`Opened ${fileLoc}`, 5000);

            return openResult;
        })
        .catch((err) => {
            vscode.window.showErrorMessage(`Can't open the file ${fileLoc}: ${err}`)
                .then(() => intro.dispose());
        });

    return res;
}

function openTextEditorFile(textEditor: vscode.TextEditor, config: EditorConfig) {
    if (textEditor.document.isUntitled) {
        vscode.window.showErrorMessage('Please save the file first.');
        return;
    }

    const position = textEditor.selection.active;

    return openFile(textEditor.document.fileName,
             position.line + 1,
             position.character + 1,
             config);
}


function openFileMenu(uri: vscode.Uri) {
    if (!uri || uri.scheme !== 'file' || !uri.fsPath) {
        vscode.window.showErrorMessage('Please select a local file.');
        return;
    }

    return openFile(uri.fsPath);
}

function openFileCommand(...args: any[]) {
    if (args.length === 0) {
        openTextEditorFile(vscode.window.activeTextEditor, null);
    } else if (args[0].scheme) {
        if (vscode.window.activeTextEditor && args[0].path === vscode.window.activeTextEditor.document.fileName) {
            openTextEditorFile(vscode.window.activeTextEditor, args[0])
        } else {
            openFileMenu(args[0])
        }
    } else if (args[0].document) {
        openTextEditorFile(args[0], null)
    } else if (args.length === 1) {
        openTextEditorFile(vscode.window.activeTextEditor, args[0])
    } else {
        vscode.window.showErrorMessage('Invalid arguments.');
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(`${extension}.openFile`, openFileCommand));
}

export function deactivate() {
}
