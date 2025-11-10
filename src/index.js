const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const tasksHandler = require('./handlers/tasks');
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
  if (userState && userState.state === 'awaiting_task_title') {
    userStates.delete(userId); // Очищаем состояние
    return await tasksHandler.createTask(userId, message.text);
  }

  // Определяем интент
  if (text.includes('задач') || text === '📝 задачи') {
    return await tasksHandler.handleMessage(text, userId);
  } else if (text.includes('привыч') || text === '🌱 привычки') {
    return await handleHabits(text, userId);
  } else if (text.includes('помидор') || text === '🍅 pomodoro') {
    return await handlePomodoro(text, userId);
  } else if (text.includes('настроен') || text === '😊 настроение') {
    return await handleMood(text, userId);
  } else if (text.includes('статистик') || text === '📊 статистика') {
    return await handleStats(text, userId);
  } else if (text.includes('помощь') || text === 'start' || text === '/start') {
    return showMainMenu();
  } else {
    return showMainMenu();
  }
}

// Заглушки для других обработчиков (реализуем дальше)
async function handleHabits(text, userId) {
  return {
    text: '🌱 **Трекер привычек**\n\nРаздел в разработке...',
    keyboard: mainMenu
  };
}

async function handlePomodoro(text, userId) {
  return {
    text: '🍅 **Pomodoro таймер**\n\nРаздел в разработке...',
    keyboard: mainMenu
  };
}

async function handleMood(text, userId) {
  return {
    text: '😊 **Трекер настроения**\n\nРаздел в разработке...',
    keyboard: mainMenu
  };
}

async function handleStats(text, userId) {
  return {
    text: '📊 **Статистика**\n\nРаздел в разработке...',
    keyboard: mainMenu
  };
}

// Главное меню
function showMainMenu() {
  return {
    text: `🚀 **MAX-Проджект** - ваш помощник в продуктивности!\n\nВыберите раздел:`,
    keyboard: mainMenu
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'SQLite in memory'
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🤖 MAX Productivity Bot запущен на порту ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;