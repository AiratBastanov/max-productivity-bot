const mainMenu = {
  buttons: [
    [{ text: '📝 Задачи' }, { text: '🌱 Привычки' }],
    [{ text: '🍅 Pomodoro' }, { text: '😊 Настроение' }],
    [{ text: '📊 Статистика' }]
  ]
};

const tasksKeyboard = {
  buttons: [
    [{ text: '➕ Новая задача' }, { text: '📋 Мои задачи' }],
    [{ text: '✅ Выполненные' }, { text: '🎯 Главное меню' }]
  ]
};

const habitsKeyboard = {
  buttons: [
    [{ text: '🌱 Новая привычка' }, { text: '📊 Мои привычки' }],
    [{ text: '✅ Отметить выполнение' }, { text: '🎯 Главное меню' }]
  ]
};

const pomodoroKeyboard = {
  buttons: [
    [{ text: '🍅 Старт 25 мин' }, { text: '⏸️ Пауза' }],
    [{ text: '📊 Статистика' }, { text: '🎯 Главное меню' }]
  ]
};

const moodKeyboard = {
  buttons: [
    [{ text: '😊 Отлично' }, { text: '😐 Нормально' }, { text: '😔 Плохо' }],
    [{ text: '📈 История' }, { text: '🎯 Главное меню' }]
  ]
};

module.exports = {
  mainMenu,
  tasksKeyboard,
  habitsKeyboard,
  pomodoroKeyboard,
  moodKeyboard
};