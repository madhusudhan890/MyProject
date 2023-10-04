const bcrypt = require("bcryptjs");
const { GenerateToken } = require("../functions/function");
const { OK, ERROR, RESPONSE, RESPONSE_ERROR } = require("../../../utils/responseHelper");
const UserService = require("../services/user.service");
const axios = require("axios");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const LoginAuthService = require("../services/login-auth.service");
const { databaseDataMappingFunction } = require("../functions/database.mapping");
const DepartmentService = require("../services/department.service");
const { apiLog } = require("../functions/api.log");
const trainingUsers = require("../../../__data__/training-employee/users.json");
module.exports = class UserController {
  static async createUser(req, res) {
    try {
      const { firstName, lastName, email, password } = req.body;

      const isUserPresent = await UserService.checkUser(email.toLowerCase());

      if (isUserPresent) return ERROR(res, null, "A user is already registered with this email");

      const hashPassword = await bcrypt.hash(password, 12);

      const body = {
        firstName,
        lastName,
        password: hashPassword,
        email: email.toLowerCase(),
      };

      const user = await UserService.createUser(body);

      const token = GenerateToken(user);

      return OK(res, { user, token }, "user registered successfully");
    } catch (error) {
      return ERROR(res, { error }, error.message || "Something went Wrong");
    }
  }

  static async updateUser(req, res) {
    try {
      const { firstName, lastName, email, role, isActive } = req.body;

      const body = {};

      if (firstName) body.firstName = firstName;
      if (lastName) body.lastName = lastName;
      if (email) body.email = email.toLowerCase();

      if (req.payload.role === "ADMIN" && role) body.role = role;
      if (req.body.hasOwnProperty("isActive")) body.isActive = isActive;

      if (!Object.keys(body).length) return ERROR(res, null, "Nothing to update");

      const user = await UserService.updateUser(req.params.userCode, body);
      return OK(res, user, "user updated successfully");
    } catch (error) {
      return ERROR(res, { error }, error.message || "Something went Wrong");
    }
  }

  static async resetPassword(req, res) {
    try {
      const hashPassword = await bcrypt.hash("password", 12);

      const body = {
        password: hashPassword,
      };

      const user = await UserService.updateUser(req.params.userCode, body);
      return OK(res, user, "password updated successfully");
    } catch (error) {
      return ERROR(res, { error }, error.message || "Something went Wrong");
    }
  }

  static async deleteUser(req, res) {
    try {
      const { isActive } = req.body;
      const body = {};

      if (req.body.hasOwnProperty("isActive")) body.isActive = isActive;

      const user = await UserService.updateUser(req.params.userCode, body);
      return OK(res, user, "user deleted successfully");
    } catch (error) {
      return ERROR(res, { error }, error.message || "Something went Wrong");
    }
  }

  static async changePassword(req, res) {
    try {
      const { email, password } = req.body;

      const userPresent = await UserService.checkUser(email.toLowerCase());

      const hashPassword = await bcrypt.hash(password, 12);

      const body = {
        password: hashPassword,
      };

      const user = await UserService.updateUser(userPresent.userCode, body);
      return OK(res, user, "password changed successfully");
    } catch (error) {
      return ERROR(res, { error }, error.message || "Something went Wrong");
    }
  }

  static async loginUser(req, res) {
    const { email, password } = req.body;

    const traineeUserPresent = trainingUsers.find(
      (trainee) => trainee.email === email && trainee.password === password
    );

    if (traineeUserPresent) {
      try {
        const userData = await UserService.getUserByKey({ email, role: "ROLE_TRAINING" });
        if (userData) {
          const user = {
            userCode: userData.userCode,
            userName: userData.userName,
            email: userData.email,
            role: userData.role,
          };
          const token = GenerateToken(user);
          return RESPONSE({ res, message: "user login successfully", result: { user, token } });
        }
        return RESPONSE_ERROR({ res, statusCode: 400, message: "Invalid email or password" });
      } catch (error) {
        console.log("TRAINING EMPLOYEE LOGIN........", error);
        return RESPONSE_ERROR({
          res,
          message: "Opps Something went Wrong",
        });
      }
    } else {
      try {
        const config = {
          method: "post",
          timeout: 30000,
          url: `${process.env.GAMMA_API_ENDPONT}/users/login`,
          auth: {
            username: email,
            password: password,
          },
        };
        const result = await axios(config);

        apiLog({
          userId: result.data.sksuserid,
          ip: req.ip,
          method: result.config.method,
          url: result.config.url,
          statusCode: result.status,
          request: null,
          response: result.data,
        });

        const roles = result.data.roles.map((role) => role.rolename);
        const body = {
          userGammaId: result.data.sksuserid,
          userName: result.data.username,
          email: result.data.email,
          role: roles.includes("ROLE_DEPT_ADMIN")
            ? "ROLE_DEPT_ADMIN"
            : roles.includes("ROLE_SYSADMIN")
            ? "ROLE_SYSADMIN"
            : "ROLE_USER",
          isActive: true,
        };

        const user = await UserService.createUser({ userGammaId: body.userGammaId, email: body.email }, body, {
          upsert: true,
          new: true,
        });

        await LoginAuthService.deleteLoginAuth({ userCode: user.userCode });

        // Decoding 3rd Party Access Token to get Token Expiry TimeStamp
        const tokenExpireUnix = await jwt.decode(result.headers["jwt-token"]);

        // Timesatamp Format Change
        const tokenCreateAt = moment(tokenExpireUnix.iat, "X").format();
        const tokenExpireAt = moment(tokenExpireUnix.exp, "X").format();

        // Creating JWT Token for API authentication
        const token = jwt.sign(
          {
            userCode: user.userCode,
            userName: user.userName,
            email: user.email,
            role: user.role,
          },
          process.env.SECRET,
          {
            expiresIn: `${moment.duration(moment(tokenExpireAt).diff(moment(tokenCreateAt))).asHours()}h`,
          }
        );

        await LoginAuthService.createLoginAuth({
          userCode: user.userCode,
          integratedPlatformToken: result.headers["jwt-token"],
          expireAt: new Date(tokenExpireAt),
        });

        const updateUser = {
          sksuserid: result.data.sksuserid,
          email: user.email,
          userCode: user.userCode,
          userName: user.userName,
          role: user.role,
          departmentsIds: result.data.departments.map((dept) => dept.id),
        };

        if (result.data.departments && result.data.departments.length > 0) {
          await databaseDataMappingFunction(res, req, updateUser);
        } else {
          //////////Soft Delete All Departments of User//////////
          await DepartmentService.updateMany(
            { usersIn: updateUser.userCode },
            { $pull: { usersIn: updateUser.userCode } }
          );
          ///////////////////////////////////////////////////////
        }

        const responseUser = {
          userCode: user.userCode,
          userName: user.userName,
          email: user.email,
          role: user.role,
        };
        return RESPONSE({ res, message: "user login successfully", result: { user: responseUser, token } });
      } catch (error) {
        // Checking if error is from API Call
        if (error.response && error.response.status && error.response.status != 200) {
          apiLog({
            userId: null,
            ip: req.ip,
            method: error.config.method,
            url: error.config.url,
            statusCode: error.response.status,
            request: null,
            response: error.response.data,
          });
        }
        if (error.response && error.response.status && error.response.status != 200) {
          console.log(`Gamma Error: ` + error);
          return RESPONSE_ERROR({
            res,
            statusCode: error.response.data.httpStatusCode,
            message: error.response.data.message,
          });
        } else if (error.config) {
          console.log(`Axios Error: ` + error.message);

          apiLog({
            userId: null,
            ip: req.ip,
            method: error.config.method,
            url: error.config.url,
            statusCode: null,
            request: null,
            response: `Axios Error: ` + error.message,
          });

          return RESPONSE_ERROR({
            res,
            message: "Unable to connect with Gamma.",
          });
        } else {
          console.log("At ~ loginUser ~ error:", error);
          return RESPONSE_ERROR({
            res,
            message: "Opps Something went Wrong",
          });
        }
      }
    }
  }

  static async getUsers(req, res) {
    try {
      const { search, userCode, email, isActive } = req.query;

      const body = {};

      if (userCode) body.userCode = userCode;
      if (email) body.email = email.toLowerCase();
      if (req.body.hasOwnProperty("isActive")) body.isActive = isActive;

      if (search)
        body.$or = [
          {
            firstName: new RegExp(search, "i"),
          },
          {
            lastName: new RegExp(search, "i"),
          },
          {
            email: new RegExp(search, "i"),
          },
        ];

      const userPresent = await UserService.getUser({ ...body }, req.query);

      return OK(res, userPresent, "users fetched successfully");
    } catch (error) {
      return ERROR(res, { error }, error.message || "Something went Wrong");
    }
  }

  static async databaseDataMappingFunction(req, res) {}
};
