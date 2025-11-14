const jwt = require("jsonwebtoken");
const { createAccount, getUser } = require("../../Model/User/User");
const { addClient, findClient } = require("../../controller/controls/add");
const { useAppSettings } = require("../../controller");
const { config } = require("dotenv");
// const Mail = require("nodemailer/lib/mailer");
const { mailer } = require("../../utils/Nodemailer/Mailer");
const { users } = require("../../utils/Mongo/collection/collection");
config();

//?? //////////////////////////////////////////////////////////
//  SIGN UP
//?? //////////////////////////////////////////////////////////

exports.signUp = async (req, res) => {
  const { Firstname, Lastname, Email, Password } = req.body;
  console.log(req.body);
  const saltRound = 10;
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
        ? res.status(200).send({ response: "Account succesfully created" })
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

  try {
    const user = await getUser(email.toLowerCase());
    if (!user) return res.status(403).send({ response: "User not found" });

    const response = await mailer(
      "PASSWORD RESET",
      email.toLowerCase(),
      emailInstance
    );
    await updateVerificationCode(email, verificationCode);
    if (response)
      res.status(200).send({ message: `Verication code sent to ${email}` });
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
  const { userEmail, code } = req.body;
  try {
    const isValid = await verifyCode(userEmail, code);
    if (!isValid)
      return res.status(403).send({ response: "Code does not match" });
    return res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ reponse: "Internal failed try again" });
  }
};

exports.updatePassword = async (req, res) => {
  const { userEmail, newPassword } = req.body;
  try {
    const response = await updatePassword(userEmail, newPassword);
    if (!response.modifiedCount)
      return res.status(503).send({ message: "Operation failed, try again" });
    return res.status(200).send({ message: "password successfully updated" });
  } catch (error) {
    res.status(500).send({ reponse: "Internal server error" });
  }
};
