const { broadcasts } = require("../../utils/Mongo/collection/collection");

/**
 * Get active system-wide broadcast message
 */
exports.getBroadcast = async (req, res) => {
    try {
        const broadcast = await broadcasts.findOne({ id: "global_broadcast" });
        res.status(200).json(broadcast || { isActive: false, message: "", type: "info" });
    } catch (error) {
        console.error("Get Broadcast Error:", error);
        res.status(500).json({ response: "Error fetching broadcast" });
    }
};
