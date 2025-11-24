import {
  ExtensionContext,
  workspace,
  window,
  StatusBarAlignment,
  MarkdownString,
  StatusBarItem,
  WorkspaceConfiguration,
  l10n,
  ThemeColor,
} from "vscode";

const getTimeLocaleString = ({
  config,
  time,
  timeZone,
  isText,
}: {
  config: WorkspaceConfiguration;
  time: Date;
  timeZone?: string;
  isText?: boolean;
}) => {
  return time.toLocaleString(config.language, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    year: isText ? undefined : "numeric",
    month: isText ? undefined : "2-digit",
    day: isText ? undefined : "2-digit",
    hour12: config.hour12,
    weekday: isText ? config.clock.weekday || undefined : "long",
    second: isText && config.clock.showSecond ? "2-digit" : undefined,
  });
};

const update = (item: StatusBarItem) => {
  const config = workspace.getConfiguration("clocks");
  if (!config.enable) {
    item.hide();
    return;
  }
  item.show();
  const now = new Date();
  const nowHourMinute = now.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const localTimeTip =
    getTimeLocaleString({ config, time: now }) + ` (${l10n.t("Local time")})`;
  const worldClocksTips = config.worldClocks?.map(
    (x: string) =>
      getTimeLocaleString({ config, time: now, timeZone: x }) + ` (${x})`
  );
  const alarmsTips = Object.entries(config.alarms.list).map(([k, v]) => {
    if (/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(k)) {
      return nowHourMinute === k ? `**${k} (${v})**` : `${k} (${v})`;
    }
    return `~~${k} (${v})~~`;
  });

  item.text = getTimeLocaleString({ config, time: now, isText: true });
  item.tooltip = new MarkdownString(
    localTimeTip +
      "\n\n---\n\n" +
      worldClocksTips.join("  \n") +
      "\n\n---\n\n" +
      `${
        config.alarms.enable
          ? l10n.t("All alarms are turned on")
          : l10n.t("All alarms are turned off")
      }  \n` +
      alarmsTips.join("  \n")
  );
  item.backgroundColor =
    config.alarms.enable &&
    Object.keys(config.alarms.list)?.includes(nowHourMinute)
      ? new ThemeColor("statusBarItem.warningBackground")
      : undefined;
};

let currentClockDispose: { dispose(): void } | null = null;

const startClock = (item: StatusBarItem): { dispose(): void } => {
  let disposed = false;
  let timer: NodeJS.Timeout | null = null;

  const tick = () => {
    if (disposed) {
      return;
    }

    update(item);

    const now = Date.now();
    const config = workspace.getConfiguration("clocks");
    const next = config.clock.showSecond
      ? 1000 - (now % 1000)
      : 60000 - (now % 60000);

    timer = setTimeout(tick, next);
  };

  tick();

  return {
    dispose() {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
      }
    },
  };
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

  currentClockDispose = startClock(statusBarItem);

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("clocks")) {
        currentClockDispose?.dispose();
        currentClockDispose = startClock(statusBarItem);
      }
    })
  );
  context.subscriptions.push(statusBarItem);

  return statusBarItem;
}
