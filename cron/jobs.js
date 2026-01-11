const { users } = require("../utils/Mongo/collection/collection");
const { mailer } = require("../utils/EmailService/Mailer");
const { sendSMS } = require("../utils/SMSService/SMSService");
const { addSentInvoice } = require("../controller/controls/add");
const { deductSMSBalance } = require("../controller/controls/update");

/**
 * Job to check for overdue invoices and send reminders
 * Runs daily at 9:00 AM
 */
exports.checkOverdueInvoices = async () => {
    console.log("Running Auto-Chasing Job...");
    try {
        const allUsers = await users.find({}).toArray();

        for (const user of allUsers) {
            const sentInvoices = user.sent || [];
            if (sentInvoices.length === 0) continue;

            const updatedSent = [];
            let modified = false;

            for (const invoice of sentInvoices) {
                // Determine if we should chase this specific invoice
                // Use per-invoice setting if it exists, otherwise fallback to global
                const shouldChase = invoice.autoChase !== undefined
                    ? invoice.autoChase
                    : (user.settings?.autoChase);

                if (invoice.status === "Paid" || !shouldChase) {
                    updatedSent.push(invoice);
                    continue;
                }

                const dueDate = new Date(invoice.DateDue || invoice.dueDate);
                const now = new Date();

                // If overdue
                if (dueDate < now) {
                    // SPAM PROTECTION: Don't chase more than once every 24 hours
                    const lastChased = invoice.lastChased ? new Date(invoice.lastChased) : null;
                    const hoursSinceLastChase = lastChased ? (now - lastChased) / (1000 * 60 * 60) : 24;

                    if (hoursSinceLastChase >= 23) {
                        // console.log(`Chasing invoice ${invoice.id} for user ${user.email}`);

                        const recipientEmail = invoice.receipient?.email || invoice.receipient;
                        if (recipientEmail) {
                            await mailer(
                                `⚠️ Overdue Payment Reminder: Invoice #${invoice.id}`,
                                recipientEmail,
                                createOverdueReminderEmail(invoice, user)
                            );
                        }

                        // [NEW] SMS Reminder
                        const recipientPhone = invoice.receipient?.phoneNumber || invoice.phoneNumber;
                        if (user.settings?.smsNotification && recipientPhone && (user.smsBalance > 0)) {
                            const business = user.settings?.businessName || `${user.firstname} ${user.lastname}`;
                            const amount = Number(invoice.TOTAL || invoice.total || 0).toLocaleString();
                            const currency = invoice.currency || '$';
                            const smsBody = `Reminder: Your invoice (#${invoice.id}) from ${business} for ${currency}${amount} is now overdue. Please settle it here: https://steadybill.pro/public/invoice/${invoice.id}`;
                            const smsRes = await sendSMS(recipientPhone, smsBody);
                            if (smsRes.success) {
                                await deductSMSBalance(user.email);
                            }
                        }

                        invoice.lastChased = now.toISOString();
                        modified = true;
                    }
                }
                updatedSent.push(invoice);
            }

            if (modified) {
                await users.updateOne({ email: user.email }, { $set: { sent: updatedSent } });
            }
        }
    } catch (error) {
        console.error("Error in Auto-Chasing Job:", error);
    }
};

/**
 * Job to process recurring profiles and generate new invoices
 * Runs daily at 9:00 AM
 */
exports.processRecurringInvoices = async () => {
    // console.log("Running Recurring Invoice Job...");
    try {
        const allUsers = await users.find({}).toArray();
        for (const user of allUsers) {
            if (!user.recurring || user.recurring.length === 0) continue;
            if (!user.isSubscribed) continue; // [RESTORED] Recurring is a PRO feature

            const activeRecurring = [];
            let processedAny = false;

            for (const profile of user.recurring) {
                const nextRun = new Date(profile.recurring.nextRun);
                const now = new Date();

                if (nextRun <= now) {
                    // 1. Generate NEW invoice object
                    const newInvoice = { ...profile };
                    delete newInvoice._id; // Ensure no ID collision if any

                    newInvoice.id = Date.now().toString() + Math.floor(Math.random() * 1000);
                    newInvoice.status = "sent";
                    newInvoice.DateIssued = now.toISOString();
                    newInvoice.updatedAt = now.toISOString();

                    // Set Due Date (Default to +7 days for recurring)
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 7);
                    newInvoice.DateDue = dueDate.toISOString();
                    newInvoice.dueDate = newInvoice.DateDue; // Legacy support

                    // console.log(`Generating recurring invoice ${newInvoice.id} for ${user.email}...`);

                    // 2. Send Professional Email
                    const recipientEmail = newInvoice.receipient?.email || newInvoice.receipient;
                    if (recipientEmail) {
                        await mailer(
                            `New Invoice Available: #${newInvoice.id} from ${user.firstname || 'Steadybill User'}`,
                            recipientEmail,
                            createRecurringNotificationEmail(newInvoice, user)
                        );
                    }

                    // [NEW] SMS Notification
                    const recipientPhone = newInvoice.receipient?.phoneNumber || newInvoice.phoneNumber;
                    if (user.settings?.smsNotification && recipientPhone && (user.smsBalance > 0)) {
                        const business = user.settings?.businessName || `${user.firstname} ${user.lastname}`;
                        const amount = Number(newInvoice.TOTAL || newInvoice.total || 0).toLocaleString();
                        const currency = newInvoice.currency || '$';
                        const smsBody = `Hello, a new recurring invoice (#${newInvoice.id}) has been generated for you by ${business} (${currency}${amount}). View it here: https://steadybill.pro/public/invoice/${newInvoice.id}`;
                        const smsRes = await sendSMS(recipientPhone, smsBody);
                        if (smsRes.success) {
                            await deductSMSBalance(user.email);
                        }
                    }

                    // 3. Save to database
                    await addSentInvoice(user.email, newInvoice);

                    // 4. Update next run date
                    const nextNextRun = new Date(nextRun);
                    const freq = profile.recurring.frequency.toLowerCase();
                    if (freq === "weekly") nextNextRun.setDate(nextNextRun.getDate() + 7);
                    else if (freq === "bi-weekly") nextNextRun.setDate(nextNextRun.getDate() + 14);
                    else if (freq === "monthly") nextNextRun.setMonth(nextNextRun.getMonth() + 1);
                    else if (freq === "quarterly") nextNextRun.setMonth(nextNextRun.getMonth() + 3);
                    else if (freq === "annually" || freq === "yearly") nextNextRun.setFullYear(nextNextRun.getFullYear() + 1);
                    else nextNextRun.setMonth(nextNextRun.getMonth() + 1); // Default to monthly fallback

                    profile.recurring.nextRun = nextNextRun.toISOString();
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

/**
 * Professional Template for Overdue Reminders
 */
const createOverdueReminderEmail = (invoice, user) => {
    const amount = Number(invoice.TOTAL || invoice.total || 0).toLocaleString();
    const currency = invoice.currency || '$';
    const business = user.settings?.businessName || `${user.firstname} ${user.lastname}`;

    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 32px; text-align: center; border-bottom: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Payment Overdue</h2>
            <p style="color: #64748b; margin-top: 8px;">Invoice #${invoice.id}</p>
        </div>
        <div style="padding: 32px; color: #334155; line-height: 1.6;">
            <p>Hello,</p>
            <p>This is a reminder that the payment for <strong>Invoice #${invoice.id}</strong> from <strong>${business}</strong> is now overdue.</p>
            <div style="background-color: #f1f5f9; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
                <p style="margin: 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Amount Due</p>
                <h1 style="margin: 8px 0 0 0; color: #0f172a; font-size: 32px;">${currency}${amount}</h1>
            </div>
            <p>To avoid any service interruptions, please settle this payment at your earliest convenience.</p>
            <div style="text-align: center; margin-top: 32px;">
                <a href="https://invoicelogger.netlify.app/public/invoice/${invoice.id}" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View & Pay Invoice</a>
            </div>
        </div>
        <div style="padding: 24px; background-color: #f8fafc; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0;">
            <p>Sent via Etherbill &bull; Simple, professional invoicing.</p>
        </div>
    </div>`;
};

/**
 * Professional Template for New Recurring Invoices
 */
const createRecurringNotificationEmail = (invoice, user) => {
    const amount = Number(invoice.TOTAL || invoice.total || 0).toLocaleString();
    const currency = invoice.currency || '$';
    const business = user.settings?.businessName || `${user.firstname} ${user.lastname}`;

    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background-color: #f0fdf4; padding: 32px; text-align: center; border-bottom: 1px solid #dcfce7;">
            <h2 style="color: #166534; margin: 0; font-size: 24px;">New Invoice Generated</h2>
            <p style="color: #15803d; margin-top: 8px;">Subscription Billing: #${invoice.id}</p>
        </div>
        <div style="padding: 32px; color: #334155; line-height: 1.6;">
            <p>Hello,</p>
            <p>A new recurring invoice has been generated by <strong>${business}</strong> for your ongoing subscription/service.</p>
            <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #f1f5f9;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #64748b; font-size: 14px;">Invoice Number</td>
                        <td style="text-align: right; font-weight: bold; color: #0f172a;">#${invoice.id}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-size: 14px; padding-top: 8px;">Amount</td>
                        <td style="text-align: right; font-weight: bold; color: #0f172a; padding-top: 8px;">${currency}${amount}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-size: 14px; padding-top: 8px;">Due Date</td>
                        <td style="text-align: right; font-weight: bold; color: #0f172a; padding-top: 8px;">${new Date(invoice.DateDue).toLocaleDateString()}</td>
                    </tr>
                </table>
            </div>
            <div style="text-align: center; margin-top: 32px;">
                <a href="https://invoicelogger.netlify.app/public/invoice/${invoice.id}" style="background-color: #166534; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Pay Invoice Now</a>
            </div>
        </div>
        <div style="padding: 24px; background-color: #f8fafc; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0;">
            <p>Sent via Etherbill &bull; Automated Professional Billing.</p>
        </div>
    </div>`;
};
