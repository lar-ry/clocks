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
  env,
} from "vscode";
import { Lunar } from "lunar-typescript";

const getJieqiOffset = (time: Date) => {
  const jieqi = Lunar.fromDate(time).getJieQi().toString();
  if (jieqi) {
    return jieqi;
  }
  const prev = Lunar.fromDate(time).getPrevJieQi();
  const next = Lunar.fromDate(time).getNextJieQi();
  const prevOffset =
    time.getTime() - new Date(prev.getSolar().toYmd()).getTime();
  const nextOffset =
    time.getTime() - new Date(next.getSolar().toYmd()).getTime();

  if (Math.abs(prevOffset) - Math.abs(nextOffset) <= 0) {
    return prev.toString() + `+${Math.floor(prevOffset / 86400000)}天`;
  } else {
    return next.toString() + `${Math.floor(nextOffset / 86400000)}天`;
  }
};

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
  return time.toLocaleString(env.language, {
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
    getTimeLocaleString({ config, time: now }) +
    ` (${l10n.t("Local time")})` +
    (config.showLunar
      ? `  \n${Lunar.fromDate(now).toString()} ${getJieqiOffset(now)}`
      : "");
  const worldClocksTips = config.worldClocks?.map(
    (x: string) =>
      getTimeLocaleString({ config, time: now, timeZone: x }) + ` (${x})`
  );
  item.text = "";
  if (
    config.alarms.enable &&
    Object.keys(config.alarms.items)?.includes(nowHourMinute)
  ) {
    item.backgroundColor =
      now.getSeconds() % 2 === 0
        ? new ThemeColor("statusBarItem.warningBackground")
        : undefined;
    item.text = config.alarms.items[nowHourMinute];
  } else {
    item.backgroundColor = undefined;
  }
  item.text += config.alarms.enable ? "$(bell)" : "$(bell-slash)";
  item.text += getTimeLocaleString({ config, time: now, isText: true });
  item.tooltip = new MarkdownString(
    localTimeTip +
      "\n\n---\n\n" +
      worldClocksTips.join("  \n") +
      "\n\n---\n\n" +
      `${
        config.alarms.enable
          ? "$(bell) " + l10n.t("Alarms are enable")
          : "$(bell-slash) " + l10n.t("Alarms are disable")
      }  \n`,
    true
  );
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
