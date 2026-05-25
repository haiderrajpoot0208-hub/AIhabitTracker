import express from "express";
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  reorderHabits,
  toggleArchiveHabit,
} from "../controllers/habitcontroller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

router.get("/", getHabits);
router.post("/", createHabit);
router.put("/reorder", reorderHabits);
router.put("/:id/archive", toggleArchiveHabit);
router.put("/:id", updateHabit);
router.delete("/:id", deleteHabit);

export default router;
