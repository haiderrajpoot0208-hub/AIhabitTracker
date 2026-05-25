import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";

export const toDateKey = (date) => format(date, "yyyy-MM-dd");

export const todayKey = () => toDateKey(new Date());

export const last90Days = () => {
  const end = new Date();
  const start = subDays(end, 89);
  return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const currentWeekKeys = () => {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const lastNDays = (n) => {
  const end = new Date();
  const start = subDays(end, n - 1);
  return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const calcStreak = (dateKeys) => {
  const sorted = [...new Set(dateKeys)].sort().reverse();
  if (!sorted.length) return { current: 0, longest: 0 };

  const set = new Set(sorted);
  const today = todayKey();
  const yesterday = toDateKey(subDays(new Date(), 1));

  let current = 0;
  if (set.has(today) || set.has(yesterday)) {
    let cursor = set.has(today) ? new Date() : subDays(new Date(), 1);
    while (set.has(toDateKey(cursor))) {
      current += 1;
      cursor = subDays(cursor, 1);
    }
  }

  const asc = [...set].sort();
  let longest = 0;
  let run = 1;
  for (let i = 1; i < asc.length; i++) {
    const prev = new Date(asc[i - 1]);
    const cur = new Date(asc[i]);
    const diff = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }
  longest = Math.max(longest, 1);

  return { current, longest };
};
