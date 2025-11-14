const { Bot, Keyboard } = require('@maxhub/max-bot-api');
const db = require('./database');
const tasksHandler = require('./handlers/tasks');
const habitsHandler = require('./handlers/habits');
const pomodoroHandler = require('./handlers/pomodoro');
const moodHandler = require('./handlers/mood');
const statsHandler = require('./handlers/stats');
const reminderSystem = require('./utils/reminders');

// Создаем экземпляр бота
const bot = new Bot(process.env.BOT_TOKEN);

// Хранилище состояний пользователей
const userStates = new Map();

// Главное меню
const mainMenu = Keyboard.inlineKeyboard([
  [
    Keyboard.button.message('📝 Задачи'),
    Keyboard.button.message('🌱 Привычки')
  ],
  [
    Keyboard.button.message('🍅 Pomodoro'),
    Keyboard.button.message('😊 Настроение')
  ],
  [
    Keyboard.button.message('📊 Статистика')
  ]
]);

// Команда /start
bot.command('start', async (ctx) => {
  await ctx.reply(
    `🚀 **MAX-Проджект** - ваш помощник в продуктивности!\n\nВыберите раздел:`,
    { attachments: [mainMenu] }
  );
});

// Обработка текстовых сообщений
bot.on('message_created', async (ctx) => {
  const text = ctx.message.body.text?.toLowerCase().trim() || '';
  const userId = ctx.user.user_id;
  
  console.log(`Processing message from user ${userId}: "${text}"`);

  // Проверяем состояние пользователя
  const userState = userStates.get(userId);
  
  // Обработка состояний
  if (userState) {
    const response = await handleUserState(userId, text, userState);
    await sendResponse(ctx, response);
    return;
  }

  // Определяем интент
  let response;
  if (text.includes('задач') || text === '📝 задачи') {
    response = await tasksHandler.handleMessage(text, userId);
  } else if (text.includes('привыч') || text === '🌱 привычки') {
    response = await habitsHandler.handleMessage(text, userId);
  } else if (text.includes('помидор') || text === '🍅 pomodoro') {
    response = await pomodoroHandler.handleMessage(text, userId);
  } else if (text.includes('настроен') || text === '😊 настроение') {
    response = await moodHandler.handleMessage(text, userId);
  } else if (text.includes('статистик') || text === '📊 статистика') {
    response = await statsHandler.handleMessage(text, userId);
  } else if (text.includes('помощь') || text === 'меню') {
    response = showMainMenu();
  } else if (text.includes('отмена') || text === 'назад') {
    response = showMainMenu();
  } else {
    response = showMainMenu();
  }

  await sendResponse(ctx, response);
});

// Обработка состояний пользователя
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

// Установка состояния пользователя
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

// Отправка ответа с поддержкой клавиатур
async function sendResponse(ctx, response) {
  if (response.keyboard) {
    await ctx.reply(response.text, { attachments: [response.keyboard] });
  } else {
    await ctx.reply(response.text);
  }
}

// Health check endpoint (для Docker)
const express = require('express');
const healthApp = express();
healthApp.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    bot: 'MAX Productivity Bot',
    active_users: userStates.size
  });
});

healthApp.listen(3001, () => {
  console.log('🔧 Health check server running on port 3001');
});

// Запуск бота
bot.start().then(() => {
  console.log('🤖 MAX Productivity Bot запущен!');
  console.log('📍 Используется официальная MAX Bot API');
}).catch((error) => {
  console.error('❌ Ошибка запуска бота:', error);
});

// Экспортируем для использования в других модулях
module.exports = {
  bot,
  setUserState,
  userStates
};