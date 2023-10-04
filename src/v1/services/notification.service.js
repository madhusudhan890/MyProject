const { db } = require("../../NOSQL/database/connection");

module.exports = class NotificationService {
  static async createNotification(body) {
    return db.Notification.create({ ...body });
  }

  static async getNotificationsList(userCode, page, limit) {
    const body = [
      {
        $match: {
          userCode: userCode,
          isActive: true,
        },
      },
      {
        $lookup: {
          from: "notifications",
          let: {
            notificationCode: "$notificationCode",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$notificationCode", "$$notificationCode"] }, { $eq: ["$isActive", "$$isActive"] }],
                },
              },
            },
            {
              $lookup: {
                from: "departments",
                let: { departmentCode: "$departmentCode", isActive: true, usersIn: userCode },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$departmentCode", "$$departmentCode"] }, { $eq: ["$isActive", "$$isActive"] }],
                      },
                    },
                  },
                  {
                    $match: {
                      usersIn: userCode,
                    },
                  },
                ],
                as: "department",
              },
            },
            {
              $unwind: {
                path: "$department",
              },
            },
            {
              $lookup: {
                from: "worksheets",
                let: { worksheetCode: "$worksheetCode", isActive: true },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$worksheetCode", "$$worksheetCode"] }, { $eq: ["$isActive", "$$isActive"] }],
                      },
                    },
                  },
                ],
                as: "worksheets",
              },
            },
            {
              $unwind: {
                path: "$worksheets",
              },
            },
            {
              $project: {
                worksheetCode: 1,
                type: "$type",
                worksheetType: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$worksheets.type", "BANK"] },
                        then: "bank-document",
                      },
                      {
                        case: { $eq: ["$worksheets.type", "ONLY_CASHBOOK"] },
                        then: "cashbook-document",
                      },
                      {
                        case: { $eq: ["$worksheets.type", "ONLY_INVOICE"] },
                        then: "invoice-document",
                      },
                      {
                        case: { $eq: ["$worksheets.type", "VAT_RETURNS"] },
                        then: "vat-document",
                      },
                    ],
                    default: "bank-document",
                  },
                },
              },
            },
          ],
          as: "notifications",
        },
      },
      {
        $unwind: {
          path: "$notifications",
        },
      },
      {
        $project: {
          _id: 0,
          userNotificationCode: 1,
          isRead: 1,
          message: 1,
          sortDate: "$createdAt",
          createdAt: {
            $dateToString: {
              date: "$createdAt",
              format: "%d-%m-%Y %H:%M",
              timezone: "Europe/London",
            },
          },
          worksheetCode: "$notifications.worksheetCode",
          departmentCode: null,
          teamCode: null,
          clientCode: null,
          type: "$notifications.type",
          worksheetType: "$notifications.worksheetType",
        },
      },
      {
        $unionWith: {
          coll: "clientusernotifications",
          pipeline: [
            {
              $match: {
                userCode: userCode,
                isActive: true,
              },
            },
            {
              $lookup: {
                from: "clientnotifications",
                let: { clientNotificationCode: "$clientNotificationCode", isActive: true },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$clientNotificationCode", "$$clientNotificationCode"] },
                          { $eq: ["$isActive", "$$isActive"] },
                        ],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: "departments",
                      let: { departmentCode: "$departmentCode", isActive: true, usersIn: userCode },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [
                                { $eq: ["$departmentCode", "$$departmentCode"] },
                                { $eq: ["$isActive", "$$isActive"] },
                              ],
                            },
                          },
                        },
                        {
                          $match: {
                            usersIn: userCode,
                          },
                        },
                      ],
                      as: "department",
                    },
                  },
                  {
                    $unwind: {
                      path: "$department",
                    },
                  },
                  {
                    $project: { _id: 0, __v: 0, updatedAt: 0, createdAt: 0 },
                  },
                ],
                as: "clientNotifications",
              },
            },
            {
              $unwind: {
                path: "$clientNotifications",
              },
            },
            {
              $project: {
                _id: 0,
                userNotificationCode: "$clientUserNotificationCode",
                isRead: 1,
                message: 1,
                sortDate: "$createdAt",
                createdAt: {
                  $dateToString: {
                    date: "$createdAt",
                    format: "%d-%m-%Y %H:%M",
                    timezone: "Europe/London",
                  },
                },
                worksheetCode: null,
                departmentCode: "$clientNotifications.departmentCode",
                teamCode: "$clientNotifications.teamCode",
                clientCode: "$clientNotifications.clientCode",
                type: "$clientNotifications.type",
                worksheetType: null,
              },
            },
          ],
        },
      },
      {
        $sort: {
          sortDate: -1,
        },
      },
      {
        $group: {
          _id: null,
          data: { $push: "$$ROOT" },
          totalCount: { $sum: 1 },
        },
      },
      {
        $unwind: {
          path: "$data",
        },
      }, //here page and limitation is being performed.
      {
        $project: {
          "data.sortDate": 0,
        },
      },
      {
        $group: {
          _id: null,
          totalCount: { $first: "$totalCount" },
          notifications: { $push: "$data" },
        },
      },
      {
        $project: {
          _id: 0,
          totalCount: 1,
          notifications: 1,
        },
      },
    ];
    // const pagination = page && limit ? [{ $skip: (page - 1) * limit }, { $limit: limit * 1 }] : [];
    let limitAndPage = [
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit * 1,
      },
    ];
    if (page && limit) body.splice(8, 0, ...limitAndPage);
    const data = await db.UserNotification.aggregate(body);
    // const userCount = await db.UserNotification.count({ userCode: userCode, isActive: true });
    // const clientCount = await db.ClientUserNotification.count({ userCode: userCode, isActive: true });
    return {
      totalCount: data.length ? data[0].totalCount : 0,
      count: data.length ? data[0].notifications.length : 0,
      rows: data.length ? data[0].notifications : [],
    };
  }

  static async getNotificationsAlert(userCode) {
    const body = [
      {
        $match: {
          userCode: userCode,
          isActive: true,
          isSent: false,
        },
      },
      {
        $lookup: {
          from: "notifications",
          let: {
            notificationCode: "$notificationCode",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$notificationCode", "$$notificationCode"] }, { $eq: ["$isActive", "$$isActive"] }],
                },
              },
            },
            {
              $lookup: {
                from: "departments",
                let: { departmentCode: "$departmentCode", isActive: true, usersIn: userCode },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$departmentCode", "$$departmentCode"] }, { $eq: ["$isActive", "$$isActive"] }],
                      },
                    },
                  },
                  {
                    $match: {
                      usersIn: userCode,
                    },
                  },
                ],
                as: "department",
              },
            },
            {
              $unwind: {
                path: "$department",
              },
            },
            {
              $lookup: {
                from: "worksheets",
                let: { worksheetCode: "$worksheetCode", isActive: true },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$worksheetCode", "$$worksheetCode"] }, { $eq: ["$isActive", "$$isActive"] }],
                      },
                    },
                  },
                ],
                as: "worksheets",
              },
            },
            {
              $unwind: {
                path: "$worksheets",
              },
            },
            {
              $project: {
                worksheetCode: 1,
                type: "$type",
                departmentCode: 1,
                worksheetType: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$worksheets.type", "BANK"] },
                        then: "bank-document",
                      },
                      {
                        case: { $eq: ["$worksheets.type", "ONLY_CASHBOOK"] },
                        then: "cashbook-document",
                      },
                      {
                        case: { $eq: ["$worksheets.type", "ONLY_INVOICE"] },
                        then: "invoice-document",
                      },
                      {
                        case: { $eq: ["$worksheets.type", "VAT_RETURNS"] },
                        then: "vat-document",
                      },
                    ],
                    default: "bank-document",
                  },
                },
              },
            },
          ],
          as: "notifications",
        },
      },
      {
        $unwind: {
          path: "$notifications",
        },
      },
      {
        $project: {
          _id: 0,
          userNotificationCode: 1,
          isSent: 1,
          createdAt: {
            $dateToString: {
              date: "$createdAt",
              format: "%d-%m-%Y %H:%M",
              timezone: "Europe/London",
            },
          },
          worksheetCode: "$notifications.worksheetCode",
          departmentCode: null,
          teamCode: null,
          clientCode: null,
          type: "$notifications.type",
          worksheetType: "$notifications.worksheetType",
        },
      },
      {
        $unionWith: {
          coll: "clientusernotifications",
          pipeline: [
            {
              $match: {
                userCode: userCode,
                isActive: true,
                isSent: false,
              },
            },
            {
              $lookup: {
                from: "clientnotifications",
                let: { clientNotificationCode: "$clientNotificationCode", isActive: true },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$clientNotificationCode", "$$clientNotificationCode"] },
                          { $eq: ["$isActive", "$$isActive"] },
                        ],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: "departments",
                      let: { departmentCode: "$departmentCode", isActive: true, usersIn: userCode },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [
                                { $eq: ["$departmentCode", "$$departmentCode"] },
                                { $eq: ["$isActive", "$$isActive"] },
                              ],
                            },
                          },
                        },
                        {
                          $match: {
                            usersIn: userCode,
                          },
                        },
                      ],
                      as: "department",
                    },
                  },
                  {
                    $unwind: {
                      path: "$department",
                    },
                  },
                  {
                    $project: { _id: 0, __v: 0, updatedAt: 0, createdAt: 0 },
                  },
                ],
                as: "clientNotifications",
              },
            },
            {
              $unwind: {
                path: "$clientNotifications",
                // preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 0,
                userNotificationCode: "$clientUserNotificationCode",
                isSent: 1,
                // message: 1,
                createdAt: {
                  $dateToString: {
                    date: "$createdAt",
                    format: "%d-%m-%Y %H:%M",
                    timezone: "Europe/London",
                  },
                },
                worksheetCode: null,
                departmentCode: "$clientNotifications.departmentCode",
                teamCode: "$clientNotifications.teamCode",
                clientCode: "$clientNotifications.clientCode",
                type: "$clientNotifications.type",
                worksheetType: null,
              },
            },
          ],
        },
      },
    ];
    const data = await db.UserNotification.aggregate(body);
    if (data && data.length > 0) {
      let codes = data.map((data) => data.userNotificationCode);
      let updateNotification = await db.UserNotification.updateMany(
        {
          userCode: userCode,
          userNotificationCode: {
            $in: codes,
          },
        },
        {
          isSent: true,
        }
      );
      let updateClientNotification = await db.ClientUserNotification.updateMany(
        {
          userCode: userCode,
          clientUserNotificationCode: {
            $in: codes,
          },
        },
        {
          isSent: true,
        }
      );
    }
    return {
      count: data ? data.length : 0,
      rows: data,
    };
  }

  static async getNotificationsCount(userCode) {
    // const userCount = await db.UserNotification.count({ userCode: userCode, isActive: true, isRead: false });
    // const clientCount = await db.ClientUserNotification.count({ userCode: userCode, isActive: true, isRead: false });
    const data = await db.UserNotification.aggregate([
      {
        $match: {
          userCode: userCode,
          isActive: true,
          isRead: false,
        },
      },
      {
        $lookup: {
          from: "notifications",
          let: {
            notificationCode: "$notificationCode",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$notificationCode", "$$notificationCode"] }, { $eq: ["$isActive", "$$isActive"] }],
                },
              },
            },
            {
              $lookup: {
                from: "departments",
                let: { departmentCode: "$departmentCode", isActive: true, usersIn: userCode },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$departmentCode", "$$departmentCode"] }, { $eq: ["$isActive", "$$isActive"] }],
                      },
                    },
                  },
                  {
                    $match: {
                      usersIn: userCode,
                    },
                  },
                ],
                as: "department",
              },
            },
            {
              $unwind: {
                path: "$department",
              },
            },
            {
              $lookup: {
                from: "worksheets",
                let: { worksheetCode: "$worksheetCode", isActive: true },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$worksheetCode", "$$worksheetCode"] }, { $eq: ["$isActive", "$$isActive"] }],
                      },
                    },
                  },
                ],
                as: "worksheets",
              },
            },
            {
              $unwind: {
                path: "$worksheets",
              },
            },
          ],
          as: "notifications",
        },
      },
      {
        $unwind: {
          path: "$notifications",
        },
      },
      {
        $count: "count",
      },
      {
        $unwind: {
          path: "$count",
        },
      },
      {
        $unionWith: {
          coll: "clientusernotifications",
          pipeline: [
            {
              $match: {
                userCode: userCode,
                isActive: true,
                isRead: false,
              },
            },
            {
              $lookup: {
                from: "clientnotifications",
                let: { clientNotificationCode: "$clientNotificationCode", isActive: true },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$clientNotificationCode", "$$clientNotificationCode"] },
                          { $eq: ["$isActive", "$$isActive"] },
                        ],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: "departments",
                      let: { departmentCode: "$departmentCode", isActive: true, usersIn: userCode },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [
                                { $eq: ["$departmentCode", "$$departmentCode"] },
                                { $eq: ["$isActive", "$$isActive"] },
                              ],
                            },
                          },
                        },
                        {
                          $match: {
                            usersIn: userCode,
                          },
                        },
                      ],
                      as: "department",
                    },
                  },
                  {
                    $unwind: {
                      path: "$department",
                    },
                  },
                  {
                    $project: { _id: 0 },
                  },
                ],
                as: "clientNotifications",
              },
            },
            {
              $unwind: {
                path: "$clientNotifications",
              },
            },
            {
              $count: "clientCount",
            },
          ],
        },
      },
      {
        $group: {
          _id: 0,
          object: {
            $push: "$$ROOT",
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: "$object",
          },
        },
      },
      {
        $project: {
          count: {
            $sum: ["$count", "$clientCount"],
          },
        },
      },
    ]);
    return {
      totalCount: data.length ? data[0].count : 0,
    };
  }

  static async getNotificationByKey(body) {
    return db.Notification.findOne({ ...body });
  }

  static async getAllNotifications(filter, option) {
    return db.Notification.find({ ...filter }, { ...option });
  }

  static async updateUserNotification(filter, body) {
    return db.UserNotification.updateMany({ ...filter }, { ...body });
  }

  static async insertManyUserNotification(body) {
    return db.UserNotification.insertMany(body);
  }
};
