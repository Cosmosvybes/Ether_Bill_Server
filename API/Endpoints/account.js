const jwt = require("jsonwebtoken");
const { createAccount, getUser } = require("../../Model/User/User");
const { addClient, findClient } = require("../../controller/controls/add");
const { removeClient } = require("../../controller/controls/delete");
const { useAppSettings } = require("../../controller");
const { config } = require("dotenv");
const { mailer } = require("../../utils/EmailService/Mailer");
const { users } = require("../../utils/Mongo/collection/collection");
config();

//?? //////////////////////////////////////////////////////////
//  SIGN UP
//?? //////////////////////////////////////////////////////////

exports.signUp = async (req, res) => {
  const { Firstname, Lastname, Email, Password } = req.body;

  const user = {
    firstname: Firstname.toLowerCase(),
    lastname: Lastname.toLowerCase(),
    email: Email.toLowerCase(),
    password: Password,
  };

  try {
    let isAnExistingUser = await getUser(Email);
    if (!isAnExistingUser) {
      const { insertedId } = await createAccount(user);

      if (insertedId) {
        const { success, code } = await sendVerificationEmail(Email, "Welcome to SteadyBill! 🚀");

        if (success) {
          return res.status(200).send({
            response: "Verification code sent to your email",
            requireVerification: true
          });
        } else {
          return res.status(200).send({
            response: "Account created but failed to send verification email. Please use the 'Resend' option on the verification page.",
            requireVerification: true
          });
        }
      }
      return res.status(503).send({ response: "Something went wrong" });
    } else {
      // [NEW] If user exists but is NOT verified, resend code and allow them to proceed to verification
      if (isAnExistingUser.emailVerified === false) {
        const { success } = await sendVerificationEmail(Email, "Verify Your Account (Resent)");
        return res.status(200).send({
          response: success ? "Account already exists but is unverified. A new code has been sent." : "Account exists and is unverified. Use the 'Resend' option if you don't see the code.",
          requireVerification: true
        });
      }
    }
    res
      .status(403)
      .send({ response: "Existing account, sign in or reset password" });
  } catch (error) {
    res.status(500).send({ response: "connection error" });
  }
};

async function sendVerificationEmail(email, title = "Verify Your Account") {
  const verificationCode = Math.floor(100000 + Math.random() * 900000); // 6-digit code

  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #7c3aed;">${title}</h2>
      <p>Your verification code is:</p>
      <h1 style="background: #f3f4f6; padding: 10px; display: inline-block; border-radius: 5px; letter-spacing: 5px;">${verificationCode}</h1>
      <p>Please enter this code to continue.</p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  try {
    const mailResponse = await mailer(title, email, html);
    if (mailResponse.success) {
      await updateVerificationCode(email, verificationCode);
      return { success: true, code: verificationCode };
    }
    return { success: false };
  } catch (error) {
    console.error("Email sending helper error:", error);
    return { success: false };
  }
}

//?? //////////////////////////////////////////////////////////
//  SIGN IN
//?? //////////////////////////////////////////////////////////
exports.signIn = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await getUser(email.toLowerCase());
    if (!user) {
      return res.status(404).send({ response: "Account not found" });
    }

    if (user) {
      if (user.password.toLowerCase() == password.toLowerCase()) {
        // [NEW] Check for email verification
        if (user.emailVerified === false) {
          return res.status(401).send({ response: "Please verify your email to continue" });
        }

        const { email } = user; //
        const token = jwt.sign({ userEmail: email }, process.env.EMAILPASS, {
          expiresIn: "7d",
        });
        return res.status(200).send({
          response: `Welcome back ${email}`,
          token,
        });
      } else {
        // return status 403 if password doesn't match
        res.status(403).send({ response: "Incorrect password" });
      }
    }
  } catch (error) {
    res.status(500).send({ response: "connection error" });
  }
};

//?? //////////////////////////////////////////////////////////
// USER ACCOUNT
//?? //////////////////////////////////////////////////////////
exports.userAccount = async (req, res) => {
  const userEmail = req.user;
  try {
    const user = await getUser(userEmail);
    res.status(200).send({ ...user });
  } catch (error) {
    res.status(500).send({ response: "connection error" });
  }
};

//?? //////////////////////////////////////////////////////////
// ADD CLIENT
//?? //////////////////////////////////////////////////////////

exports.addNewClient = async (req, res) => {
  const userEmail = req.user;
  const client = req.body;
  const { email } = client;

  try {
    const isExisting = await findClient(userEmail, email);
    if (isExisting) {
      return res.status(403).send({ response: "client already exist" });
    }
    const response = await addClient(userEmail, client);

    return (
      response &&
      res.status(200).send({ response: "client successfully added" })
    );
  } catch (error) {
    res.status(500).send({ reponse: "Operation failed try again" });
  }
};

//?? //////////////////////////////////////////////////////////
// DELETE CLIENT
//?? //////////////////////////////////////////////////////////
exports.deleteClient = async (req, res) => {
  const userEmail = req.user;
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ response: "Client email is required" });
  }

  try {
    const response = await removeClient(userEmail, email);
    if (response) {
      return res.status(200).send({ response: "Client deleted successfully" });
    }
    return res.status(404).send({ response: "Client not found" });
  } catch (error) {
    res.status(500).send({ response: "Operation failed, try again" });
  }
};

//?? //////////////////////////////////////////////////////////
// ACCOUNT SETTINGS
//?? //////////////////////////////////////////////////////////
exports.accountSettings = async (req, res) => {
  const email = req.user;
  const settingsData = req.body;
  try {
    const response = await useAppSettings(email, settingsData);
    response &&
      res
        .status(200)
        .send({ response: "Account settings updated successfully" });
  } catch (error) {
    res.status(500).send({ reponse: "Operation failed try again" });
  }
};

//?? //////////////////////////////////////////////////////////
// FORGOT PASSWORD
//?? //////////////////////////////////////////////////////////

exports.resetPasswordCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await getUser(email.toLowerCase());
    if (!user) return res.status(404).send({ response: "User not found" });

    const { success } = await sendVerificationEmail(email.toLowerCase(), "Password Reset Code");

    if (success) {
      return res
        .status(200)
        .send({ message: `Verification code sent to ${email}` });
    } else {
      return res
        .status(503)
        .send({ response: "Failed to send verification code. Please try again." });
    }
  } catch (error) {
    res.status(500).send({ response: "Operation failed try again" });
  }
};

exports.resendVerification = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send({ response: "Email is required" });

  try {
    const user = await getUser(email.toLowerCase());
    if (!user) return res.status(404).send({ response: "User not found" });

    const { success } = await sendVerificationEmail(email.toLowerCase(), "New Verification Code");

    if (success) {
      return res.status(200).send({ response: "A new code has been sent to your email" });
    } else {
      return res.status(503).send({ response: "Failed to send code. Please try again later." });
    }
  } catch (error) {
    res.status(500).send({ response: "Internal server error" });
  }
};

async function updateVerificationCode(email, code) {
  try {
    await users.updateOne({ email: email }, { $set: { code } });
  } catch (error) {
    throw new Error("Error occured");
  }
}

async function verifyCode(email, code) {
  try {
    const user = await getUser(email.toLowerCase());
    if (!user) {
      console.log("Verify: User not found");
      return false;
    }
    const verificationCode = Number(user.code);
    const isValidCode = verificationCode == code;
    return isValidCode;
  } catch (error) {
    throw new Error("Error occured");
  }
}

async function updatePassword(email, newPassword) {
  try {
    const response = await users.updateOne(
      { email },
      { $set: { password: newPassword } }
    );
    return response;
  } catch (error) {
    throw new Error("Error occured");
  }
}

exports.verifyCode = async (req, res) => {
  const { userEmail, email, code } = req.body; // Check for both
  const targetEmail = userEmail || email; // Fallback
  console.log("Verify Code Request:", { targetEmail, code, body: req.body });

  try {
    if (!targetEmail) return res.status(400).send({ response: "Email is missing" });

    const isValid = await verifyCode(targetEmail, code);

    if (!isValid)
      return res.status(403).send({ response: "Code does not match" });

    // [NEW] Automatically verify email if it wasn't already
    await users.updateOne({ email: targetEmail.toLowerCase() }, { $set: { emailVerified: true } });

    return res.status(200).send({ message: "success" });
  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).send({ reponse: "Internal sever error, try again" });
  }
};

exports.updatePassword = async (req, res) => {
  const { userEmail, email, newPassword } = req.body; // Support both
  const rawEmail = userEmail || email;

  if (!rawEmail) return res.status(400).send({ message: "Email is missing" });

  const targetEmail = rawEmail.toLowerCase();
  console.log("Update Password Request:", { targetEmail, newPasswordProvided: !!newPassword });

  try {
    const result = await updatePassword(targetEmail, newPassword);
    const { modifiedCount, matchedCount } = result;

    if (matchedCount === 0) {
      return res.status(404).send({ message: "User not found during password update" });
    }

    if (modifiedCount === 0 && matchedCount === 1) {
      // User found but password unchanged
      return res.status(200).send({ message: "New password is same as current password (No change)" });
    }

    if (modifiedCount > 0) {
      return res.status(200).send({ message: "password successfully updated" });
    }

    return res.status(503).send({ message: "Operation failed, try again!" });
  } catch (error) {
    res.status(500).send({ reponse: "Internal server error, try again!" });
  }
};
const { verifyPaystackTransaction } = require("../../services/paystack");
const { PRICING } = require("../../utils/pricing");

exports.upgradeUserSubscription = async (req, res) => {
  const email = req.user;
  const { planType, tx_ref, provider } = req.body; // Accept tx_ref and provider

  try {
    const user = await getUser(email);
    if (!user) return res.status(404).send({ response: "User not found" });

    // 1. Idempotency Check
    if (tx_ref && user.processedPayments && user.processedPayments.includes(tx_ref)) {
      return res.status(200).send({ response: "Subscription already updated for this payment.", alreadyProcessed: true });
    }

    // 2. Payment Verification (Paystack)
    if (provider === 'paystack') {
      try {
        const verification = await verifyPaystackTransaction(tx_ref);
        if (!verification.status || verification.data.status !== 'success') {
          return res.status(400).send({ response: "Payment verification failed" });
        }

        // Price Enforcement
        const amountPaid = verification.data.amount / 100; // Paystack returns kobo
        const expectedPrice = planType === 'pro_services' ? PRICING.NGN.PRO_SERVICES : PRICING.NGN.MONTHLY;

        // Allow small margin of error or exact match (flexible for now, but strict is better)
        if (amountPaid < expectedPrice) {
          return res.status(400).send({ response: `Insufficient payment amount. Expected ${expectedPrice}, got ${amountPaid}` });
        }

      } catch (err) {
        console.error("Paystack Verification Error:", err);
        return res.status(500).send({ response: "Payment verification error" });
      }
    }
    // TODO: Add Flutterwave verification here if needed (currently trusted/legacy)

    let expiryDate = new Date();
    if (planType === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const updateQuery = {
      $set: {
        isSubscribed: true,
        subscriptionExpiry: expiryDate.toISOString(),
        planType: planType || 'monthly'
      }
    };

    if (tx_ref) {
      updateQuery.$addToSet = { processedPayments: tx_ref };
    }

    const response = await users.updateOne({ email }, updateQuery);

    if (response.modifiedCount > 0 || response.matchedCount > 0) {
      return res.status(200).send({ response: "User upgraded to PRO successfully" });
    }
    return res.status(404).send({ response: "User not found" });
  } catch (error) {
    console.error("Upgrade Error:", error);
    res.status(500).send({ response: "Internal server error" });
  }
};

exports.topupSMSCredits = async (req, res) => {
  const email = req.user;
  const { amount, credits, tx_ref } = req.body;

  if (!credits || !tx_ref) {
    return res.status(400).send({ response: "Credits and transaction reference are required" });
  }

  try {
    // 1. Idempotency check
    const user = await getUser(email);
    if (user && user.processedPayments && user.processedPayments.includes(tx_ref)) {
      return res.status(200).send({ response: "Top-up already processed for this payment.", alreadyProcessed: true });
    }

    // 2. Increment balance and track payment
    const updateResult = await users.updateOne(
      { email },
      {
        $inc: { smsBalance: Number(credits) },
        $addToSet: { processedPayments: tx_ref }
      }
    );

    if (updateResult.modifiedCount > 0 || updateResult.matchedCount > 0) {
      return res.status(200).send({ response: `Successfully added ${credits} SMS credits`, newBalance: (user.smsBalance || 0) + Number(credits) });
    }
    return res.status(404).send({ response: "User not found" });
  } catch (error) {
    console.error("Top-up Error:", error);
    res.status(500).send({ response: "Internal server error" });
  }
};
