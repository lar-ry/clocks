import { Solar } from "lunar-typescript";

export const solarToLunar = (time: Date) =>
  Solar.fromYmd(
    time.getFullYear(),
    time.getMonth() + 1,
    time.getDate()
  ).getLunar();

export const getJieqiOffset = (time: Date) => {
  const t = new Date(time);
  const jieqi = solarToLunar(t).getJieQi().toString();
  if (jieqi) {
    return jieqi;
  }
  const prev = solarToLunar(t).getPrevJieQi();
  const next = solarToLunar(t).getNextJieQi();
  const prevOffset = t.getTime() - new Date(prev.getSolar().toYmd()).getTime();
  const nextOffset = t.getTime() - new Date(next.getSolar().toYmd()).getTime();

  if (Math.abs(prevOffset) - Math.abs(nextOffset) <= 0) {
    return prev.toString() + `+${Math.floor(prevOffset / 86400000)}天`;
  } else {
    return next.toString() + `${Math.floor(nextOffset / 86400000)}天`;
  }
};
