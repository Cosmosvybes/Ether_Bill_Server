const cron = require("node-cron");
const { checkOverdueInvoices, processRecurringInvoices } = require("./jobs");

const initCronJobs = () => {
    // Run every day at 9:00 AM
    cron.schedule("0 9 * * *", () => {
        checkOverdueInvoices();
        processRecurringInvoices();
    });
    console.log("📅 Cron jobs scheduled");
};

module.exports = initCronJobs;
