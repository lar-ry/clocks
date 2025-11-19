import { title } from "process";
import {
  ExtensionContext,
  workspace,
  window,
  StatusBarAlignment,
  MarkdownString,
  l10n,
  StatusBarItem,
} from "vscode";

const update = (item: StatusBarItem) => {
  const config = workspace.getConfiguration("clocks");
  const now = new Date();
  const locale = "zh-CN";
  const baseOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: config.hour12,
  };
  const tips = [undefined, ...config.worldClocks]?.map((x: string) => {
    const time = now.toLocaleString(locale, {
      timeZone: x,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...baseOptions,
    } as Intl.DateTimeFormatOptions);
    if (x) {
      return `- ${time} (${x})`;
    } else {
      return `- **${time} (${l10n.t("Local time")})**\n\n---`;
    }
  });

  item.text = now.toLocaleString(locale, {
    second: config.showSecond ? "2-digit" : undefined,
    ...baseOptions,
  } as Intl.DateTimeFormatOptions);

  item.tooltip = new MarkdownString(tips.join("\n"));
  item.show();
  item.command = {
    command: "workbench.action.openSettings",
    title: "openSettings",
    arguments: ["@ext:larry-lan.clocks"],
  };
};

export function createStatusBarClocks(context: ExtensionContext) {
  const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right);

  const timer = setInterval(() => update(statusBarItem), 1000);

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push({
    dispose() {
      clearInterval(timer);
    },
  });

  return statusBarItem;
}
