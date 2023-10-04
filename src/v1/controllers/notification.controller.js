const NotificationService = require("../services/notification.service");
const { RESPONSE, RESPONSE_ERROR } = require("../../../utils/responseHelper");

module.exports = class NotificationController {
  static async getNotificationsofIsRead(req, res) {
    try {
      const userCode = req.payload.userCode;
      const page = req.query.page; //? req.query.page : 1;
      const limit = req.query.limit; //? req.query.limit : 20;
      let data = await NotificationService.getNotificationsList(userCode, page, limit);
      return RESPONSE({ res, result: data, message: "Notifications fetched successfully" });
    } catch (error) {
      console.log("At NotificationController.getNotificationsofIsRead........", error);
      return RESPONSE_ERROR({ res });
    }
  }
  static async getNotificationsofIsSent(req, res) {
    try {
      const userCode = req.payload.userCode;
      let data = await NotificationService.getNotificationsAlert(userCode);
      return RESPONSE({ res, result: data, message: "Notifications fetched successfully" });
    } catch (error) {
      console.log("At NotificationController.getNotificationsofIsSent........", error);
      return RESPONSE_ERROR({ res });
    }
  }
  static async getNotificationsCount(req, res) {
    try {
      const userCode = req.payload.userCode;
      let data = await NotificationService.getNotificationsCount(userCode);
      return RESPONSE({ res, result: data, message: "Notifications count fetched successfully" });
    } catch (error) {
      console.log("At NotificationController.getNotificationsCount........", error);
      return RESPONSE_ERROR({ res });
    }
  }
  // static async updateNotification(req, res) {
  //   try {
  //     const { userNotificationCode } = req.body;
  //     const userCode = req.payload.userCode;

  //     let data = await NotificationService.updateNotification(userCode, userNotificationCode);
  //     return OK(res, data, "Department data fetched successfully");
  //   } catch (error) {
  //     return ERROR(res, { error }, error.message || "Something went Wrong");
  //   }
  // }
};
