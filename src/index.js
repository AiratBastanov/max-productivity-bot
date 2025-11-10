const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const tasksHandler = require('./handlers/tasks');
const habitsHandler = require('./handlers/habits');
const pomodoroHandler = require('./handlers/pomodoro');
const moodHandler = require('./handlers/mood');
const statsHandler = require('./handlers/stats');
const reminderSystem = require('./utils/reminders');
const maxWebhook = require('./max-webhook');
const { mainMenu } = require('./utils/keyboards');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Хранилище состояний пользователей
const userStates = new Map();

// Верификация вебхука от MAX
app.use('/webhook', (req, res, next) => {
  // TODO: Добавить верификацию подписи если нужно
  console.log('MAX Webhook received:', req.method, req.path);
  next();
});

// Главный обработчик вебхука от MAX
app.post('/webhook', async (req, res) => {
  console.log('Received MAX webhook:', JSON.stringify(req.body, null, 2));
  
  const { message, user, type } = req.body;
  
  if (type !== 'message_received') {
    return res.status(200).json({ status: 'ignored' });
  }
  
  if (!message || !user) {
    return res.status(400).json({ error: 'Invalid webhook format' });
  }

  try {
    // Отправляем подтверждение получения
    res.status(200).json({ status: 'received' });
    
    // Обрабатываем сообщение асинхронно
    setTimeout(async () => {
      try {
        const response = await handleMessage(message, user);
        
        // Отправляем ответ пользователю через MAX API
        await maxWebhook.sendMessage(user.id, response.text, response.keyboard);
        
      } catch (error) {
        console.error('Error processing message:', error);
        await maxWebhook.sendMessage(user.id, '❌ Произошла ошибка при обработке сообщения.');
      }
    }, 100);
    
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обработчик сообщений (остается без изменений)
async function handleMessage(message, user) {
  const text = message.text.toLowerCase().trim();
  const userId = user.id;
  
  console.log(`Processing message from user ${userId}: "${text}"`);

  // Проверяем состояние пользователя
  const userState = userStates.get(userId);
  
  // Обработка состояний
  if (userState) {
    return await handleUserState(userId, text, userState);
  }

  // Определяем интент
  if (text.includes('задач') || text === '📝 задачи') {
    return await tasksHandler.handleMessage(text, userId);
  } else if (text.includes('привыч') || text === '🌱 привычки') {
    return await habitsHandler.handleMessage(text, userId);
  } else if (text.includes('помидор') || text === '🍅 pomodoro') {
    return await pomodoroHandler.handleMessage(text, userId);
  } else if (text.includes('настроен') || text === '😊 настроение') {
    return await moodHandler.handleMessage(text, userId);
  } else if (text.includes('статистик') || text === '📊 статистика') {
    return await statsHandler.handleMessage(text, userId);
  } else if (text.includes('помощь') || text === 'start' || text === '/start' || text === 'меню') {
    return showMainMenu();
  } else if (text.includes('отмена') || text === 'назад') {
    return showMainMenu();
  } else {
    return showMainMenu();
  }
}

// Обработка состояний пользователя (остается без изменений)
async function handleUserState(userId, text, userState) {
  userStates.delete(userId);

  switch (userState.state) {
    case 'awaiting_task_title':
      return await tasksHandler.createTask(userId, text);
    
    case 'awaiting_habit_name':
      return await habitsHandler.createHabit(userId, text);
    
    case 'awaiting_habit_selection':
      if (text.includes('отметить все')) {
        return await habitsHandler.markAllHabitsComplete(userId);
      } else {
        const habitName = text.replace('✅', '').trim();
        return await habitsHandler.handleHabitSelection(userId, habitName);
      }
    
    case 'awaiting_mood_note':
      return await moodHandler.saveMoodWithNote(userId, userState.moodScore, text);
    
    default:
      return showMainMenu();
  }
}

// Установка состояния пользователя (остается без изменений)
function setUserState(userId, state, data = {}) {
  userStates.set(userId, { state, ...data, timestamp: Date.now() });
}

// Главное меню
function showMainMenu() {
  return {
    text: `🚀 **MAX-Проджект** - ваш помощник в продуктивности!\n\nВыберите раздел:`,
    keyboard: mainMenu
  };
}

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbStats = await db.all(`
      SELECT 
        (SELECT COUNT(*) FROM tasks) as tasks_count,
        (SELECT COUNT(*) FROM habits) as habits_count,
        (SELECT COUNT(*) FROM moods) as moods_count,
        (SELECT COUNT(*) FROM pomodoro_sessions) as pomodoro_count
    `);
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'SQLite in memory',
      statistics: dbStats[0],
      active_users: userStates.size,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Endpoint для установки вебхука
app.post('/setup-webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    await maxWebhook.setWebhook(webhookUrl);
    res.json({ status: 'Webhook set successfully' });
    
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({ error: 'Failed to set webhook' });
  }
});

// Endpoint для получения информации о боте
app.get('/bot-info', async (req, res) => {
  try {
    const botInfo = await maxWebhook.getBotInfo();
    res.json(botInfo);
  } catch (error) {
    console.error('Error getting bot info:', error);
    res.status(500).json({ error: 'Failed to get bot info' });
  }
});

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`🤖 MAX Productivity Bot запущен на порту ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Webhook setup: POST http://localhost:${PORT}/setup-webhook`);
  console.log(`🤖 Bot info: GET http://localhost:${PORT}/bot-info`);
  
  // Получаем информацию о боте при запуске
  try {
    await maxWebhook.getBotInfo();
  } catch (error) {
    console.log('⚠️  Cannot connect to MAX API. Check your token.');
  }
});

// Экспортируем для тестов
module.exports = app;