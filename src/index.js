const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const tasksHandler = require('./handlers/tasks');
const habitsHandler = require('./handlers/habits');
const pomodoroHandler = require('./handlers/pomodoro');
const moodHandler = require('./handlers/mood');
const statsHandler = require('./handlers/stats');
const reminderSystem = require('./utils/reminders');
const { mainMenu } = require('./utils/keyboards');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Хранилище состояний пользователей
const userStates = new Map();

// Главный обработчик вебхука
app.post('/webhook', async (req, res) => {
  console.log('Received webhook:', JSON.stringify(req.body, null, 2));
  
  const { message, user } = req.body;
  
  if (!message || !user) {
    return res.status(400).json({ error: 'Invalid webhook format' });
  }

  try {
    const response = await handleMessage(message, user);
    res.json(response);
  } catch (error) {
    console.error('Error handling message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обработчик сообщений
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

// Обработка состояний пользователя
async function handleUserState(userId, text, userState) {
  userStates.delete(userId); // Очищаем состояние

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

// Установка состояния пользователя
function setUserState(userId, state, data = {}) {
  userStates.set(userId, { state, ...data, timestamp: Date.now() });
}

// Очистка устаревших состояний (каждые 10 минут)
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 минут
  
  for (const [userId, state] of userStates.entries()) {
    if (now - state.timestamp > timeout) {
      userStates.delete(userId);
      console.log(`Cleared expired state for user ${userId}`);
    }
  }
}, 10 * 60 * 1000);

// Заглушки для обработчиков (теперь реализованы)
async function handleHabits(text, userId) {
  return await habitsHandler.handleMessage(text, userId);
}

async function handlePomodoro(text, userId) {
  return await pomodoroHandler.handleMessage(text, userId);
}

async function handleMood(text, userId) {
  return await moodHandler.handleMessage(text, userId);
}

async function handleStats(text, userId) {
  return await statsHandler.handleMessage(text, userId);
}

// Главное меню
function showMainMenu() {
  return {
    text: `🚀 **MAX-Проджект** - ваш помощник в продуктивности!\n\nВыберите раздел:`,
    keyboard: mainMenu
  };
}

// Health check с расширенной информацией
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

// Endpoint для ручной отправки напоминаний (для тестирования)
app.post('/test-reminder/:type', async (req, res) => {
  const { type } = req.params;
  const { userId } = req.body;
  
  try {
    let message;
    
    switch (type) {
      case 'morning':
        message = await reminderSystem.generateDailyReminder(userId || 12345);
        break;
      case 'evening':
        message = await reminderSystem.generateEveningReminder(userId || 12345);
        break;
      case 'habits':
        message = await reminderSystem.generateHabitReminder(userId || 12345);
        break;
      default:
        return res.status(400).json({ error: 'Invalid reminder type' });
    }
    
    res.json({ message });
  } catch (error) {
    console.error('Error generating test reminder:', error);
    res.status(500).json({ error: 'Failed to generate reminder' });
  }
});

// Endpoint для получения статистики пользователя
app.get('/user/:id/stats', async (req, res) => {
  const userId = parseInt(req.params.id);
  
  try {
    const stats = await statsHandler.showOverallStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🤖 MAX Productivity Bot запущен на порту ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET  /health - проверка здоровья`);
  console.log(`   POST /webhook - вебхук от MAX`);
  console.log(`   GET  /user/:id/stats - статистика пользователя`);
  console.log(`   POST /test-reminder/:type - тест напоминаний`);
});

module.exports = app;