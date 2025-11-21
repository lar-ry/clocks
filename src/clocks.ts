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
    return `${time} (${x ?? l10n.t("Local time")})`;
  });
  item.text = now.toLocaleString(config.language, {
    second: config.showSecond ? "2-digit" : undefined,
    ...baseOptions,
  } as Intl.DateTimeFormatOptions);
  item.tooltip = new MarkdownString(tips.join("  \n"));
};
const startClock = (item: StatusBarItem, context: ExtensionContext) => {
  let disposed = false;
  const tick = () => {
    if (disposed) {
      return;
    }
    const config = workspace.getConfiguration("clocks");
    const now = Date.now();
    update(item);
    let next;
    if (config.showSecond) {
      next = 1000 - (now % 1000);
    } else {
      next = 60000 - (now % 60000);
    }
    setTimeout(tick, next);
  };
  tick();
  context.subscriptions.push({
    dispose() {
      disposed = true;
    },
  });
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
  startClock(statusBarItem, context);

  context.subscriptions.push(statusBarItem);

  return statusBarItem;
}
