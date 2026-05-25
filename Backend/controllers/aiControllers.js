import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import AIInsight from "../models/AIInsight.js";
import {
  chatCompletion,
  SYSTEM_PROMPTS,
  parseJSON,
} from "../utils/aiService.js";
import { lastNDays, calcStreak, todayKey } from "../utils/dateHelpers.js";

const buildWeeklyContext = async (userId) => {
  const habits = await Habit.find({ userId, isArchived: false });
  const days = lastNDays(7);
  const logs = await HabitLog.find({
    userId,
    completedDate: { $gte: days[0], $lte: days[days.length - 1] },
  });

  const perHabit = habits.map((h) => {
    const completed = logs.filter(
      (l) => String(l.habitId) === String(h._id)
    ).length;
    return {
      name: h.name,
      category: h.category,
      frequency: h.frequency,
      completedDays: completed,
      targetDays: h.targetDays,
    };
  });
  return { days, perHabit };
};

export const weeklyReport = async (req, res) => {
  try {
    const ctx = await buildWeeklyContext(req.user._id);
    if (!ctx.perHabit.length) {
      return res.json({
        content:
          "You don't have any active habits yet. Create your first habit to start tracking — I'll generate a weekly report once you have some data.",
      });
    }

    const userMsg = `Here is the user's habit data for the past 7 days (${ctx.days[0]} to ${ctx.days[6]}):\n\n${ctx.perHabit
      .map(
        (h) =>
          `- ${h.name} (${h.category}, ${h.frequency}): completed ${h.completedDays} of the past 7 days, target ${h.targetDays}/week`
      )
      .join("\n")}\n\nPlease write the personalised weekly report now.`;

    const { ok, content } = await chatCompletion({
      system: SYSTEM_PROMPTS.weekly,
      user: userMsg,
    });

    const report = ok
      ? content
      : "AI is temporarily unavailable. Keep logging habits — your data is saved and reports will improve once AI is enabled.";

    await AIInsight.create({
      userId: req.user._id,
      type: "weekly",
      content: report,
    });
    res.json({ content: report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const suggestHabits = async (req, res) => {
  try {
    const { goals, productiveTime, struggles } = req.body;
    const userMsg = `User goals: ${goals || "not provided"}\nMost productive time: ${productiveTime || "not provided"}\nPast struggles: ${struggles || "not provided"}\n\nSuggest 3 personalised habits now. Return JSON only.`;
    const { ok, content } = await chatCompletion({
      system: SYSTEM_PROMPTS.suggestion,
      user: userMsg,
    });

    let suggestions = [];
    if (ok) {
      try {
        const parsed = parseJSON(content);
        suggestions = parsed.suggestions || [];
      } catch {
        suggestions = [];
      }
    }

    if (!suggestions.length) {
      suggestions = [
        {
          name: "10-minute morning walk",
          description: "Start the day with light movement and fresh air.",
          frequency: "daily",
          category: "Fitness",
          icon: "🚶‍♂️",
        },
        {
          name: "Read 5 pages",
          description: "Short daily reading to build a learning routine.",
          frequency: "daily",
          category: "Learning",
          icon: "📚",
        },
        {
          name: "2 minutes of mindful breathing",
          description: "Pause and breathe to reset focus and reduce stress.",
          frequency: "daily",
          category: "Mindfulness",
          icon: "🧘",
        },
      ];
    }

    await AIInsight.create({
      userId: req.user._id,
      type: "suggestion",
      content: JSON.stringify(suggestions),
      meta: { goals, productiveTime, struggles },
    });
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const recoveryPlan = async (req, res) => {
  try {
    const { habitId } = req.body;
    const habit = await Habit.findOne({
      userId: req.user._id,
      _id: habitId,
    });
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    const logs = await HabitLog.find({
      userId: req.user._id,
      habitId,
    }).sort({ completedDate: -1 });

    const keys = logs.map((l) => l.completedDate);
    const { current, longest } = calcStreak(keys);

    const userMsg = `Habit: ${habit.name}\nCategory: ${habit.category}\nDescription: ${habit.description || "None"}\nCurrent streak: ${current} days.\nLongest streak: ${longest} days.\nThe user just broke a streak. Write a warm, actionable 3-step recovery plan.`;

    const { ok, content } = await chatCompletion({
      system: SYSTEM_PROMPTS.recovery,
      user: userMsg,
    });

    const plan = ok
      ? content
      : `You broke your ${habit.name} streak — that happens. Day 1: do a 5-minute version of the habit. Day 2: repeat at the same time. Day 3: return to your normal target. You've hit ${longest} days before; you can again.`;

    await AIInsight.create({
      userId: req.user._id,
      type: "recovery",
      content: plan,
      meta: { habitId, habitName: habit.name },
    });

    res.json({ content: plan });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const chatAnalysis = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const habits = await Habit.find({
      userId: req.user._id,
      isArchived: false,
    });

    const days = lastNDays(30);
    const logs = await HabitLog.find({
      userId: req.user._id,
      completedDate: { $gte: days[0], $lte: days[days.length - 1] },
    });

    const context = habits
      .map((h) => {
        const hLogs = logs.filter(
          (l) => String(l.habitId) === String(h._id)
        );

        const byDow = [0, 0, 0, 0, 0, 0, 0];
        for (const l of hLogs) {
          const dow = new Date(`${l.completedDate}T12:00:00`).getDay();
          byDow[dow] += 1;
        }
        return `${h.name} (${h.category}): ${hLogs.length}/30 in last 30 days, by weekday [Sun,Mon,Tue,Wed,Thu,Fri,Sat]: ${byDow}`;
      })
      .join("\n");

    const userMsg = `User question: "${question}"\n\nUser data (last 30 days):\n${context}\n\nAnswer now.`;

    const { ok, content } = await chatCompletion({
      system: SYSTEM_PROMPTS.chat,
      user: userMsg,
    });

    const answer = ok
      ? content
      : "AI chat is unavailable right now. Check that GEMINI_API_KEY is set in the backend .env file.";

    await AIInsight.create({
      userId: req.user._id,
      type: "chat",
      content: answer,
      meta: { question },
    });

    res.json({ content: answer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const morningMotivation = async (req, res) => {
  try {
    const habits = await Habit.find({
      userId: req.user._id,
      isArchived: false,
    });

    if (!habits.length) {
      return res.json({
        content:
          "Good morning! Add your first habit today and let's get the momentum started.",
      });
    }

    const days = lastNDays(30);
    const logs = await HabitLog.find({
      userId: req.user._id,
      completedDate: { $gte: days[0], $lte: days[days.length - 1] },
    });

    const ctx = habits
      .map((h) => {
        const hLogs = logs
          .filter((l) => String(l.habitId) === String(h._id))
          .map((l) => l.completedDate)
          .sort()
          .reverse();

        const { current } = calcStreak(hLogs);
        return `${h.name}: current streak ${current}`;
      })
      .join("\n");

    const today = todayKey();
    const todayLogs = logs.filter((l) => l.completedDate === today);
    const done = todayLogs.length;
    const total = habits.length;

    const userMsg = `Today's habits and streaks:\n${ctx}\n\nDone today: ${done}/${total}. Write the morning message now.`;
    const { ok, content } = await chatCompletion({
      system: SYSTEM_PROMPTS.morning,
      user: userMsg,
      temperature: 0.8,
    });

    const message = ok
      ? content
      : `Good morning! You have ${total} habits today — ${done} already done. Pick one small win to start strong.`;

    await AIInsight.create({
      userId: req.user._id,
      type: "morning",
      content: message,
    });
    res.json({ content: message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
