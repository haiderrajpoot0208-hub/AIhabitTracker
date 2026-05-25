import "dotenv/config";
import mongoose from "mongoose";
import { format, subDays } from "date-fns";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import AIInsight from "../models/AIInsight.js";

const EMAIL = "alex@timetoprogram.com";
const PASSWORD = "password123";
const NAME = "Alex Rivera";
const DAYS_TO_SEED = 90;

const HABITS = [
  {
    name: "Drink 2L of water",
    description: "Stay hydrated throughout the day.",
    category: "Health",
    frequency: "daily",
    targetDays: 7,
    color: "#0ea5e9",
    icon: "💧",
    _streakProb: 0.95,
  },
  {
    name: "Morning run",
    description: "30-minute run before breakfast.",
    category: "Wellness",
    frequency: "daily",
    targetDays: 5,
    color: "#ef4444",
    icon: "🏃",
    _streakProb: 0.62,
  },
  {
    name: "Read 20 minutes",
    description: "A chapter or article before bed.",
    category: "Learning",
    frequency: "daily",
    targetDays: 7,
    color: "#8b5cf6",
    icon: "📚",
    _streakProb: 0.88,
  },
  {
    name: "Journal 5 minutes",
    description: "Reflect on the day and set intentions.",
    category: "Wellness",
    frequency: "daily",
    targetDays: 5,
    color: "#10b981",
    icon: "✍️",
    _streakProb: 0.75,
  },
  {
    name: "Deep work block",
    description: "90 minutes of focused work without distractions.",
    category: "Productivity",
    frequency: "weekly",
    targetDays: 4,
    color: "#6366f1",
    icon: "🎯",
    _streakProb: 0.7,
  },
];

const INSIGHTS = [
  {
    type: "weekly",
    content:
      "Big week for hydration — 7/7 on Drink 2L of water! Your morning runs slipped to 3/5 on weekdays. Consistency pattern: you're strongest Mon–Wed. Try prepping shoes by the door tonight to protect tomorrow's momentum. Proud of you.",
    meta: { weekLabel: "current" },
  },
  {
    type: "morning",
    content:
      "Good morning, Alex! You logged 2 habits yesterday — hydration and reading are on a roll. Today's a great day to close the loop on your morning run.",
    meta: {},
  },
  {
    type: "recovery",
    content:
      "You missed Morning run twice this week — that's normal. Shrink the goal to a 10-minute walk tomorrow; small wins rebuild the streak faster than skipping entirely.",
    meta: { habitName: "Morning run" },
  },
  {
    type: "suggestion",
    content: JSON.stringify({
      suggestions: [
        {
          name: "Stretch for 5 minutes",
          description: "Loosen up after your run to reduce soreness.",
          frequency: "daily",
          category: "Wellness",
        },
        {
          name: "Plan tomorrow tonight",
          description: "Write three priorities before bed.",
          frequency: "daily",
          category: "Productivity",
        },
      ],
    }),
    meta: { source: "seed" },
  },
];

/** Deterministic completion roll so re-running seed produces the same logs. */
function shouldComplete(habit, dateKey) {
  const day = new Date(`${dateKey}T12:00:00`);
  const dow = day.getDay();
  const seed = [...`${dateKey}:${habit.name}`].reduce(
    (sum, ch) => sum + ch.charCodeAt(0),
    0
  );
  const roll = (seed % 100) / 100;
  let threshold = habit._streakProb;

  if (habit.name === "Morning run" && (dow === 0 || dow === 6)) {
    threshold *= 0.45;
  }
  if (habit.frequency === "weekly" && (dow === 0 || dow === 6)) {
    threshold *= 0.55;
  }

  return roll < threshold;
}

function lastNDayKeys(n) {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }
  return keys;
}

async function seed() {
  await connectDB();

  const existing = await User.findOne({ email: EMAIL });
  if (existing) {
    await HabitLog.deleteMany({ userId: existing._id });
    await AIInsight.deleteMany({ userId: existing._id });
    await Habit.deleteMany({ userId: existing._id });
    await User.deleteOne({ _id: existing._id });
    console.log("Cleared previous seed data for", EMAIL);
  }

  const user = await User.create({
    name: NAME,
    email: EMAIL,
    password: PASSWORD,
    avatar: NAME.charAt(0),
    morningMotivation: true,
  });

  const habitDocs = await Habit.insertMany(
    HABITS.map(({ _streakProb, ...habit }, order) => ({
      ...habit,
      userId: user._id,
      order,
    }))
  );

  const dayKeys = lastNDayKeys(DAYS_TO_SEED);
  const logs = [];

  for (let i = 0; i < habitDocs.length; i++) {
    const habitDoc = habitDocs[i];
    const habitSeed = HABITS[i];

    for (const completedDate of dayKeys) {
      if (shouldComplete(habitSeed, completedDate)) {
        logs.push({
          userId: user._id,
          habitId: habitDoc._id,
          completedDate,
        });
      }
    }
  }

  if (logs.length) {
    await HabitLog.insertMany(logs, { ordered: false });
  }

  await AIInsight.insertMany(
    INSIGHTS.map((insight) => ({ ...insight, userId: user._id }))
  );

  console.log("\nDatabase seeded successfully.");
  console.log(`  User:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Habits:  ${habitDocs.length}`);
  console.log(`  Logs:    ${logs.length} (${DAYS_TO_SEED} days of history)`);
  console.log(`  Insights: ${INSIGHTS.length}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
