'use strict';

const { google } = require('googleapis');

const PRIORITY_MAP = {
  urgent: { colorId: '11', label: '🔴 فوری',    order: 1 },
  high:   { colorId: '6',  label: '🟠 مهم',     order: 2 },
  medium: { colorId: '5',  label: '🟡 متوسط',   order: 3 },
  normal: { colorId: null, label: '⚪️ عادی',   order: 4 },
};

const COLOR_TO_PRIORITY = {
  '11': PRIORITY_MAP.urgent,
  '6':  PRIORITY_MAP.high,
  '5':  PRIORITY_MAP.medium,
};

function getClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:4242',
  );
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return client;
}

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getClient() });
}

function addOneHour(time) {
  const [h, m] = time.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTime(start) {
  if (start.date) return 'تمام روز';
  return new Date(start.dateTime).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

async function listTasks({ days = 7 } = {}) {
  const calendar = getCalendar();
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + days);

  const { data } = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 30,
  });

  const events = data.items || [];
  if (!events.length) return `📅 ${days === 1 ? 'امروز' : days + ' روز آینده'} هیچ تسکی نداری.`;

  const sorted = [...events].sort((a, b) => {
    const pa = (COLOR_TO_PRIORITY[a.colorId] || PRIORITY_MAP.normal).order;
    const pb = (COLOR_TO_PRIORITY[b.colorId] || PRIORITY_MAP.normal).order;
    return pa - pb;
  });

  const title = `📅 <b>تسک‌ها (${events.length}):</b>`;
  return title + '\n\n' + sorted.map((e, i) => {
    const priority = (COLOR_TO_PRIORITY[e.colorId] || PRIORITY_MAP.normal).label;
    const time = formatTime(e.start);
    const name = e.summary || '(بدون عنوان)';
    const shortId = e.id.split('_')[0];
    const desc = e.description ? `\n   📝 ${e.description}` : '';
    return `${i + 1}. ${priority} <b>${name}</b>\n   🕐 ${time}   <code>${shortId}</code>${desc}`;
  }).join('\n\n');
}

async function addTask({ summary, description, priority = 'normal', date, startTime, endTime }) {
  const calendar = getCalendar();
  const pData = PRIORITY_MAP[priority] || PRIORITY_MAP.normal;

  let start, end;
  if (startTime) {
    const resolvedEnd = endTime || addOneHour(startTime);
    start = { dateTime: `${date}T${startTime}:00`, timeZone: 'Asia/Tehran' };
    end   = { dateTime: `${date}T${resolvedEnd}:00`, timeZone: 'Asia/Tehran' };
  } else {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    start = { date };
    end   = { date: nextDay.toISOString().split('T')[0] };
  }

  const body = {
    summary,
    description: description || undefined,
    start,
    end,
    ...(pData.colorId ? { colorId: pData.colorId } : {}),
  };

  const { data } = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    requestBody: body,
  });

  return `✅ تسک اضافه شد:\n\n${pData.label} <b>${summary}</b>\n🕐 ${formatTime(data.start)}`;
}

async function completeTask({ eventId }) {
  const calendar = getCalendar();
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId,
  });
  return `✅ تسک تکمیل و حذف شد.`;
}

async function deleteTask({ eventId }) {
  const calendar = getCalendar();
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId,
  });
  return `🗑 تسک حذف شد.`;
}

async function editTask({ eventId, summary, description, priority, date, startTime, endTime }) {
  const calendar = getCalendar();
  const patch = {};

  if (summary)     patch.summary     = summary;
  if (description) patch.description = description;
  if (priority && PRIORITY_MAP[priority]?.colorId) patch.colorId = PRIORITY_MAP[priority].colorId;

  if (date && startTime && endTime) {
    patch.start = { dateTime: `${date}T${startTime}:00`, timeZone: 'Asia/Tehran' };
    patch.end   = { dateTime: `${date}T${endTime}:00`,   timeZone: 'Asia/Tehran' };
  } else if (date) {
    patch.start = { date };
    patch.end   = { date };
  }

  await calendar.events.patch({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId,
    requestBody: patch,
  });

  return `✏️ تسک آپدیت شد.`;
}

async function deleteTasksByRange({ days = 1 } = {}) {
  const calendar = getCalendar();
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + days);

  const { data } = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    maxResults: 50,
  });

  const events = data.items || [];
  if (!events.length) return `📅 تسکی برای حذف پیدا نشد.`;

  await Promise.all(events.map(e =>
    calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: e.id,
    })
  ));

  return `🗑 ${events.length} تسک حذف شد.`;
}

module.exports = { listTasks, addTask, completeTask, deleteTask, editTask, deleteTasksByRange };
