const express = require("express");

const router = express.Router();

const apiUser = require("./api/user.api");
const apiClient = require("./api/client.api");
const apiCategory = require("./api/category.api");
const apiCustomType = require("./api/customType.api");
const apiWorksheet = require("./api/worksheet.api");
const apiDocument = require("./api/document.api");
const apiStatement = require("./api/statement.api");
const apiCashbook = require("./api/cashbook.api");
const apiInvoice = require("./api/invoice.api");
const apiAutoMapping = require("./api/auto-mapping.api");
const apiDepartment = require("./api/department.api");
const apiTeam = require("./api/department-teams.api");
const notification = require("./api/notification.api");
const alphaGammaMapping = require("./api/alpha-gamma-mapping.api");

const apiGamma = require("./api/gamma.api");

router.use("/user", apiUser);
router.use("/client", apiClient);
router.use("/category", apiCategory);
router.use("/custom-type", apiCustomType);
router.use("/worksheet", apiWorksheet);
router.use("/document", apiDocument);
router.use("/statement", apiStatement);
router.use("/cashbook", apiCashbook);
router.use("/invoice", apiInvoice);
router.use("/auto-mapping", apiAutoMapping);
router.use("/department", apiDepartment);
router.use("/department/team", apiTeam);
router.use("/gamma", apiGamma);
router.use("/notification", notification);
router.use("/alpha-gamma-mapping", alphaGammaMapping);
module.exports = router;
