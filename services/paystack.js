const { config } = require("dotenv");
const crypto = require("crypto");
config();
exports.getAccessCode = async (req, res) => {
  const { email, amount } = req.query;
  try {
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SECRET_KEY}`,
          "Content-Type": "Application/json",
        },
        body: JSON.stringify({
          amount,
          email,
          ref: crypto
            .createHmac("sha256", "salt")
            .update(JSON.stringify(new Date()))
            .digest("base64url"),
        }),
      }
    );
    const result = await response.json();
    const { access_code } = result.data;
    res.status(200).send({ access_code });
  } catch (error) {
    res.status(500).send({ res: "Internal server error" });
  }
};
