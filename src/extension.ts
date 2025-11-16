import {
  ExtensionContext,
  workspace,
  window,
  StatusBarAlignment,
  MarkdownString,
  l10n,
} from "vscode";

export function activate(context: ExtensionContext) {
  const item = window.createStatusBarItem(StatusBarAlignment.Right, 100);
  item.show();

  const update = () => {
    const now = new Date();
    const locale = "zh-CN";
    const config = workspace.getConfiguration("clocks");
    const tips = [undefined, ...config.worldClocks]?.map((x: string) => {
      const time = now.toLocaleString(locale, {
        timeZone: x,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      if (x) {
        return `- ${time} (${x})`;
      } else {
        return `- **${time} (${l10n.t("Local time")})**\n\n---`;
      }
    });

    item.text = now.toLocaleString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    item.tooltip = new MarkdownString(tips.join("\n"));
  };

  update();
  const timer = setInterval(update, 1000);

  context.subscriptions.push(item);
  context.subscriptions.push({
    dispose() {
      clearInterval(timer);
    },
  });
  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("clocks")) {
        update();
      }
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
