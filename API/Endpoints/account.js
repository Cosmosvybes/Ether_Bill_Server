const jwt = require("jsonwebtoken");
const { createAccount, getUser } = require("../../Model/User/User");
const { addClient, findClient } = require("../../controller/controls/add");
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
  // const saltRound = 10;
  // let hashedPassword = await bcrypt.hash(Password, saltRound);

  //
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
      return insertedId
        ? res.status(200).send({ response: "Account successfully created" })
        : res.status(503).send({ response: "Something went wrong" });
    }
    res
      .status(403)
      .send({ response: "Existing account, sign in or reset password" });
  } catch (error) {
    res.status(500).send({ response: "connection error" });
  }
};

//?? //////////////////////////////////////////////////////////
//  SIGN IN
//?? //////////////////////////////////////////////////////////
exports.signIn = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await getUser(email.toLowerCase());
    if (!user) {
      // @dev if not  registered user return status 404
      return res.status(404).send({ response: "Account not found" });
    }
    // console.log(password, user.password);
    if (user) {
      // const passwordMatch = await bcrypt.compare(
      //   password.toLowerCase(),
      //   user.password
      // );

      if (user.password.toLowerCase() == password.toLowerCase()) {
        const { email } = user; //
        const token = jwt.sign({ userEmail: email }, process.env.EMAILPASS, {
          expiresIn: "60m",
        });
        return res.status(200).send({
          response: `Welcome back ${email}`,
          token: encodeURIComponent(token),
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
  const { email, emailInstance, verificationCode } = req.body;
  console.log("Reset Password Request:", { email, hasHtml: !!emailInstance, code: verificationCode });

  try {
    const user = await getUser(email.toLowerCase());
    console.log("User Lookup Result:", user ? "Found" : "Not Found");
    if (!user) return res.status(404).send({ response: "User not found" });

    const response = await mailer(
      "PASSWORD RESET",
      email.toLowerCase(),
      emailInstance
    );
    await updateVerificationCode(email, verificationCode);
    if (response) {
      return res
        .status(200)
        .send({ message: `Verication code sent to ${email}` });
    } else {
      return res
        .status(503)
        .send({ response: "Failed to send verification code" });
    }
  } catch (error) {
    res.status(500).send({ reponse: "Operation failed try again" });
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
    console.log(`Verifying: DB=${verificationCode} vs Input=${code}`);
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
    console.log("Verification Result:", isValid);

    if (!isValid)
      return res.status(403).send({ response: "Code does not match" });
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

    console.log("Password Update Result:", { matchedCount, modifiedCount });

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
exports.upgradeUserSubscription = async (req, res) => {
  const email = req.user;
  const { planType } = req.body; // 'monthly' or 'yearly'

  try {
    let expiryDate = new Date();
    if (planType === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      // Default to monthly
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const response = await users.updateOne(
      { email },
      {
        $set: {
          isSubscribed: true,
          subscriptionExpiry: expiryDate.toISOString(),
          planType: planType || 'monthly'
        }
      }
    );

    if (response.modifiedCount > 0 || response.matchedCount > 0) {
      return res.status(200).send({ response: "User upgraded to PRO successfully" });
    }
    return res.status(404).send({ response: "User not found" });
  } catch (error) {
    console.error("Upgrade Error:", error);
    res.status(500).send({ response: "Internal server error" });
  }
};
