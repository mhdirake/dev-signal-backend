'use strict';

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { sendMessageToUser } = require('@helpers/telegram');
const { Post, RawItem } = require('@models');
const { Op } = require('sequelize');

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const ADMIN_ID = () => process.env.ADMIN_TELEGRAM_USER_ID;
const DATA_DIR = path.join(__dirname, '../../data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

const chatHistory = [];
const MAX_HISTORY = 20;

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

  add_task({ text, description, project }) {
    const tasks = readJSON(TASKS_FILE);
    const nextId = tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    tasks.push({ id: nextId, text, description: description || null, project: project || null, done: false, createdAt: new Date().toISOString() });
    writeJSON(TASKS_FILE, tasks);
    const meta = [
      project ? `🗂 ${project}` : '',
      description ? `<i>${description}</i>` : '',
    ].filter(Boolean).join(' · ');
    return `✅ تسک اضافه شد:\n\n<b>${nextId}.</b> ${text}${meta ? '\n   ' + meta : ''}`;
  },

  get_tasks() {
    const active = readJSON(TASKS_FILE).filter(t => !t.done);
    if (!active.length) return '🎉 هیچ تسک فعالی نداری!';
    return '📌 <b>تسک‌های فعال:</b>\n\n' + active.map(t => {
      const meta = [
        t.project ? `🗂 ${t.project}` : '',
        t.description ? `<i>${t.description}</i>` : '',
      ].filter(Boolean).join(' · ');
      return `${t.id}. ${t.text}${meta ? '\n   ' + meta : ''}`;
    }).join('\n\n');
  },

  complete_task({ id }) {
    const tasks = readJSON(TASKS_FILE);
    const task = tasks.find(t => t.id === id);
    if (!task) return `⚠️ تسک ${id} پیدا نشد.`;
    task.done = true;
    task.doneAt = new Date().toISOString();
    writeJSON(TASKS_FILE, tasks);
    return `✅ تسک تکمیل شد:\n<s>${task.text}</s>`;
  },

  delete_task({ id }) {
    const tasks = readJSON(TASKS_FILE);
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return `⚠️ تسک ${id} پیدا نشد.`;
    const [removed] = tasks.splice(idx, 1);
    writeJSON(TASKS_FILE, tasks);
    return `🗑 تسک حذف شد:\n<s>${removed.text}</s>`;
  },
};

// --- Shortcut handlers (async, called directly without AI) ---
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTaskLine(t) {
  const meta = [
    t.project ? `🗂 ${t.project}` : '',
    t.description ? `<i>${t.description}</i>` : '',
  ].filter(Boolean).join(' · ');
  return `${t.id}. ${t.text}${meta ? '\n   ' + meta : ''}`;
}

const shortcuts = {
  'task list': async () => toolHandlers.get_tasks(),

  'today task list': async () => {
    const start = todayStart();
    const tasks = readJSON(TASKS_FILE).filter(t => !t.done && new Date(t.createdAt) >= start);
    if (!tasks.length) return '📌 امروز هیچ تسکی اضافه نشده.';
    return `📌 <b>تسک‌های امروز (${tasks.length}):</b>\n\n` + tasks.map(formatTaskLine).join('\n\n');
  },

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
      description: 'Add a task or to-do item that needs to be done',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Short task title' },
          description: { type: 'string', description: 'Optional longer description or details' },
          project: { type: 'string', description: 'Optional project name this task belongs to' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Retrieve and display the list of active tasks',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task as done by its ID number',
      parameters: {
        type: 'object',
        properties: { id: { type: 'number', description: 'The task ID to complete' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Permanently delete/remove a task by its ID number',
      parameters: {
        type: 'object',
        properties: { id: { type: 'number', description: 'The task ID to delete' } },
        required: ['id'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are Mehdi's personal AI assistant. Mehdi is an Iranian software developer.

IMPORTANT — only call tools when the intent is EXPLICIT and UNAMBIGUOUS:
- save_note → ONLY if user clearly says "یادداشت بزن", "ذخیره کن", "note this", "remember this", etc.
- add_task → ONLY if user clearly says "تسک اضافه کن", "باید انجام بدم", "to-do", "add a task", etc.
- get_notes → ONLY if user asks to see/list their notes
- get_tasks → ONLY if user asks to see/list their tasks
- complete_task → ONLY if user says a specific task is done
- delete_task → ONLY if user wants to delete/remove a specific task

For EVERYTHING else — casual chat, greetings, questions, venting, brain dumps, technical questions — just RESPOND naturally. Do NOT call any tool.

Examples of when NOT to use tools:
- "چه خبر؟" → just reply conversationally
- "خسته‌ام" → empathize and respond
- "داری؟" → just chat
- "چطوری؟" → greet back
- Brain dump of ideas → organize and respond as text, do NOT save automatically

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
    ['📋 Task List', '📅 Today Task List'],
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
    const toolCall = msg.tool_calls[0];
    const handler = toolHandlers[toolCall.function.name];
    if (handler) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await handler(args);
      chatHistory.push({ role: 'assistant', content: result });
      if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
      await sendMessageToUser(adminId, result);
      return;
    }
  }

  const reply = msg.content?.trim() || '...';
  chatHistory.push({ role: 'assistant', content: reply });
  if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
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
