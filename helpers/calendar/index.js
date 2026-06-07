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

function toTehranDateLabel(dateStr, dateTimeStr) {
  const d = dateStr ? new Date(dateStr) : new Date(dateTimeStr);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' }); // YYYY-MM-DD
}

function friendlyDate(isoDate) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
  if (isoDate === today) return '📅 Today';
  if (isoDate === tomorrow) return '📅 Tomorrow';
  return `📅 ${new Date(isoDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
}

async function listTasks({ days = 7 } = {}) {
  const calendar = getCalendar();
  const now = new Date();

  // fetch overdue (past 7 days) + upcoming
  const pastStart = new Date(now);
  pastStart.setDate(pastStart.getDate() - 7);
  const end = new Date(now);
  end.setDate(end.getDate() + days);

  const { data } = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timeMin: pastStart.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  });

  const events = data.items || [];
  if (!events.length) return `📅 No tasks for ${days === 1 ? 'today' : `the next ${days} days`}.`;

  const nowStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });

  // separate overdue vs upcoming
  const overdue = [];
  const upcoming = [];
  for (const e of events) {
    const dateLabel = toTehranDateLabel(e.start?.date, e.start?.dateTime);
    if (dateLabel < nowStr) overdue.push(e);
    else upcoming.push(e);
  }

  // group upcoming by date
  const byDate = {};
  for (const e of upcoming) {
    const dateLabel = toTehranDateLabel(e.start?.date, e.start?.dateTime);
    if (!byDate[dateLabel]) byDate[dateLabel] = [];
    byDate[dateLabel].push(e);
  }

  const lines = [];
  let idx = 1;

  if (overdue.length) {
    lines.push(`⚠️ <b>Overdue (${overdue.length}):</b>`);
    for (const e of overdue) {
      const priority = (COLOR_TO_PRIORITY[e.colorId] || PRIORITY_MAP.normal).label;
      const name = e.summary || '(no title)';
      const shortId = e.id.split('_')[0];
      lines.push(`${idx++}. ${priority} <b>${name}</b>   <code>${shortId}</code>`);
    }
    lines.push('');
  }

  for (const dateKey of Object.keys(byDate).sort()) {
    lines.push(`${friendlyDate(dateKey)}:`);
    const dayEvents = byDate[dateKey].sort((a, b) => {
      const pa = (COLOR_TO_PRIORITY[a.colorId] || PRIORITY_MAP.normal).order;
      const pb = (COLOR_TO_PRIORITY[b.colorId] || PRIORITY_MAP.normal).order;
      return pa - pb;
    });
    for (const e of dayEvents) {
      const priority = (COLOR_TO_PRIORITY[e.colorId] || PRIORITY_MAP.normal).label;
      const time = formatTime(e.start);
      const name = e.summary || '(no title)';
      const shortId = e.id.split('_')[0];
      const desc = e.description ? `\n   📝 ${e.description}` : '';
      lines.push(`${idx++}. ${priority} <b>${name}</b>\n   🕐 ${time}   <code>${shortId}</code>${desc}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
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

  return `✅ Task added:\n\n${pData.label} <b>${summary}</b>\n🕐 ${formatTime(data.start)}`;
}

async function completeTask({ eventId }) {
  const calendar = getCalendar();
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId,
  });
  return `✅ Task completed and removed.`;
}

async function deleteTask({ eventId }) {
  const calendar = getCalendar();
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId,
  });
  return `🗑 Task deleted.`;
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

  return `✏️ Task updated.`;
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
  if (!events.length) return `📅 No tasks found to delete.`;

  await Promise.all(events.map(e =>
    calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: e.id,
    })
  ));

  return `🗑 ${events.length} task(s) deleted.`;
}

module.exports = { listTasks, addTask, completeTask, deleteTask, editTask, deleteTasksByRange };
