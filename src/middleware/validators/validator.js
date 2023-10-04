const bcrypt = require("bcryptjs");
const moment = require("moment");
const { check, query, body, param, se } = require("express-validator");
const { validationResult } = require("express-validator");
const { BAD, ERROR, RESPONSE_ERROR } = require("../../../utils/responseHelper");
const UserService = require("../../v1/services/user.service");
const DepartmentService = require("../../v1/services/department.service");
const TeamService = require("../../v1/services/department-teams.service");

// eslint-disable-next-line consistent-return
exports.validateRequest = (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return BAD(
        res,
        errors.array().map((e) =>
          process.env.NODE_ENV.trim() === "production"
            ? {
                msg: e.msg,
                param: e.param,
                location: e.location,
              }
            : { ...e }
        ),
        validationResult(req)
          .array()
          .map((e) => e.msg)
          .join(", ")
      );
    }
    next();
  } catch (error) {
    return ERROR(res, { error }, error.message || "Something went Wrong");
  }
};

exports.validateRequestForGamma = (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        statusCode: 400,
        status: false,
        message: validationResult(req)
          .array()
          .map((e) => e.msg)
          .join(", "),
        errors: errors.array().map((e) =>
          process.env.NODE_ENV.trim() === "production"
            ? {
                msg: e.msg,
                param: e.param,
                location: e.location,
              }
            : { ...e }
        ),
      });
    }
    next();
  } catch (error) {
    return ERROR(res, { error }, error.message || "Something went Wrong");
  }
};

exports.LoginUser = [
  check("email")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("valid Email is required"),
  check("password")
    .trim()
    .not()
    .isEmpty()
    .withMessage("password is required")
    .bail()
    .isLength({ min: 6 })
    .withMessage("password should be at least 6 character long"),
];

exports.User = [
  check("firstName").trim().not().isEmpty().withMessage("firstName is required"),
  check("lastName").trim().not().isEmpty().withMessage("lastName is required"),
  check("email")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("valid Email is required"),
  check("password")
    .trim()
    .not()
    .isEmpty()
    .withMessage("password is required")
    .bail()
    .isLength({ min: 6 })
    .withMessage("password should be at least 6 character long"),
];

exports.ChangePassword = [
  check("email")
    .trim()
    .not()
    .isEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("valid Email is required"),
  check("oldPassword")
    .trim()
    .not()
    .isEmpty()
    .withMessage("oldPassword is required")
    .bail()
    .isLength({ min: 6 })
    .withMessage("oldPassword should be at least 6 character long")
    .bail()
    .custom(async (value, { req }) => {
      const { email, password } = req.body;

      if (value === password) throw new Error("you cant make your new password same as old password");

      const userPresent = await UserService.checkUser(email);

      const hashedPassword = await bcrypt.compare(value, userPresent.password);

      if (!hashedPassword) throw new Error("invalid old password");

      return true;
    }),
  check("password")
    .trim()
    .not()
    .isEmpty()
    .withMessage("password is required")
    .bail()
    .isLength({ min: 6 })
    .withMessage("password should be at least 6 character long"),
  check("confirmPassword")
    .trim()
    .not()
    .isEmpty()
    .withMessage("confirmPassword is required")
    .bail()
    .isLength({ min: 6 })
    .withMessage("confirmPassword should be at least 6 character long")
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("password didn't match with confirmPassword");
      }
      return true;
    }),
];

exports.Client = [
  body("clientName").trim().not().isEmpty().withMessage("Client Name is required"),
  body("clientRefName").trim().not().isEmpty().withMessage("client Ref. Name is required"),
  body("vatStatus")
    .trim()
    .not()
    .isEmpty()
    .withMessage("vatStatus is required")
    .bail()
    .isIn(["YES", "NO"])
    .withMessage("VAT Status should be YES/NO"),
  body("vatNo")
    .trim()
    .default(null)
    .custom(async (_, response) => {
      if (response.req.body.vatStatus === "YES") {
        if (response.req.body.vatNo) {
          return true;
        } else {
          throw new Error("Client VAT No. is required");
        }
      }
      return true;
    }),
  body("departmentCode").trim().not().isEmpty().withMessage("Department Code is required"),
  body("teamCode").trim().not().isEmpty().withMessage("Team Code is required"),
];

exports.UpdateClient = [
  param("clientCode").trim().notEmpty().withMessage("clientCode is required"),
  body("vatStatus")
    .trim()
    .default(null)
    .custom(async (_, { req }) => {
      if (req.body.vatStatus) {
        if (["YES", "NO"].includes(req.body.vatStatus)) {
          return true;
        } else {
          throw new Error("VAT Status should be YES/NO");
        }
      }
      return true;
    }),
  body("vatNo")
    .trim()
    .default(null)
    .custom(async (_, { req }) => {
      if (req.body.vatStatus === "YES") {
        if (req.body.vatNo) {
          return true;
        } else {
          throw new Error("Client VAT No. is required");
        }
      }
      return true;
    }),
];

exports.Category = [
  check("name").trim().not().isEmpty().withMessage("name is required"),
  check("irisCode").trim().not().isEmpty().withMessage("irisCode is required"),
  check("group").trim().not().isEmpty().withMessage("group is required"),
  check("heading").trim().not().isEmpty().withMessage("heading is required"),
];

exports.CustomType = [check("name").trim().not().isEmpty().withMessage("name is required")];

exports.Worksheet = [
  body("name").trim().not().isEmpty().withMessage("name is required"),
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Worksheet Type is required")
    .bail()
    .isIn(["BANK", "ONLY_CASHBOOK", "ONLY_INVOICE", "VAT_RETURNS"])
    .withMessage("Invalid Worksheet Type"),
  body("endDate").isDate().not().isEmpty().withMessage("endDate is required"),
  body("departmentCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("departmentCode is required")
    .bail()
    .custom(async (departmentCode) => {
      const departmentPresent = await DepartmentService.getDepartmentByKey({ departmentCode });

      if (!departmentPresent) throw new Error("invalid departmentCode");

      return true;
    }),
  body("teamCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("teamCode is required")
    .bail()
    .custom(async (teamCode) => {
      const teamPresent = await TeamService.getTeamByKey({ teamCode });
      if (!teamPresent) throw new Error("invalid teamCode");

      return true;
    }),
  body("clientCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("clientCode is required")
    .bail()
    .custom(async (clientCode) => {
      const clientPresent = await ClientService.getClientByKey({ clientCode });

      if (!clientPresent) throw new Error("invalid clientCode");

      return true;
    }),
];

exports.Document = [
  check("worksheetCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("worksheetCode is required")
    .bail()
    .custom(async (worksheetCode) => {
      const worksheetPresent = await WorksheetService.checkWorksheet(worksheetCode);
      if (!worksheetPresent) throw new Error("invalid worksheetCode");
      return true;
    }),
  check("type")
    .trim()
    .not()
    .isEmpty()
    .withMessage("type is required")
    .bail()
    .isIn(["BANK_STATEMENT", "CASHBOOK", "INVOICE", "BANK_PDF", "OTHERS"])
    .withMessage("invalid type"),
  check("referenceCode").custom(async (value, { req }) => {
    const { type, referenceCode } = req.body;
    if (type === "BANK_STATEMENT" && referenceCode === undefined) throw new Error("referenceCode is required");
    return true;
  }),
  check("bankDocumentCode").custom(async (value, { req }) => {
    const { type, bankDocumentCode } = req.body;
    if (["BANK_STATEMENT", "CASHBOOK", "INVOICE", "OTHERS"].includes(type)) return true;
    if (type === "BANK_PDF" && bankDocumentCode === undefined) throw new Error("bankDocumentCode is required");
    const documentPresent = await DocumentService.checkDocument(bankDocumentCode);
    if (!documentPresent) throw new Error("invalid bankDocumentCode");

    return true;
  }),
  check("customTypeCode").custom(async (value, { req }) => {
    const { type, customTypeCode } = req.body;
    if (["BANK_STATEMENT", "CASHBOOK", "INVOICE", "BANK_PDF"].includes(type)) return true;
    if (type === "OTHERS" && customTypeCode === undefined) throw new Error("customTypeCode is required");
    const customTypePresent = await CustomTypeService.checkCustomType(customTypeCode);
    if (!customTypePresent) throw new Error("invalid customTypeCode");
    return true;
  }),
];

exports.UpdateDocument = [
  check("type")
    .trim()
    .not()
    .isEmpty()
    .withMessage("type is required")
    .bail()
    .isIn(["OTHERS"])
    .withMessage("invalid type"),
  check("customTypeCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("customTypeCode is required")
    .bail()
    .custom(async (customTypeCode) => {
      const customTypePresent = await CustomTypeService.checkCustomType(customTypeCode);
      if (!customTypePresent) throw new Error("invalid customTypeCode");
      return true;
    }),
];

exports.Statement = [
  check("worksheetCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("worksheetCode is required")
    .bail()
    .custom(async (worksheetCode) => {
      const worksheetPresent = await WorksheetService.checkWorksheet(worksheetCode);
      if (!worksheetPresent) throw new Error("invalid worksheetCode");
      return true;
    }),
  check("documentCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("documentCode is required")
    .bail()
    .custom(async (documentCode) => {
      const documentPresent = await DocumentService.checkDocument(documentCode);
      if (!documentPresent) throw new Error("invalid documentCode");
      return true;
    }),
  check("index").trim().isNumeric().not().isEmpty().withMessage("index is required"),
  check("date").isDate().not().isEmpty().withMessage("date is required"),
  check("detail").trim().not().isEmpty().withMessage("detail is required"),
  check("debit").trim().isNumeric().not().isEmpty().withMessage("debit is required"),
  check("credit").trim().isNumeric().not().isEmpty().withMessage("credit is required"),
  check("balance").trim().isNumeric().not().isEmpty().withMessage("balance is required"),
  check("balanceCal").trim().isNumeric().not().isEmpty().withMessage("balanceCal is required"),
];

exports.BetaValidation = [
  query("clientCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("clientCode is required")
    .bail()
    .custom(async (clientCode) => {
      const clientPresent = await ClientService.getClientByKey({ clientCode });

      if (!clientPresent) throw new Error("invalid clientCode");

      return true;
    }),
  query("startDate")
    .not()
    .isEmpty()
    .withMessage("startDate is required")
    .bail()
    .isDate()
    .not()
    .isEmpty()
    .withMessage("startDate should be a valid date"),
  query("endDate")
    .not()
    .isEmpty()
    .withMessage("endDate is required")
    .bail()
    .isDate()
    .not()
    .isEmpty()
    .withMessage("endDate should be a valid date")
    .bail()
    .custom(async (value, { req }) => {
      const { startDate, endDate } = req.query;

      if (moment(startDate).valueOf() > moment(endDate).valueOf())
        throw new Error("startDate can not be greater than endDate");

      return true;
    }),
];

exports.StatementUpdate = [
  check("worksheetCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("worksheetCode is required")
    .bail()
    .custom(async (worksheetCode) => {
      const worksheetPresent = await WorksheetService.checkWorksheet(worksheetCode);
      if (!worksheetPresent) throw new Error("invalid worksheetCode");
      return true;
    }),
  check("documentCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("documentCode is required")
    .bail()
    .custom(async (documentCode) => {
      const documentPresent = await DocumentService.checkDocument(documentCode);
      if (!documentPresent) throw new Error("invalid documentCode");
      return true;
    }),
];

exports.WorksheetPresent = [
  check("worksheetCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("worksheetCode is required")
    .bail()
    .custom(async (worksheetCode) => {
      const worksheetPresent = await WorksheetService.checkWorksheet(worksheetCode);
      if (!worksheetPresent) throw new Error("invalid worksheetCode");
      return true;
    }),
];

exports.StatementCreateMany = [
  check("worksheetCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("worksheetCode is required")
    .bail()
    .custom(async (worksheetCode) => {
      const worksheetPresent = await WorksheetService.checkWorksheet(worksheetCode);
      if (!worksheetPresent) throw new Error("invalid worksheetCode");
      return true;
    }),
  check("documentCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("documentCode is required")
    .bail()
    .custom(async (documentCode) => {
      const documentPresent = await DocumentService.checkDocument(documentCode);
      if (!documentPresent) throw new Error("invalid documentCode");
      return true;
    }),
  check("data").isArray({ min: 1 }).withMessage("data is required"),
];

exports.CashbookCreate = [
  check("worksheetCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("worksheetCode is required")
    .bail()
    .custom(async (worksheetCode) => {
      const worksheetPresent = await WorksheetService.checkWorksheet(worksheetCode);
      if (!worksheetPresent) throw new Error("invalid worksheetCode");
      return true;
    }),
  check("documentCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("documentCode is required")
    .bail()
    .custom(async (documentCode) => {
      const documentPresent = await DocumentService.checkDocument(documentCode);
      if (!documentPresent) throw new Error("invalid documentCode");
      return true;
    }),
  check("date").isDate().not().isEmpty().withMessage("date is required"),
  check("detail").trim().not().isEmpty().withMessage("detail is required"),
  check("net").trim().isNumeric().not().isEmpty().withMessage("net is required"),
  check("vat").trim().isNumeric().not().isEmpty().withMessage("vat is required"),
  check("gross").trim().isNumeric().not().isEmpty().withMessage("gross is required"),
];

exports.InvoiceCreate = [
  check("worksheetCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("worksheetCode is required")
    .bail()
    .custom(async (worksheetCode) => {
      const worksheetPresent = await WorksheetService.checkWorksheet(worksheetCode);
      if (!worksheetPresent) throw new Error("invalid worksheetCode");
      return true;
    }),
  check("documentCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("documentCode is required")
    .bail()
    .custom(async (documentCode) => {
      const documentPresent = await DocumentService.checkDocument(documentCode);
      if (!documentPresent) throw new Error("invalid documentCode");
      return true;
    }),
  check("date").isDate().not().isEmpty().withMessage("date is required"),
  check("invoiceNo").trim().not().isEmpty().withMessage("invoiceNo is required"),
  check("name").trim().not().isEmpty().withMessage("name is required"),
  check("description").trim().not().isEmpty().withMessage("description is required"),
  check("net").trim().isNumeric().not().isEmpty().withMessage("net is required"),
  check("vat").trim().isNumeric().not().isEmpty().withMessage("vat is required"),
  check("gross").trim().isNumeric().not().isEmpty().withMessage("gross is required"),
];

exports.BetaWorksheet = [
  query("name").trim().not().isEmpty().withMessage("name is required"),
  query("cName").trim().not().isEmpty().withMessage("cName is required"),
  query("cRefNo").trim().not().isEmpty().withMessage("cRefNo is required"),
  query("endDate").isDate().not().isEmpty().withMessage("endDate is required"),
];

exports.WorksheetPresentBeta = [
  query("worksheetCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("worksheetCode is required")
    .bail()
    .custom(async (worksheetCode) => {
      const worksheetPresent = await WorksheetService.checkWorksheet(worksheetCode);
      if (!worksheetPresent) throw new Error("invalid worksheetCode");
      return true;
    }),
];

exports.AutoMapping = [
  check("detail").trim().not().isEmpty().withMessage("detail is required"),
  check("irisCode").trim().not().isEmpty().withMessage("irisCode is required"),
  check("type").trim().not().isEmpty().withMessage("type is required"),
];

exports.GammaCreateWorksheet = [
  body("jobIdentifier").trim().notEmpty().withMessage("Job Identifier is required"),
  body("jobGammaId")
    .notEmpty()
    .withMessage("Job Gamma ID is required")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("Job Gamma ID should be integer and greater than zero"),
  body("worksheetName").trim().notEmpty().withMessage("Worksheet Name is required"),

  body("recordType")
    .trim()
    .notEmpty()
    .withMessage("Record Type is required")
    .bail()
    .isIn(["BANK", "ONLY_CASHBOOK", "ONLY_INVOICE", "VAT_RETURNS"])
    .withMessage("Invalid Record Type"),

  body("yearEndDate")
    .notEmpty()
    .withMessage("Year End Date is required")
    .bail()
    .isDate({ format: "DD-MM-YYYY" })
    .withMessage("Invalid date format (DD-MM-YYYY)"),
  body("departmentId")
    .notEmpty()
    .withMessage("Department ID is required")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("Department ID should be integer and greater than zero"),
  body("departmentName").trim().notEmpty().withMessage("Department Name is required"),
  body("teamId")
    .default(null)
    .custom(async (teamId, { req, res }) => {
      if (teamId) {
        if (Number.isInteger(teamId)) {
          return true;
        } else {
          throw new Error("Team ID should be integer and greater than zero");
        }
      }
      if (teamId === 0) {
        throw new Error("Team ID should be integer and greater than zero");
      }
      return true;
    }),
  body("teamName")
    .trim()
    .custom(async (_, response) => {
      if (response.req.body.teamId) {
        if (response.req.body.teamName) {
          return true;
        } else {
          throw new Error("Team Name is required");
        }
      }
      return true;
    })
    .default(null),

  body("clientGammaId")
    .notEmpty()
    .withMessage("Client Gamma ID is required")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("Client Gamma ID should be integer and greater than zero"),
  body("clientCode").trim().notEmpty().withMessage("client Code is required"),
  body("clientName").trim().notEmpty().withMessage("Client Name is required"),

  body("clientVATStatus")
    .notEmpty()
    .withMessage("Client VAT Status is required")
    .bail()
    .isIn(["YES", "NO"])
    .withMessage("Client VAT Status should be YES/NO"),

  body("clientVATNumber")
    .trim()
    .default(null)
    .custom(async (_, response) => {
      if (response.req.body.clientVATStatus === "YES") {
        if (response.req.body.clientVATNumber) {
          return true;
        } else {
          throw new Error("Client VAT No. is required");
        }
      }
      return true;
    }),

  body("jobOwner")
    .notEmpty()
    .withMessage("Job Owner is required")
    .bail()
    .isObject()
    .withMessage("Job Owner should be object"),
  body("jobOwner.id").trim().notEmpty().withMessage("Job Owner User ID is required"),
  body("jobOwner.userName").trim().notEmpty().withMessage("Job Owner User Name is required"),
  body("jobOwner.userEmail")
    .trim()
    .notEmpty()
    .withMessage("Job Owner User Email is required")
    .bail()
    .isEmail()
    .withMessage("Job Owner User Email is invalid"),
  body("createdBy")
    .notEmpty()
    .withMessage("Created By is required")
    .bail()
    .isObject()
    .withMessage("Created By should be object"),
  body("createdBy.id").trim().notEmpty().withMessage("Created By User ID is required"),
  body("createdBy.userName").trim().notEmpty().withMessage("Created By User Name is required"),
  body("createdBy.userEmail")
    .trim()
    .notEmpty()
    .withMessage("Created By User Email is required")
    .bail()
    .isEmail()
    .withMessage("Created By User Email is invalid"),
];

exports.GammaCheckDuplicateWorksheet = [
  body("worksheetName").trim().notEmpty().withMessage("Worksheet Name is required"),
  body("clientGammaId")
    .notEmpty()
    .withMessage("Client Gamma ID is required")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("Client Gamma ID should be integer and greater than zero"),
  body("departmentId")
    .notEmpty()
    .withMessage("Department ID is required")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("Department ID should be integer and greater than zero"),
  body("teamId")
    .default(null)
    .custom(async (teamId, { req, res }) => {
      if (teamId) {
        if (Number.isInteger(teamId)) {
          return true;
        } else {
          throw new Error("Team ID should be integer and greater than zero");
        }
      }
      if (teamId === 0) {
        throw new Error("Team ID should be integer and greater than zero");
      }
      return true;
    }),
];

exports.GammaGetWorksheetByJobId = [
  param("jobId")
    .trim()
    .isAlphanumeric()
    .withMessage("jobId is invalid")
    .bail()
    .notEmpty()
    .withMessage("jobId is required"),
];

exports.GammaUpdateClientByClientGammaId = [
  param("clientGammaId")
    .notEmpty()
    .withMessage("Client Gamma ID is required")
    .bail()
    .isInt({ gt: 0 })
    .withMessage("Client Gamma ID should be integer and greater than zero"),
  body("clientVATStatus")
    .trim()
    .default(null)
    .custom(async (_, { req }) => {
      if (req.body.clientVATStatus) {
        if (["YES", "NO"].includes(req.body.clientVATStatus)) {
          return true;
        } else {
          throw new Error("Client VAT Status should be YES/NO");
        }
      }
      return true;
    }),
  body("clientVATNumber")
    .trim()
    .default(null)
    .custom(async (_, { req }) => {
      if (req.body.clientVATStatus === "YES") {
        if (req.body.clientVATNumber) {
          return true;
        } else {
          throw new Error("Client VAT No. is required");
        }
      }
      return true;
    }),
];

exports.GetTeams = [
  query("departmentCode")
    .trim()
    .notEmpty()
    .withMessage("departmentCode is required")
    .bail()
    .custom(async (departmentCode) => {
      if (departmentCode === "null" || departmentCode === "undefined") throw new Error("Invalid departmentCode");
      else return true;
    }),
];

exports.CheckDepartmentCode = [
  query("departmentCode")
    .trim()
    .notEmpty()
    .withMessage("departmentCode is required")
    .bail()
    .custom(async (departmentCode) => {
      if (departmentCode === "null" || departmentCode === "undefined") throw new Error("Invalid departmentCode");
      else return true;
    }),
];

exports.GetworksheetValidation = [
  query("clientCode")
    .trim()
    .not()
    .isEmpty()
    .withMessage("clientCode is required")
    .bail()
    .custom(async (clientCode) => {
      const clientPresent = await ClientService.getClientByKey({ clientCode });

      if (!clientPresent) throw new Error("invalid clientCode");

      return true;
    }),
  query("departmentCode")
    .not()
    .isEmpty()
    .withMessage("departmentCode is required")
    .bail()
    .custom(async (departmentCode) => {
      if (departmentCode === "null" || departmentCode === "undefined") throw new Error("Invalid departmentCode");
      else return true;
    }),
  query("status")
    .not()
    .isEmpty()
    .withMessage("status is required")
    .bail()
    .custom(async (status) => {
      if (status === "null" || status === "undefined") throw new Error("Invalid status");
      else return true;
    }),
  query("teamCode").trim().optional(),
  query("page").trim().optional(),
  query("limit").trim().optional(),
  query("search").trim().optional(),
];

exports.GetWorksheetByWorksheetCode = [
  query("worksheetCode")
    .trim()
    .notEmpty()
    .withMessage("worksheetCode is required")
    .bail()
    .custom(async (worksheetCode) => {
      if (worksheetCode === "null" || worksheetCode === "undefined") throw new Error("Invalid worksheetCode");
      else return true;
    }),
];
