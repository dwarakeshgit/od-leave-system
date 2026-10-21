const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

// Everything in the database is stored at 00:00 UTC for a given calendar day.
function normalizeDate(value) {
  return dayjs.utc(dayjs(value).format('YYYY-MM-DD')).toDate();
}

function eachDay(from, to) {
  const days = [];
  let cursor = dayjs.utc(dayjs(from).format('YYYY-MM-DD'));
  const end = dayjs.utc(dayjs(to).format('YYYY-MM-DD'));
  while (cursor.isBefore(end) || cursor.isSame(end)) {
    days.push(cursor.toDate());
    cursor = cursor.add(1, 'day');
  }
  return days;
}

function isSunday(date) {
  return dayjs.utc(date).day() === 0;
}

function formatDate(date) {
  return dayjs.utc(date).format('DD MMM YYYY');
}

module.exports = { dayjs, normalizeDate, eachDay, isSunday, formatDate };
