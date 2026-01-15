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

interface Holiday {
  name: string;
  startDate: string;
  detail?: { weekday: string; isWork?: boolean; isHoliday?: boolean }[];
}

let alarmsEnable = true;
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

const getHoliday = ({
  config,
  time,
}: {
  config: WorkspaceConfiguration;
  time: Date;
}) => {
  if (config.holiday.showHoliday) {
    return config.holiday.items?.map((x: Holiday) => {
      const offsetDays = Math.ceil(
        (new Date(x.startDate).getTime() - time.getTime()) / 86400000
      );
      return (
        "$(calendar) " +
        l10n.t(
          offsetDays >= 1
            ? "{name} started on {startDate}, and {offsetDays} days remain, {detail}"
            : offsetDays < 0
            ? "{name} started on {startDate}, and {offsetDays} days have passed, {detail}"
            : "{name} started on {startDate}, which is today, {detail}",
          {
            name: x.name,
            startDate: new Date(x.startDate).toLocaleString(env.language, {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            offsetDays: Math.abs(offsetDays),
            detail: x?.detail
              ?.map((y) =>
                y.isWork
                  ? y.weekday
                  : y.isHoliday
                  ? `<a href="command:larry-lan.clocks.nop" title=""><b>(${y.weekday})</b></a>`
                  : `<a href="command:larry-lan.clocks.nop" title="">${y.weekday}</a>`
              )
              ?.join(""),
          }
        )
      );
    });
  } else {
    return [];
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
  const now = new Date();
  const nowHourMinute = now.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const localTimeTip =
    "$(location) " +
    getTimeLocaleString({ config, time: now }) +
    ` (${l10n.t("Local time")})` +
    (config.showLunar
      ? `  \n$(location) ${Lunar.fromDate(now).toString()} ` +
        getJieqiOffset(now) +
        `  \n$(pass) 宜: ${Lunar.fromDate(now).getDayYi().join(" ")}` +
        `  \n$(circle-slash) 忌: ${Lunar.fromDate(now).getDayJi().join(" ")}`
      : "");
  const worldClocksTips = config.worldClocks?.map(
    (x: string) =>
      "$(globe) " +
      getTimeLocaleString({ config, time: now, timeZone: x }) +
      ` (${x})`
  );
  item.text = "";
  const tooltip = new MarkdownString(undefined, true);
  tooltip.isTrusted = true;
  tooltip.supportHtml = true;
  tooltip.appendMarkdown(localTimeTip);
  tooltip.appendMarkdown("\n\n---\n\n");
  tooltip.appendMarkdown(worldClocksTips.join("  \n"));
  tooltip.appendMarkdown("\n\n---\n\n");
  tooltip.appendMarkdown(getHoliday({ time: now, config }).join("  \n"));
  tooltip.appendMarkdown("\n\n---\n\n");
  if (Object.keys(config.alarms).length) {
    if (alarmsEnable && Object.keys(config.alarms)?.includes(nowHourMinute)) {
      item.backgroundColor =
        now.getSeconds() % 2 === 0
          ? new ThemeColor("statusBarItem.warningBackground")
          : undefined;
      item.text = config.alarms[nowHourMinute];
    } else {
      item.backgroundColor = undefined;
    }
    item.text += alarmsEnable ? "$(bell)" : "$(bell-slash)";
    tooltip.appendMarkdown(
      alarmsEnable
        ? "$(bell) " + l10n.t("Alarms are enable")
        : "$(bell-slash) " + l10n.t("Alarms are disable")
    );
  } else {
    item.backgroundColor = undefined;
  }
  item.text += getTimeLocaleString({ config, time: now, isText: true });
  item.tooltip = tooltip;
  item.show();
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

let statusBarItemRef: StatusBarItem | undefined;

export function alarmsToggle() {
  alarmsEnable = !alarmsEnable;
  if (!statusBarItemRef) {
    return;
  }
  update(statusBarItemRef);
}

export function createStatusBarClocks(context: ExtensionContext) {
  const statusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Right,
    -Infinity
  );
  statusBarItemRef = statusBarItem;
  statusBarItem.command = {
    command: "larry-lan.clocks.alarmsToggle",
    title: l10n.t("Alarm toggle"),
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
