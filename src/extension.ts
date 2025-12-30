import * as vscode from "vscode";
import { createStatusBarClocks, alarmsToggle } from "./clocks";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(createStatusBarClocks(context));
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "larry-lan.clocks.alarmsToggle",
      alarmsToggle
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("larry-lan.clocks.nop", () => {})
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
