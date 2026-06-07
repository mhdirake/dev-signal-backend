'use strict';

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { sendMessageToUser } = require('@helpers/telegram');
const { Post, RawItem } = require('@models');
const { Op } = require('sequelize');
const { listTasks, addTask, completeTask, deleteTask, editTask, deleteTasksByRange } = require('@helpers/calendar');

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const ADMIN_ID = () => process.env.ADMIN_TELEGRAM_USER_ID;
const DATA_DIR = path.join(__dirname, '../../data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

const HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
const MAX_HISTORY = 20;

function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(-MAX_HISTORY), null, 2));
}

const chatHistory = loadHistory();

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Tool implementations ---
const toolHandlers = {
  save_note({ text }) {
    const notes = readJSON(NOTES_FILE);
    notes.unshift({ id: Date.now(), text, createdAt: new Date().toISOString() });
    writeJSON(NOTES_FILE, notes);
    return `📝 یادداشت ذخیره شد:\n\n<i>${text}</i>`;
  },

  get_notes() {
    const notes = readJSON(NOTES_FILE).slice(0, 10);
    if (!notes.length) return '📋 هیچ یادداشتی نداری.';
    return '📋 <b>یادداشت‌ها:</b>\n\n' + notes.map((n, i) => {
      const date = new Date(n.createdAt).toLocaleDateString('fa-IR');
      return `${i + 1}. ${n.text}\n   <i>${date}</i>`;
    }).join('\n\n');
  },

  async add_task({ summary, description, priority, date, startTime, endTime }) {
    return await addTask({ summary, description, priority, date, startTime, endTime });
  },

  async get_tasks(args) {
    const days = (args && args.days) || 7;
    return await listTasks({ days });
  },

  async complete_task({ eventId }) {
    return await completeTask({ eventId });
  },

  async delete_task({ eventId }) {
    return await deleteTask({ eventId });
  },

  async edit_task({ eventId, summary, description, priority, date, startTime, endTime }) {
    return await editTask({ eventId, summary, description, priority, date, startTime, endTime });
  },

  async delete_tasks_by_range(args) {
    const days = (args && args.days) || 1;
    return await deleteTasksByRange({ days });
  },
};

// --- Shortcut handlers (async, called directly without AI) ---
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}


const shortcuts = {
  'tasks': async () => listTasks({ days: 7 }),

  'task list': async () => listTasks({ days: 7 }),

  'today task list': async () => listTasks({ days: 1 }),

  'note list': async () => toolHandlers.get_notes(),

  'today note list': async () => {
    const start = todayStart();
    const notes = readJSON(NOTES_FILE).filter(n => new Date(n.createdAt) >= start);
    if (!notes.length) return '📋 امروز هیچ یادداشتی ثبت نشده.';
    return `📋 <b>یادداشت‌های امروز (${notes.length}):</b>\n\n` + notes.map((n, i) => `${i + 1}. ${n.text}`).join('\n\n');
  },

  'today post fetch': async () => {
    const items = await RawItem.findAll({
      where: { createdAt: { [Op.gte]: todayStart() } },
      order: [['createdAt', 'DESC']],
    });
    if (!items.length) return '📡 امروز هیچ آیتمی fetch نشده.';
    return `📡 <b>امروز ${items.length} آیتم fetch شد:</b>\n\n` +
      items.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
  },

  'today post published': async () => {
    const posts = await Post.findAll({
      where: { status: 'published', publishedAt: { [Op.gte]: todayStart() } },
      order: [['publishedAt', 'DESC']],
    });
    if (!posts.length) return '📢 امروز هیچ پستی منتشر نشده.';
    return `📢 <b>امروز ${posts.length} پست منتشر شد:</b>\n\n` +
      posts.map((p, i) => `${i + 1}. ${p.headline}`).join('\n');
  },
};

const tools = [
  {
    type: 'function',
    function: {
      name: 'save_note',
      description: 'Save a note, idea, reminder, or any thought the user wants to keep',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', description: 'The note content to save' } },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_notes',
      description: 'Retrieve and display the list of saved notes',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_task',
      description: 'Add a task to Google Calendar. Ask for date and time if not provided.',
      parameters: {
        type: 'object',
        properties: {
          summary:     { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Optional details' },
          priority:    { type: 'string', enum: ['urgent', 'high', 'medium', 'normal'], description: 'Task priority' },
          date:        { type: 'string', description: 'Date in YYYY-MM-DD format' },
          startTime:   { type: 'string', description: 'Start time in HH:MM format (optional)' },
          endTime:     { type: 'string', description: 'End time in HH:MM format (optional)' },
        },
        required: ['summary', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'List tasks from Google Calendar for the next N days',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of days ahead to fetch (default 7)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task as done and remove it from Google Calendar',
      parameters: {
        type: 'object',
        properties: { eventId: { type: 'string', description: 'The Google Calendar event ID' } },
        required: ['eventId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete a task from Google Calendar',
      parameters: {
        type: 'object',
        properties: { eventId: { type: 'string', description: 'The Google Calendar event ID' } },
        required: ['eventId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_tasks_by_range',
      description: 'Delete ALL tasks within the next N days. Use when user says "delete all tasks for today/tomorrow/this week".',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: '1=today only, 2=today+tomorrow, 7=this week, etc.' },
        },
        required: ['days'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_task',
      description: 'Edit/update an existing task in Google Calendar. Only send fields that need to change.',
      parameters: {
        type: 'object',
        properties: {
          eventId:     { type: 'string', description: 'The Google Calendar event ID' },
          summary:     { type: 'string', description: 'New task title in English' },
          description: { type: 'string', description: 'New description' },
          priority:    { type: 'string', enum: ['urgent', 'high', 'medium', 'normal'] },
          date:        { type: 'string', description: 'New date in YYYY-MM-DD format' },
          startTime:   { type: 'string', description: 'New start time in HH:MM format' },
          endTime:     { type: 'string', description: 'New end time in HH:MM format' },
        },
        required: ['eventId'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are Mehdi's personal AI assistant. Mehdi is an Iranian software developer.
Today's date is ${new Date().toISOString().split('T')[0]}.

TOOL RULES — only call tools when intent is EXPLICIT:
- save_note → user clearly says "یادداشت بزن", "note this", "remember this"
- get_notes → user asks to see/list notes
- get_tasks → user asks to see/list tasks
- complete_task → user says a specific task is done (needs eventId from task list)
- delete_task → user wants to delete a specific task (needs eventId from task list)
- edit_task → user wants to edit/update a task — ask for task list first if eventId unknown, then apply only changed fields
- delete_tasks_by_range → user wants to delete ALL tasks for today / tomorrow / next N days (days=1 means today, days=2 means today+tomorrow, etc.)
- add_task → user wants to add a task — BUT only call this tool when you have ALL required fields:
    • summary (task title) — required — ALWAYS in English, even if user writes in Persian (translate it)
    • date (YYYY-MM-DD) — required — if missing, ASK the user
    • startTime / endTime (HH:MM) — optional, ask if user mentions a time
    • priority: urgent / high / medium / normal — ask if unclear, default to "normal"

  IMPORTANT for add_task: if the user did not provide a date, DO NOT call the tool yet.
  Instead, ask: "چه تاریخی؟" or "کِی؟" — then call the tool once you have the date.
  Convert relative dates: "فردا" → tomorrow's date, "امروز" → today's date, "دوشنبه" → next Monday, etc.

For EVERYTHING else — chat, greetings, questions, venting, brain dumps — just RESPOND naturally. Do NOT call any tool.

Reply in the same language as the user (Persian or English). Be concise and natural.`;

async function transcribeVoice(fileId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const { data: fileInfo } = await axios.get(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const audioRes = await axios.get(
    `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`,
    { responseType: 'arraybuffer' }
  );

  const tempPath = path.join(os.tmpdir(), `voice_${Date.now()}.ogg`);
  fs.writeFileSync(tempPath, Buffer.from(audioRes.data));

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-large-v3-turbo',
    });
    return transcription.text;
  } finally {
    fs.unlinkSync(tempPath);
  }
}

const MENU_KEYBOARD = {
  keyboard: [
    ['📅 Tasks', '📋 Task List'],
    ['📝 Note List', '🗒 Today Note List'],
    ['📡 Today Post Fetch', '📢 Today Post Published'],
  ],
  resize_keyboard: true,
  persistent: true,
};

// Normalize shortcut text (strip leading emoji + space)
function normalizeShortcut(text) {
  return text.toLowerCase().trim().replace(/^[\p{Emoji}\s]+/u, '').trim();
}

async function sendMenu(adminId) {
  await sendMessageToUser(adminId, '📱 منو:', { reply_markup: MENU_KEYBOARD });
}

async function handlePersonalMessage(text) {
  const adminId = ADMIN_ID();

  const normalized = normalizeShortcut(text);
  const shortcutFn = shortcuts[normalized];
  if (shortcutFn) {
    const result = await shortcutFn();
    await sendMessageToUser(adminId, result, { reply_markup: MENU_KEYBOARD });
    return;
  }

  if (normalized === 'menu' || normalized === 'منو') {
    await sendMenu(adminId);
    return;
  }

  chatHistory.push({ role: 'user', content: text });
  if (chatHistory.length > MAX_HISTORY) chatHistory.shift();

  let msg;
  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...chatHistory],
      tools,
      tool_choice: 'auto',
      max_tokens: 800,
    });
    msg = response.choices[0].message;
  } catch (err) {
    // Groq function calling failed — retry without tools
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...chatHistory],
      max_tokens: 800,
    });
    msg = response.choices[0].message;
  }

  if (msg.tool_calls?.length) {
    const results = [];
    for (const toolCall of msg.tool_calls) {
      const handler = toolHandlers[toolCall.function.name];
      if (handler) {
        const args = JSON.parse(toolCall.function.arguments);
        try {
          const result = await handler(args);
          results.push(result);
        } catch (err) {
          console.error(`[personalBot] tool error (${toolCall.function.name}):`, err.message);
          results.push(`❌ Error in ${toolCall.function.name}:\n<code>${err.message}</code>`);
        }
      }
    }
    if (results.length) {
      const combined = results.join('\n\n');
      chatHistory.push({ role: 'assistant', content: combined });
      if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
      saveHistory(chatHistory);
      await sendMessageToUser(adminId, combined);
      return;
    }
  }

  const reply = msg.content?.trim() || '...';
  chatHistory.push({ role: 'assistant', content: reply });
  if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
  saveHistory(chatHistory);
  await sendMessageToUser(adminId, reply);
}

async function handleVoice(fileId) {
  const adminId = ADMIN_ID();
  await sendMessageToUser(adminId, '🎤 ...');
  const text = await transcribeVoice(fileId);
  console.log('[personalBot] voice:', text);
  await handlePersonalMessage(text);
}

module.exports = { handlePersonalMessage, handleVoice, sendMenu };
