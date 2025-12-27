const { users, broadcasts } = require("../../utils/Mongo/collection/collection");
const { mailer } = require("../../utils/EmailService/Mailer");

/**
 * Get high-level application metrics
 */
exports.getStats = async (req, res) => {
    try {
        const allUsers = await users.find({}).toArray();

        const totalUsers = allUsers.length;
        const proUsers = allUsers.filter(u => u.isSubscribed).length;
        const totalRevenue = allUsers.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0);

        // Sum of all invoices sent across all users
        const totalInvoices = allUsers.reduce((acc, curr) => acc + (curr.sent?.length || 0) + (curr.paid?.length || 0), 0);

        // Active recurring profiles
        const activeSubscriptions = allUsers.reduce((acc, curr) => acc + (curr.recurring?.length || 0), 0);

        res.status(200).json({
            totalUsers,
            proUsers,
            totalRevenue,
            totalInvoices,
            activeSubscriptions,
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
