import * as vscode from "vscode";
import { createStatusBarClocks } from "./clocks";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(createStatusBarClocks(context));
}

// This method is called when your extension is deactivated
export function deactivate() {}
