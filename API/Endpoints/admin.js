const { users } = require("../../utils/Mongo/collection/collection");

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
 * Get list of all users with essential info
 */
exports.getAllUsers = async (req, res) => {
    try {
        const allUsers = await users.find({}, {
            projection: {
                password: 0,
                draft: 0,
                inbox: 0,
                sent: 0,
                paid: 0
            }
        }).toArray();

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

        res.status(200).json(usersSummary);
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
