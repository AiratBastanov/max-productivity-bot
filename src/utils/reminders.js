const cron = require('node-cron');
const db = require('../database');

class ReminderSystem {
  constructor() {
    this.jobs = new Map();
    this.init();
  }

  init() {
    // Ежедневные утренние напоминания в 9:00
    cron.schedule('0 9 * * *', () => {
      this.sendDailyReminders();
    });

    // Вечерние напоминания в 20:00
    cron.schedule('0 20 * * *', () => {
      this.sendEveningReminders();
    });

    // Напоминания о привычках каждые 3 часа с 10 до 22
    cron.schedule('0 10,13,16,19,22 * * *', () => {
      this.sendHabitReminders();
    });

    console.log('🕐 Система напоминаний запущена');
  }

  async sendDailyReminders() {
    try {
      // Получаем всех пользователей, у которых есть активные задачи или привычки
      const users = await db.all(`
        SELECT DISTINCT user_id FROM (
          SELECT user_id FROM tasks WHERE completed = FALSE
          UNION 
          SELECT user_id FROM habits
          UNION
          SELECT user_id FROM moods WHERE date(created_at) = date('now')
        )
      `);

      for (const user of users) {
        const message = await this.generateDailyReminder(user.user_id);
        // Здесь будет отправка через MAX API
        console.log(`📅 Утреннее напоминание для пользователя ${user.user_id}:`, message);
      }
    } catch (error) {
      console.error('Error sending daily reminders:', error);
    }
  }

  async sendEveningReminders() {
    try {
      const users = await db.all(`
        SELECT DISTINCT user_id FROM (
          SELECT user_id FROM tasks WHERE completed = FALSE
          UNION 
          SELECT user_id FROM habits
        )
      `);

      for (const user of users) {
        const message = await this.generateEveningReminder(user.user_id);
        console.log(`🌙 Вечернее напоминание для пользователя ${user.user_id}:`, message);
      }
    } catch (error) {
      console.error('Error sending evening reminders:', error);
    }
  }

  async sendHabitReminders() {
    try {
      const usersWithHabits = await db.all(`
        SELECT DISTINCT h.user_id 
        FROM habits h
        LEFT JOIN habit_checks hc ON h.id = hc.habit_id AND hc.check_date = date('now')
        WHERE hc.id IS NULL OR hc.completed = FALSE
      `);

      for (const user of usersWithHabits) {
        const message = await this.generateHabitReminder(user.user_id);
        console.log(`🌱 Напоминание о привычках для пользователя ${user.user_id}:`, message);
      }
    } catch (error) {
      console.error('Error sending habit reminders:', error);
    }
  }

  async generateDailyReminder(userId) {
    const today = new Date().toLocaleDateString('ru-RU');
    
    const [
      activeTasks,
      uncompletedHabits,
      hasMoodToday
    ] = await Promise.all([
      db.all('SELECT title FROM tasks WHERE user_id = ? AND completed = FALSE ORDER BY created_at LIMIT 3', [userId]),
      db.all(`
        SELECT h.name FROM habits h
        LEFT JOIN habit_checks hc ON h.id = hc.habit_id AND hc.check_date = date('now')
        WHERE h.user_id = ? AND (hc.id IS NULL OR hc.completed = FALSE)
        LIMIT 3
      `, [userId]),
      db.get('SELECT id FROM moods WHERE user_id = ? AND date(created_at) = date("now")', [userId])
    ]);

    let message = `🌅 **Доброе утро!** ${today}\n\n`;

    if (activeTasks.length > 0) {
      message += `📝 **Сегодня в планах:**\n`;
      activeTasks.forEach((task, index) => {
        message += `${index + 1}. ${task.title}\n`;
      });
      message += `\n`;
    }

    if (uncompletedHabits.length > 0) {
      message += `🌱 **Не забудьте о привычках:**\n`;
      uncompletedHabits.forEach((habit, index) => {
        message += `${index + 1}. ${habit.name}\n`;
      });
      message += `\n`;
    }

    if (!hasMoodToday) {
      message += `😊 **Как ваше настроение сегодня?**\n`;
    }

    message += `🎯 Хорошего дня и продуктивной работы! 💪`;

    return message;
  }

  async generateEveningReminder(userId) {
    const today = new Date().toLocaleDateString('ru-RU');
    
    const [
      completedTasks,
      uncompletedTasks,
      completedHabits,
      uncompletedHabits
    ] = await Promise.all([
      db.all('SELECT title FROM tasks WHERE user_id = ? AND completed = TRUE AND date(created_at) = date("now")', [userId]),
      db.all('SELECT title FROM tasks WHERE user_id = ? AND completed = FALSE', [userId]),
      db.all(`
        SELECT h.name FROM habits h
        JOIN habit_checks hc ON h.id = hc.habit_id 
        WHERE h.user_id = ? AND hc.check_date = date('now') AND hc.completed = TRUE
      `, [userId]),
      db.all(`
        SELECT h.name FROM habits h
        LEFT JOIN habit_checks hc ON h.id = hc.habit_id AND hc.check_date = date('now')
        WHERE h.user_id = ? AND (hc.id IS NULL OR hc.completed = FALSE)
      `, [userId])
    ]);

    let message = `🌙 **Подведение итогов дня** ${today}\n\n`;

    if (completedTasks.length > 0) {
      message += `✅ **Выполненные задачи:**\n`;
      completedTasks.forEach((task, index) => {
        message += `${index + 1}. ${task.title}\n`;
      });
      message += `\n`;
    }

    if (uncompletedTasks.length > 0) {
      message += `📋 **Задачи на завтра:**\n`;
      uncompletedTasks.slice(0, 3).forEach((task, index) => {
        message += `${index + 1}. ${task.title}\n`;
      });
      if (uncompletedTasks.length > 3) {
        message += `... и еще ${uncompletedTasks.length - 3} задач\n`;
      }
      message += `\n`;
    }

    if (completedHabits.length > 0) {
      message += `🌱 **Привычки сегодня:** ${completedHabits.length} выполнено\n\n`;
    }

    if (uncompletedHabits.length > 0) {
      message += `💡 **Не забудьте завтра:** ${uncompletedHabits.map(h => h.name).join(', ')}\n\n`;
    }

    message += `📊 Всего выполнено: ${completedTasks.length} задач, ${completedHabits.length} привычек\n`;
    message += `🎯 Отличная работа! Хорошего отдыха! 😴`;

    return message;
  }

  async generateHabitReminder(userId) {
    const uncompletedHabits = await db.all(`
      SELECT h.name, h.current_streak 
      FROM habits h
      LEFT JOIN habit_checks hc ON h.id = hc.habit_id AND hc.check_date = date('now')
      WHERE h.user_id = ? AND (hc.id IS NULL OR hc.completed = FALSE)
      LIMIT 5
    `, [userId]);

    if (uncompletedHabits.length === 0) {
      return null;
    }

    let message = `🌱 **Напоминание о привычках**\n\n`;
    
    uncompletedHabits.forEach((habit, index) => {
      const streakText = habit.current_streak > 0 ? ` (серия: ${habit.current_streak} дней 🔥)` : '';
      message += `${index + 1}. ${habit.name}${streakText}\n`;
    });

    message += `\nНе потеряйте свои серии! 💪`;

    return message;
  }

  // Метод для отправки напоминаний через MAX API (заглушка)
  async sendMessageToUser(userId, message) {
    // В реальной реализации здесь будет вызов MAX API
    console.log(`📨 Отправка сообщения пользователю ${userId}: ${message}`);
    return true;
  }
}

module.exports = new ReminderSystem();