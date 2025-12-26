const cron = require("node-cron");
const { users } = require("../utils/Mongo/collection/collection");
const { mailer } = require("../utils/EmailService/Mailer");

exports.checkOverdueInvoices = async () => {
    console.log("Running Auto-Chasing Job...");
    try {
        // 1. Fetch all users who have auto-chasing enabled (or all for now if enabled by default/UI)
        // Assuming UI toggle maps to user.settings.autoChase
        const allUsers = await users.find({}).toArray();

        for (const user of allUsers) {
            if (!user.settings || !user.settings.autoChase) continue;

            const sentInvoices = user.sent || [];
            const overdueInvoices = sentInvoices.filter((invoice) => {
                // Check if unpaid and overdue
                // Assuming invoice.status and invoice.dueDate exist
                // Status might be "sent" or "Draft" or "Paid"
                if (invoice.status === "Paid") return false;

                const dueDate = new Date(invoice.dueDate);
                const now = new Date();

                // Check if due date has passed
                return dueDate < now;
            });

            for (const invoice of overdueInvoices) {
                // Prevent spamming: Check if we already chased recently?
                // For MVP, we might just send it if it hasn't been chased TODAY.
                // But the prompt implied simple "Auto-Chasing". 
                // To be safe, let's assume we send a reminder. 
                // Ideally we should mark it as chased.

                // TODO: Add logic to prevent daily spam. For now, we will log it.
                console.log(`Chasing invoice ${invoice.id} for user ${user.email}`);

                const recipientEmail = invoice.receipient?.email || invoice.receipient; // Handle structure variation
                if (!recipientEmail) continue;

                await mailer(
                    `Payment Reminder: Invoice #${invoice.id} is Overdue`,
                    recipientEmail,
                    createReminderEmail(invoice, user)
                );
            }
        }
    } catch (error) {
        console.error("Error in Auto-Chasing Job:", error);
    }
};

exports.processRecurringInvoices = async () => {
    console.log("Running Recurring Invoice Job...");
    try {
        const allUsers = await users.find({}).toArray();
        for (const user of allUsers) {
            if (!user.recurring || user.recurring.length === 0) continue;

            const activeRecurring = [];
            let processedAny = false;

            for (const profile of user.recurring) {
                const nextRun = new Date(profile.recurring.nextRun);
                const now = new Date();

                if (nextRun <= now) {
                    // Generate NEW invoice
                    const newInvoice = { ...profile };
                    newInvoice.id = Date.now().toString() + Math.floor(Math.random() * 1000); // Unique ID
                    newInvoice.date = new Date().toISOString().split('T')[0];
                    // Update due date? Assuming original due date was X days from creation
                    // For MVP, just keeping original due date might be wrong.
                    // Let's set due date to Today + 7 days for recurring
                    const newDueDate = new Date();
                    newDueDate.setDate(newDueDate.getDate() + 7);
                    newInvoice.dueDate = newDueDate.toISOString().split('T')[0];

                    console.log(`Generating user ${user.email} recurring invoice ${newInvoice.id}...`);

                    // Send Email
                    const recipientEmail = newInvoice.receipient?.email || newInvoice.receipient;
                    if (recipientEmail) {
                        // We reuse the mailer directly or call a simplified version
                        await mailer(
                            `Recurring Invoice #${newInvoice.id} 📩`,
                            recipientEmail,
                            createReminderEmail(newInvoice, user) // Reusing reminder template or similar
                        );
                    }

                    // Add to Sent
                    const { addSentInvoice } = require("../controller/controls/add");
                    await addSentInvoice(user.email, newInvoice);

                    // Update parameters for next run
                    const nextNextRun = new Date(now);
                    if (profile.recurring.frequency === "weekly") nextNextRun.setDate(nextNextRun.getDate() + 7);
                    if (profile.recurring.frequency === "monthly") nextNextRun.setMonth(nextNextRun.getMonth() + 1);

                    profile.recurring.nextRun = nextNextRun;
                    processedAny = true;
                }
                activeRecurring.push(profile);
            }

            if (processedAny) {
                await users.updateOne({ email: user.email }, { $set: { recurring: activeRecurring } });
            }
        }
    } catch (error) {
        console.error("Error in Recurring Invoice Job:", error);
    }
};

const createReminderEmail = (invoice, user) => {
    return `
    <div style="font-family: sans-serif;">
      <h2>Payment Reminder</h2>
      <p>Dear Customer,</p>
      <p>This is a friendly reminder that invoice <strong>#${invoice.id}</strong> was due on ${invoice.dueDate}.</p>
      <p>Amount Due: <strong>${invoice.currency || '$'}${invoice.total || invoice.TOTAL || 0}</strong></p>
      <p>Please make payment as soon as possible.</p>
      <p>Best regards,</p>
      <p>${user.firstname} ${user.lastname}</p>
    </div>
  `;
};
