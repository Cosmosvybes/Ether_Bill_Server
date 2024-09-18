const nodemailer = require("nodemailer");
const { config } = require("dotenv");
config();
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAILPASS,
  },
});

exports.mailer = async (_subject, receipient, _mail) => {
  try {
    const info = await transport.sendMail({
      from: '"Etherbill Inc. " <etherbill.suppport@gmail.com>',
      to: receipient,
      subject: _subject,
      html: _mail,
    });
    return info.messageId;
  } catch (error) {
    console.log(error);
  }
};
