const cron = require("node-cron");
const { checkOverdueInvoices, processRecurringInvoices } = require("./jobs");
const { systemParams } = require("../utils/Mongo/collection/collection");

const runJobs = async () => {
    console.log("🔄 Running Scheduled Jobs...");
    await checkOverdueInvoices();
    await processRecurringInvoices();

    // Update last run time
    await systemParams.updateOne(
        { _id: "cron_status" },
        { $set: { lastRun: new Date().toISOString() } },
        { upsert: true }
    );
    console.log("✅ Jobs Completed & Logged.");
};

const checkMissedJobs = async () => {
    try {
        const status = await systemParams.findOne({ _id: "cron_status" });
        if (!status || !status.lastRun) {
            console.log("⚠️ No previous cron run found. Running initial jobs...");
            await runJobs();
            return;
        }

        const lastRun = new Date(status.lastRun);
        const now = new Date();

        // If last run was not today (checking date string matches)
        const lastRunDate = lastRun.toLocaleDateString();
        const todayDate = now.toLocaleDateString();

        if (lastRunDate !== todayDate) {
            console.log(`⚠️ Catching up: Last run was ${lastRunDate}. Running now...`);
            await runJobs();
        } else {
            console.log("👍 Daily jobs already ran today.");
        }
    } catch (error) {
        console.error("Error checking missed jobs:", error);
    }
};

const initCronJobs = () => {
    // 1. Run Recovery Check on Startup
    checkMissedJobs();

    // 2. Schedule Daily Job (9:00 AM)
    cron.schedule("0 9 * * *", () => {
        runJobs();
    });
    console.log("📅 Cron jobs scheduled (with Recovery System)");
};

module.exports = initCronJobs;
