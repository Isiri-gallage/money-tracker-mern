import "dotenv/config";
import cron from "node-cron";
import { app } from "./app.js";
import { connectDB } from "./config/db.js";
import { runDueRecurringTransactions } from "./services/recurring.js";

const PORT = process.env.PORT || 4000;

connectDB().then(async () => {
  const generated = await runDueRecurringTransactions();
  if (generated > 0) {
    console.log(`Generated ${generated} recurring transaction(s) on startup`);
  }

  cron.schedule("0 * * * *", async () => {
    const count = await runDueRecurringTransactions();
    if (count > 0) {
      console.log(`Generated ${count} recurring transaction(s)`);
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});