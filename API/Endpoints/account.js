const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createAccount, getUser } = require("../../Model/User/User");
const { addClient } = require("../../controller/controls/add");
const { useAppSettings } = require("../../controller");

//?? //////////////////////////////////////////////////////////
//  SIGN UP
//?? //////////////////////////////////////////////////////////

exports.signUp = async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  const saltRound = 10;
  let hashedPassword = await bcrypt.hash(password, saltRound);

  //
  const user = {
    firstname: firstname.toLowerCase(),
    lastname: lastname.toLowerCase(),
    email: email.toLowerCase(),
    password: hashedPassword,
  };
  try {
    let isAnExistingUser = await getUser(email);
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
  const { email, password } = req.query;
  try {
    const user = await getUser(email.toLowerCase());
    if (!user) {
      return res.status(404).send({ response: "Account not found" });
    }
    if (user) {
      const passwordMatch = await bcrypt.compare(
        password.toLowerCase(),
        user.password
      );
      if (passwordMatch) {
        const { email } = user; //
        const token = jwt.sign({ userEmail: email }, "secret", {
          expiresIn: "5h",
        });
        return res.status(200).send({
          response: `Welcome back ${email}`,
          token: encodeURIComponent(token),
        });
      } else {
        res.status(403).send({ response: "Incorrect password" });
      }
    }
  } catch (error) {
    res.status(500).send({ response: "connection error" });
  }
};

exports.userAccount = async (req, res) => {
  const userEmail = req.user;
  try {
    const user = await getUser(userEmail);
    res.status(200).send({ ...user });
  } catch (error) {
    res.status(500).send({ response: "connection error" });
  }
};
exports.addNewClient = async (req, res) => {
  const userEmail = req.user;
  const client = req.body;

  try {
    const response = await addClient(userEmail, client);

    return (
      response &&
      res.status(200).send({ response: "client successfully added" })
    );
  } catch (error) {
    res.status(500).send({ reponse: "Operation failed try again" });
  }
};

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
