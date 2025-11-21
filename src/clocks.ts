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
  const baseOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: config.hour12,
    weekday: config.weekday || undefined,
  };
  const tips = [undefined, ...config.worldClocks]?.map((x: string) => {
    const time = now.toLocaleString(config.language, {
      timeZone: x,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...baseOptions,
    } as Intl.DateTimeFormatOptions);
    if (x) {
      return `\n- ${time} (${x})`;
    } else {
      return `- **${time} (${l10n.t("Local time")})**`;
    }
  });

  item.text = now.toLocaleString(config.language, {
    second: config.showSecond ? "2-digit" : undefined,
    ...baseOptions,
  } as Intl.DateTimeFormatOptions);

  item.tooltip = new MarkdownString(tips.join("\n"));
};

export function createStatusBarClocks(context: ExtensionContext) {
  const statusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Right,
    -Infinity
  );

  statusBarItem.command = {
    command: "workbench.action.openSettings",
    title: "openSettings",
    arguments: ["@ext:larry-lan.clocks"],
  };
  statusBarItem.show();
  const timer = setInterval(() => update(statusBarItem), 1000);

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push({
    dispose() {
      clearInterval(timer);
    },
  });

  return statusBarItem;
}
