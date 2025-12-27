const { getUser } = require("../../Model/User/User");

exports.isAdmin = async (req, res, next) => {
    try {
        const user = await getUser(req.user);

        if (user && user.isAdmin === true) {
            next();
        } else {
            return res.status(403).send({
                response: "Access Denied: Admin privileges required."
            });
        }
    } catch (error) {
        console.error("Admin Auth Error:", error);
        res.status(500).send({ response: "Internal Server Error" });
    }
};
