const { users, broadcasts } = require("../../utils/Mongo/collection/collection");
const { mailer } = require("../../utils/EmailService/Mailer");

// In-Memory Cache for Exchange Rates
let CACHED_RATES = { NGN: 1, USD: 0.0006 }; // Default Fallback (1 NGN = 0.0006 USD)
let LAST_FETCH = 0;
const CACHE_DURATION = 3600 * 1000; // 1 Hour

/**
 * Get high-level application metrics
 */
exports.getStats = async (req, res) => {
    try {
        const allUsers = await users.find({}).toArray();

        const totalUsers = allUsers.length;
        const proUsers = allUsers.filter(u => u.isSubscribed).length;

        // 1. Fetch Live Rates (Hourly Cache)
        const now = Date.now();
        if (now - LAST_FETCH > CACHE_DURATION) {
            try {
                // Fetch rates relative to NGN (Base: NGN)
                const response = await fetch("https://open.er-api.com/v6/latest/NGN");
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.rates) {
                        CACHED_RATES = data.rates;
                        LAST_FETCH = now;
                        console.log("Updated Exchange Rates (Base NGN)");
                    }
                }
            } catch (err) {
                console.warn("Using cached/fallback rates. Fetch failed:", err.message);
            }
        }

        // Helper: Normalize Currency Symbols
        const normalizeCurrency = (input) => {
            if (!input) return "NGN";
            const code = input.toUpperCase().trim();
            const map = {
                "$": "USD", "£": "GBP", "€": "EUR", "₦": "NGN",
                "₵": "GHS", "GH₵": "GHS", "GHS": "GHS",
                "R": "ZAR", "ZAR": "ZAR",
                "KSH": "KES", "KES": "KES",
                "USH": "UGX", "UGX": "UGX",
                "TSH": "TZS", "TZS": "TZS",
                "FR": "XOF", "CFA": "XOF", "XOF": "XOF", "XAF": "XAF",
                "P": "BWP", "BWP": "BWP",
                "LE": "EGP", "EGP": "EGP",
                "BIRR": "ETB", "ETB": "ETB",
                "MT": "MZN", "MZN": "MZN",
                "D": "GMD", "GMD": "GMD",
                "L": "SZL", "SZL": "SZL",
                "K": "MWK", "MWK": "MWK", "ZMW": "ZMW",
                "N": "NAD", "NAD": "NAD", // Namibia
                "LSL": "LSL", // Lesotho
                "SCR": "SCR", // Seychelles
                "MUR": "MUR", // Mauritius
            };
            return map[code] || code;
        };

        // Calculate Normalized Revenue (in NGN)
        const totalRevenue = allUsers.reduce((acc, user) => {
            // Check 'paid' array for invoice history
            const paidInvoices = user.paid || [];

            const userTotal = paidInvoices.reduce((sum, inv) => {
                const rawCcy = inv.currency || inv.grandTotalCurrency || "NGN";
                const currency = normalizeCurrency(rawCcy);

                const rate = CACHED_RATES[currency] || 1;
                const amount = Number(inv.total || inv.TOTAL || 0);

                return sum + (rate > 0 ? (amount / rate) : 0);
            }, 0);

            return acc + userTotal;
        }, 0);

        // Sum of all invoices sent across all users
        const totalInvoices = allUsers.reduce((acc, curr) => acc + (curr.sent?.length || 0) + (curr.paid?.length || 0), 0);

        // Calculate MRR and Active Subs
        let activeSubscriptions = 0;
        const activeMRR = allUsers.reduce((acc, user) => {
            const subs = user.recurring || [];
            activeSubscriptions += subs.length;

            const userMRR = subs.reduce((sum, sub) => {
                const rawCcy = sub.currency || sub.grandTotalCurrency || "NGN";
                const currency = normalizeCurrency(rawCcy);

                const rate = CACHED_RATES[currency] || 1;
                const amount = Number(sub.total || sub.TOTAL || 0);
                const normalizedAmount = rate > 0 ? (amount / rate) : 0;

                let monthlyValue = 0;
                const freq = (sub.recurring?.frequency || sub.frequency || "monthly").toLowerCase();
                if (freq === "weekly") monthlyValue = normalizedAmount * 4.33;
                else if (freq === "monthly") monthlyValue = normalizedAmount;
                else if (freq === "yearly" || freq === "annually") monthlyValue = normalizedAmount / 12;
                else monthlyValue = normalizedAmount;

                return sum + monthlyValue;
            }, 0);
            return acc + userMRR;
        }, 0);

        // 4. Calculate Weekly Growth (New Users in last 7 days)
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        const newUsersCount = allUsers.filter(u => {
            return u.createdAt && (Date.now() - new Date(u.createdAt).getTime() < ONE_WEEK);
        }).length;
        const weeklyGrowth = totalUsers > 0 ? ((newUsersCount / totalUsers) * 100).toFixed(1) : "0.0";

        // 5. Calculate LTV (Revenue / Paying Users)
        const payingUserCount = allUsers.filter(u => (u.revenue || 0) > 0 || (u.paid?.length || 0) > 0).length;
        const ltv = payingUserCount > 0 ? (totalRevenue / payingUserCount) : 0;

        // 6. Recent Users (Last 5) - Assuming natural order is chronological
        const recentUsers = [...allUsers].reverse().slice(0, 5).map(u => ({
            name: `${u.firstname} ${u.lastname}`,
            email: u.email,
            plan: u.isSubscribed ? "PRO" : "Free",
            joined: u.createdAt || new Date().toISOString()
        }));

        // 7. Recent Invoices (Global Financial Activity)
        const allPaidInvoices = allUsers.flatMap(u =>
            (u.paid || []).map(inv => ({ ...inv, user: `${u.firstname} ${u.lastname}` }))
        );
        const recentInvoices = allPaidInvoices.reverse().slice(0, 5).map(inv => {
            const rawCcy = inv.currency || inv.grandTotalCurrency || "NGN";
            const currency = normalizeCurrency(rawCcy);
            const rate = CACHED_RATES[currency] || 1;
            const amount = Number(inv.total || inv.TOTAL || 0);
            const normalizedAmount = rate > 0 ? (amount / rate) : 0;

            return {
                id: inv.invoiceID || inv.id || "INV-#",
                user: inv.user,
                amount: normalizedAmount,
                currency: "NGN"
            };
        });

        res.status(200).json({
            totalUsers,
            proUsers,
            totalRevenue,
            totalInvoices,
            activeSubscriptions,
            activeMRR: activeMRR || 0,
            ltv,
            weeklyGrowth: weeklyGrowth + "%",
            recentUsers,
            recentInvoices,
            conversionRate: ((proUsers / totalUsers) * 100).toFixed(1) + "%"
        });
    } catch (error) {
        console.error("Admin Stats Error:", error);
        res.status(500).json({ response: "Error fetching admin stats" });
    }
};

/**
 * Get list of all users with essential info (Paginated)
 */
exports.getAllUsers = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const totalUsersCount = await users.countDocuments({});
        const allUsers = await users.find({}, {
            projection: {
                password: 0,
                draft: 0,
                inbox: 0
            }
        })
            .sort({ id: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Map to include summary counts
        const usersSummary = allUsers.map(u => ({
            id: u.id,
            email: u.email,
            firstname: u.firstname,
            lastname: u.lastname,
            isSubscribed: u.isSubscribed,
            isAdmin: u.isAdmin,
            revenue: u.revenue || 0,
            invoiceCount: (u.sent?.length || 0) + (u.paid?.length || 0),
            freemiumCount: u.freemiumInvoiceCount
        }));

        res.status(200).json({
            users: usersSummary,
            pagination: {
                total: totalUsersCount,
                page,
                pages: Math.ceil(totalUsersCount / limit),
                limit
            }
        });
    } catch (error) {
        console.error("Admin Users Error:", error);
        res.status(500).json({ response: "Error fetching user list" });
    }
};

/**
 * Toggle Pro Status manually for any user
 */
exports.toggleProStatus = async (req, res) => {
    const { userId, status } = req.body;
    try {
        await users.updateOne(
            { id: Number(userId) },
            { $set: { isSubscribed: status } }
        );
        res.status(200).json({ response: `User status updated to ${status ? 'PRO' : 'FREE'}` });
    } catch (error) {
        console.error("Toggle Pro Error:", error);
        res.status(500).json({ response: "Error updating user status" });
    }
};

/**
 * Adjust freemium credits for a user (Support tool)
 */
exports.adjustFreemiumCount = async (req, res) => {
    const { userId, amount } = req.body;
    try {
        const result = await users.updateOne(
            { id: Number(userId) },
            { $set: { freemiumInvoiceCount: Number(amount) } }
        );

        if (result.matchedCount > 0) {
            res.status(200).json({ response: `Freemium count updated to ${amount}` });
        } else {
            console.error(`Adjust Freemium Failed: No user found with ID ${userId}`);
            res.status(404).json({ response: "User not found" });
        }
    } catch (error) {
        console.error("Adjust Freemium Error:", error);
        res.status(500).json({ response: "Error updating freemium count" });
    }
};

/**
 * Add freemium credits to ALL users (Bulk action)
 */
exports.bulkAddFreemium = async (req, res) => {
    const { amount } = req.body;
    try {
        if (!amount || isNaN(Number(amount))) {
            return res.status(400).json({ response: "Invalid amount" });
        }

        // 1. Update all users
        await users.updateMany(
            {}, // All users
            { $inc: { freemiumInvoiceCount: Number(amount) } }
        );

        // 2. Fetch all users to send emails
        // Projection to only get necessary fields
        const allUsers = await users.find({}, { projection: { email: 1, firstname: 1 } }).toArray();

        // 3. Send emails
        // Run in background so we don't block the response
        (async () => {
            console.log(`Starting bulk email notification for ${allUsers.length} users...`);
            for (const user of allUsers) {
                if (!user.email) continue;

                const html = `
                  <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #7c3aed;">You've received Free Invoice Credits! 🎁</h2>
                    <p>Hi ${user.firstname || 'there'},</p>
                    <p>We've added <strong>${amount} free invoice credits</strong> to your account.</p>
                    <p>Log in now to start sending professional invoices for free!</p>
                    <a href="https://etherbill.com" style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Go to Dashboard</a>
                  </div>
                `;

                try {
                    await mailer("Gift: Free Invoice Credits Added!", user.email, html);
                    // Add a small delay to respect rate limits (e.g., 200ms)
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (err) {
                    console.error(`Failed to email ${user.email}:`, err.message);
                }
            }
            console.log("Bulk email notification completed.");
        })();

        res.status(200).json({ response: `Successfully added ${amount} credits to ${allUsers.length} users and started sending emails.` });
    } catch (error) {
        console.error("Bulk Add Freemium Error:", error);
        res.status(500).json({ response: "Error in bulk credit update" });
    }
};

/**
 * Send bulk email to all users (updates, announcements, etc.)
 */
exports.sendBulkEmail = async (req, res) => {
    const { subject, body } = req.body;

    if (!subject || !body) {
        return res.status(400).json({ response: "Subject and body are required" });
    }

    try {
        // 1. Fetch all users to send emails
        const allUsers = await users.find({}, { projection: { email: 1, firstname: 1 } }).toArray();

        // 2. Send emails in background
        (async () => {
            console.log(`[Admin] Starting bulk mailing for ${allUsers.length} users... Message: ${subject}`);

            // Standardize body: convert newlines to HTML breaks and escape basic HTML if any
            const formattedBody = body.replace(/\n/g, '<br/>');

            for (const user of allUsers) {
                if (!user.email) continue;

                const html = `
                  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px 20px; background-color: #f8fafc; color: #1e293b;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <div style="padding: 32px; background-color: #7c3aed; text-align: center;">
                            <img src="https://www.steadybill.pro/logo.png" alt="SteadyBill" style="width: 140px; filter: brightness(0) invert(1);">
                        </div>
                        <div style="padding: 40px 32px; line-height: 1.8;">
                            <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 800;">Hi ${user.firstname || 'there'},</h2>
                            <div style="font-size: 16px; color: #334155;">
                                ${formattedBody}
                            </div>
                            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                                <a href="https://www.steadybill.pro/dashboard" style="display: inline-block; padding: 14px 28px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px;">Go to Dashboard</a>
                            </div>
                        </div>
                        <div style="padding: 24px 32px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
                            <p style="margin: 0;">© ${new Date().getFullYear()} SteadyBill. All rights reserved.</p>
                            <p style="margin: 4px 0 0;">You received this email because you're a registered user on SteadyBill.</p>
                        </div>
                    </div>
                  </div>
                `;

                try {
                    await mailer(subject, user.email, html);
                    // Add a small delay to respect rate limits
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (err) {
                    console.error(`[Admin] Failed to email ${user.email}:`, err.message);
                }
            }
            console.log("[Admin] Bulk mailing completed.");
        })();

        res.status(200).json({ response: `Bulk email process started for ${allUsers.length} users.` });
    } catch (error) {
        console.error("Bulk Mailing Error:", error);
        res.status(500).json({ response: "Error starting bulk mailing process" });
    }
};

/**
 * Send email to a specific user
 */
exports.sendSingleEmail = async (req, res) => {
    const { email, subject, body } = req.body;

    if (!email || !subject || !body) {
        return res.status(400).json({ response: "Email, subject, and body are required" });
    }

    try {
        const user = await users.findOne({ email });
        if (!user) {
            return res.status(404).json({ response: "User not found" });
        }

        const formattedBody = body.replace(/\n/g, '<br/>');

        const html = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px 20px; background-color: #f8fafc; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="padding: 32px; background-color: #7c3aed; text-align: center;">
                    <img src="https://www.steadybill.pro/logo.png" alt="SteadyBill" style="width: 140px; filter: brightness(0) invert(1);">
                </div>
                <div style="padding: 40px 32px; line-height: 1.8;">
                    <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 800;">Hi ${user.firstname || 'there'},</h2>
                    <div style="font-size: 16px; color: #334155;">
                        ${formattedBody}
                    </div>
                    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <a href="https://www.steadybill.pro/dashboard" style="display: inline-block; padding: 14px 28px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px;">Go to Dashboard</a>
                    </div>
                </div>
                <div style="padding: 24px 32px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">© ${new Date().getFullYear()} SteadyBill. All rights reserved.</p>
                    <p style="margin: 4px 0 0;">You received this email because you're a registered user on SteadyBill.</p>
                </div>
            </div>
          </div>
        `;

        await mailer(subject, email, html);
        res.status(200).json({ response: `Email sent successfully to ${email}` });
    } catch (error) {
        console.error("Single Mailing Error:", error);
        res.status(500).json({ response: "Error sending email" });
    }
};

/**
 * Update system-wide broadcast message
 */
exports.updateBroadcast = async (req, res) => {
    const { message, type, isActive } = req.body;
    try {
        // We only ever want one active broadcast record for simplicity
        await broadcasts.updateOne(
            { id: "global_broadcast" },
            {
                $set: {
                    message,
                    type, // 'info', 'warning', 'maintenance'
                    isActive,
                    updatedAt: new Date().toISOString()
                }
            },
            { upsert: true }
        );

        res.status(200).json({ response: "Broadcast system updated" });
    } catch (error) {
        console.error("Update Broadcast Error:", error);
        res.status(500).json({ response: "Error updating broadcast" });
    }
};

/**
 * Dev Endpoint: Make the authenticated user an admin
 */
exports.makeMeAdmin = async (req, res) => {
    const email = req.user;
    try {
        const result = await users.updateOne(
            { email: email },
            { $set: { isAdmin: true } }
        );

        if (result.matchedCount > 0) {
            res.status(200).json({ response: "You are now an Admin!" });
        } else {
            res.status(404).json({ response: "User not found" });
        }
    } catch (error) {
        console.error("Make Admin Error:", error);
        res.status(500).json({ response: "Error updating admin status" });
    }
};
