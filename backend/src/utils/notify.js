const Notification = require('../models/Notification');

async function notify(userId, title, body = '', link = '') {
  if (!userId) return null;
  return Notification.create({ user: userId, title, body, link });
}

module.exports = { notify };
