const express = require("express");
const { auth } = require("../../../middleware/checkAuth");
const router = express.Router();
const NotificationController = require("../../controllers/notification.controller");

router.get("/list", auth, NotificationController.getNotificationsofIsRead);
router.get("/alert", auth, NotificationController.getNotificationsofIsSent);
router.get("/count", auth, NotificationController.getNotificationsCount);
// router.post("/read", auth, NotificationController.updateNotification);
module.exports = router;
