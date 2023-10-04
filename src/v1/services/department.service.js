const { db } = require("../../NOSQL/database/connection");
module.exports = class DepartmentService {
  static async getDepartment(userAssigned, userRole, page, limit, search, sort) {
    if (search) search = search.replace(/[\\]/g, "");

    const body = [
      {
        $match: {
          isActive: true,
          // ...(["ROLE_USER", "ROLE_TRAINING", "ROLE_DEPT_ADMIN"].includes(userRole) ? { usersIn: userAssigned } : null),
          usersIn: userAssigned,
          ...(search && {
            departmentName: {
              $regex: new RegExp(search, "i"),
            },
          }),
        },
      },
      {
        $sort: {
          departmentName: 1,
        },
      },
    ];

    const remainigBody = [
      {
        $lookup: {
          from: "notifications",
          let: {
            departmentCode: "$departmentCode",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                  ],
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            worksheetCode: "$notifications.worksheetCode",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$worksheetCode", "$$worksheetCode"],
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
          ],
          as: "worksheet",
        },
      },
      {
        $unwind: {
          path: "$worksheet",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "usernotifications",
          let: {
            notificationCode: "$notifications.notificationCode",
            isRead: false,
            userCode: userAssigned,
            userCodeWorksheet: "$worksheet.userAssigned",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$notificationCode", "$$notificationCode"],
                    },
                    {
                      $eq: ["$isRead", "$$isRead"],
                    },
                    { $eq: ["$userCode", "$$userCode"] },
                    { $eq: ["$userCode", "$$userCodeWorksheet"] },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "userNotifications",
        },
      },
      {
        $unwind: {
          path: "$userNotifications",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          departmentCode: { $first: "$departmentCode" },
          departmentName: { $first: "$departmentName" },
          teamsAvailable: { $first: "$teamsAvailable" },
          newlyAssigned: {
            $sum: { $ifNull: ["$userNotifications.count", 0] },
          },
        },
      },
      {
        $lookup: {
          from: "teams",
          let: {
            departmentCode: "$departmentCode",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
          ],
          as: "teamsObject",
        },
      },
      {
        $unwind: {
          path: "$teamsObject",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          departmentCode: 1,
          departmentName: 1,
          teamsAvailable: 1,
          newlyAssigned: 1,
          teamCode: "$teamsObject.teamCode",
        },
      },
      {
        $group: {
          _id: "$_id",
          departmentCode: { $first: "$departmentCode" },
          departmentName: { $first: "$departmentName" },
          teamsAvailable: { $first: "$teamsAvailable" },
          newlyAssigned: { $first: "$newlyAssigned" },
          teams: { $push: "$teamCode" },
        },
      },
      {
        $lookup: {
          from: "clients",
          let: { departmentCode: "$departmentCode", teamCode: "$teams" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentCode", "$$departmentCode"],
                    },
                    {
                      $cond: {
                        if: { $eq: ["$$teamCode", []] },
                        then: {
                          $eq: ["$teamCode", null],
                        },
                        else: {
                          $in: ["$teamCode", "$$teamCode"],
                        },
                      },
                    },
                  ],
                },
              },
            },
            { $project: { clientCode: 1 } },
          ],
          as: "clientsObject",
        },
      },
      {
        $unwind: {
          path: "$clientsObject",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          departmentCode: 1,
          departmentName: 1,
          teamsAvailable: 1,
          newlyAssigned: 1,
          clientCode: "$clientsObject.clientCode",
        },
      },
      {
        $group: {
          _id: "$_id",
          departmentCode: { $first: "$departmentCode" },
          departmentName: { $first: "$departmentName" },
          teamsAvailable: { $first: "$teamsAvailable" },
          newlyAssigned: { $first: "$newlyAssigned" },
          clients: { $push: "$clientCode" },
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            status: "IN_PROGRESS",
            userAssigned: userAssigned,
            clientCode: "$clients",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$status", "$$status"],
                    },
                    {
                      $in: ["$clientCode", "$$clientCode"],
                    },
                    {
                      ...(["ROLE_TRAINING"].includes(userRole)
                        ? {
                            $eq: ["$userAssigned", "$$userAssigned"],
                          }
                        : null),
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "inProgressworksheetCount",
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            status: "COMPLETED",
            userAssigned: userAssigned,
            clientCode: "$clients",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$status", "$$status"],
                    },
                    {
                      $in: ["$clientCode", "$$clientCode"],
                    },
                    {
                      ...(["ROLE_TRAINING"].includes(userRole)
                        ? {
                            $eq: ["$userAssigned", "$$userAssigned"],
                          }
                        : null),
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "completedworksheetCount",
        },
      },
      {
        $lookup: {
          from: "worksheets",
          let: {
            userAssigned: userAssigned,
            clientCode: "$clients",
            isActive: true,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $in: ["$clientCode", "$$clientCode"],
                    },
                    {
                      ...(["ROLE_TRAINING"].includes(userRole)
                        ? {
                            $eq: ["$userAssigned", "$$userAssigned"],
                          }
                        : null),
                    },
                    {
                      $eq: ["$isActive", "$$isActive"],
                    },
                  ],
                },
              },
            },
            {
              $count: "count",
            },
          ],
          as: "totalworksheetCount",
        },
      },
      {
        $unwind: {
          path: "$totalworksheetCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$inProgressworksheetCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$completedworksheetCount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          departmentCode: { $first: "$departmentCode" },
          departmentName: { $first: "$departmentName" },
          teamsAvailable: { $first: "$teamsAvailable" },
          worksheetCompleted: { $sum: "$completedworksheetCount.count" },
          worksheetInprogress: { $sum: "$inProgressworksheetCount.count" },
          totalWorksheets: { $sum: "$totalworksheetCount.count" },
          newlyAssigned: { $first: "$newlyAssigned" },
        },
      },
      {
        $project: {
          _id: 0,
          departmentCode: 1,
          departmentName: 1,
          teamsAvailable: 1,
          worksheetCompleted: 1,
          worksheetInprogress: 1,
          totalWorksheets: 1,
          newlyAssigned: 1,
        },
      },
      // {
      //   ...(sort && {
      //     $sort: { ...sort },
      //   }),
      // },
      {
        $sort: {
          departmentName: 1,
        },
      },
    ];
    const pagination = page && limit ? [{ $skip: (page - 1) * limit }, { $limit: limit * 1 }] : [];
    const bodyFinal = body.concat(pagination);
    const data = await db.Department.aggregate(bodyFinal.concat(remainigBody)).collation({ locale: "en" });

    // -----------------------------for departmentCount--------------------------------------//

    let totalCount = await db.Department.aggregate([
      {
        $match: {
          isActive: true,
          // ...(["ROLE_USER", "ROLE_TRAINING", "ROLE_DEPT_ADMIN"].includes(userRole) ? { usersIn: userAssigned } : null),
          usersIn: userAssigned,
          ...(search && {
            departmentName: {
              $regex: new RegExp(search, "i"),
            },
          }),
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
        $project: {
          _id: 0,
          totalCount: {
            $ifNull: ["$count", 0],
          },
        },
      },
    ]);
    return {
      totalCount: totalCount.length ? totalCount[0].totalCount : 0,
      count: data.length,
      rows: data,
    };
  }

  static async getDepartmentByKey(filter, option) {
    return db.Department.findOne({ ...filter, isActive: true }, { ...option });
  }

  static async find(filter) {
    return db.Department.find({ ...filter });
  }

  static async updateMany(filter, body) {
    return db.Department.updateMany({ ...filter }, { ...body });
  }
  static async bulkWrite(body) {
    return db.Department.bulkWrite(body);
  }

  static async createDepartment(filter, body, option) {
    return db.Department.findOneAndUpdate({ ...filter }, { ...body }, { ...option });
  }
};
