const Notification = require("../models/Notification");

async function getNotifications(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const cursor = req.query.cursor;
    const notifications = await Notification.find({
      toUser: req.user._id,
      ...(cursor ? { createdAt: { $lt: new Date(cursor) } } : {}),
    })
      .populate("fromUser", "name profilePic")
      .sort({ createdAt: -1 })
      .limit(limit + 1);
    const hasMore = notifications.length > limit;
    const page = hasMore ? notifications.slice(0, limit) : notifications;
    const unreadCount = await Notification.countDocuments({
      toUser: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      notifications: page,
      unreadCount,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
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
