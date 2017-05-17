'use strict';
import * as vscode from 'vscode';
import { configure as findEditor } from '@generalov/open-in-editor';

const extension = 'alt-editor';
const commands = {
    openFile: `${extension}.openFile`,
    openActiveDocument: `${extension}.openActiveDocument`
};

interface EditorOptions {
    editor?: String;
    cmd?: String;
    pattern?: String;
    terminal?: Boolean;
}

interface Editor {
    open(path: String): Promise<any>;
}

function getEditorOptions(config: vscode.WorkspaceConfiguration): EditorOptions {
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
        const editor = findEditor(editorOptions);

        if (!editor) {
            reject(new Error(`External editor not found. Please check the "${extension}" settings.`));
        } else {
            resolve(editor);
        }
    });
}

function openFile(fileName: String, line: Number = 1, column: Number = 1) {
    const config = vscode.workspace.getConfiguration(extension);
    const editorOptions = getEditorOptions(config);
    const fileLoc = `${fileName}:${line}:${column}`;
    const intro = vscode.window.setStatusBarMessage(`Opening ${fileLoc}...`);
    const res = createEditor(editorOptions)
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

function openFileCommand(uri: vscode.Uri) {
    if (!uri || uri.scheme !== 'file' || !uri.fsPath) {
        vscode.window.showErrorMessage('Please select a local file.');
        return;
    }

    openFile(uri.fsPath);
}

function openActiveDocumentCommand(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) {
    if (textEditor.document.isUntitled) {
        vscode.window.showErrorMessage('Please save the file first.');
        return;
    }

    const position = textEditor.selection.active;

    openFile(textEditor.document.fileName,
             position.line + 1,
             position.character + 1);
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(commands.openFile, openFileCommand));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand(commands.openActiveDocument, openActiveDocumentCommand));
}

export function deactivate() {
}
