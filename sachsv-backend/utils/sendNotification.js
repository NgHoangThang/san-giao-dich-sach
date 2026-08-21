const Notification = require("../models/Notification");

const sendNotification = async ({
  io,
  receiverId,
  senderId,
  type,
  title,
  message,
  relatedId,
}) => {
  try {
    const notification = await Notification.create({
      receiverId,
      senderId,
      type,
      title,
      message,
      relatedId,
    });

    if (io) {
      io.to(receiverId.toString()).emit("new_notification", notification);
    }

    return notification;
  } catch (error) {
    console.error(`[Notification Error] ${error.message}`);
  }
};

module.exports = sendNotification;
