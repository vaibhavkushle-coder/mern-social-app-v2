const Notification = require("../models/Notification");

async function getNotifications(req, res) {
  try {
    const notifications = await Notification.find({
      toUser: req.user._id,
    })
      .populate("fromUser", "name profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json({
      notifications,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function markAllAsRead(req, res) {
  try {
    await Notification.updateMany(
      {
        toUser: req.user._id,
        isRead: false,
      },
      {
        isRead: true,
      },
    );

    res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

async function deleteSelectedNotifications(req, res) {
  try {
    await Notification.deleteMany({
      _id: { $in: req.body.notificationIds },
      toUser: req.user._id,
    });

    res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
}

module.exports = {
  getNotifications,
  markAllAsRead,

  deleteSelectedNotifications,
};
