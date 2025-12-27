const { Resend } = require("resend");
const { config } = require("dotenv");
config();

const resend = new Resend(process.env.RESEND_API_KEY);

exports.mailer = async (_subject, receipient, _mail) => {
  const keyStatus = process.env.RESEND_API_KEY ? "Loaded" : "Missing";
  console.log(`[Scaler] Sending email to ${receipient}. Key: ${keyStatus}`);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "EtherBill <onboarding@resend.dev>",
      to: [receipient],
      subject: _subject,
      html: _mail,
    });

    if (error) {
      console.error("Resend Error Result:", error);
      return null;
    }

    console.log("Email Sent Successfully! ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("Email Service Exception:", error);
    return null;
  }
};
