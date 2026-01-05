const { Resend } = require("resend");
const { config } = require("dotenv");
config();

const resend = new Resend(process.env.RESEND_API_KEY);

exports.mailer = async (_subject, receipient, _mail) => {
  const keyStatus = process.env.RESEND_API_KEY ? "Loaded" : "Missing";
  console.log(`[Scaler] Sending email to ${receipient}. Key: ${keyStatus}`);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "STEADYBILL <billing@steadybill.pro>",
      to: [receipient],
      subject: _subject,
      html: _mail,
    });

    if (error) {
      console.error("Resend Error Result:", error);
      return { success: false, error };
    }

    console.log("Email Sent Successfully! ID:", data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Email Service Exception:", error);
    return { success: false, error: error.message };
  }
};
