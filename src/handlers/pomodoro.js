const db = require('../database');
const { pomodoroKeyboard, mainMenu } = require('../utils/keyboards');

class PomodoroHandler {
  constructor() {
    this.sessions = new Map(); // user_id -> session_data
    this.intervals = new Map(); // user_id -> interval
  }

  async handleMessage(text, userId) {
    if (text.includes('старт') || text.includes('начать') || text.includes('25')) {
      return this.startSession(userId);
    } else if (text.includes('пауз') || text.includes('⏸️')) {
      return this.pauseSession(userId);
    } else if (text.includes('стоп') || text.includes('останов')) {
      return this.stopSession(userId);
    } else if (text.includes('продолж') || text.includes('возобнов')) {
      return this.resumeSession(userId);
    } else if (text.includes('статистик')) {
      return this.showStats(userId);
    } else {
      return {
        text: '🍅 **Pomodoro таймер**\n\n• "Старт 25 мин" - начать сессию\n• "Пауза" - приостановить\n• "Статистика" - посмотреть прогресс',
        keyboard: pomodoroKeyboard
      };
    }
  }

  startSession(userId) {
    // Останавливаем предыдущую сессию если есть
    this.stopSession(userId);

    const session = {
      startTime: new Date(),
      duration: 25 * 60, // 25 minutes in seconds
      timeLeft: 25 * 60,
      isRunning: true,
      isBreak: false
    };

    this.sessions.set(userId, session);

    // Запускаем таймер
    const interval = setInterval(() => {
      this._updateSession(userId);
    }, 1000);

    this.intervals.set(userId, interval);

    // Сохраняем в БД
    db.run(
      'INSERT INTO pomodoro_sessions (user_id, duration, start_time) VALUES (?, ?, ?)',
      [userId, session.duration, session.startTime.toISOString()]
    );

    return {
      text: this._getSessionMessage(userId),
      keyboard: {
        buttons: [
          [{ text: '⏸️ Пауза' }, { text: '⏹️ Стоп' }],
          [{ text: '📊 Статистика' }, { text: '🎯 Главное меню' }]
        ]
      }
    };
  }

  pauseSession(userId) {
    const session = this.sessions.get(userId);
    if (!session || !session.isRunning) {
      return {
        text: '❌ Нет активной сессии для паузы.',
        keyboard: pomodoroKeyboard
      };
    }

    session.isRunning = false;
    const interval = this.intervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(userId);
    }

    return {
      text: `⏸️ **Pomodoro на паузе**\n\nОсталось времени: ${this._formatTime(session.timeLeft)}\n\n"Продолжить" чтобы возобновить.`,
      keyboard: {
        buttons: [
          [{ text: '▶️ Продолжить' }, { text: '⏹️ Стоп' }],
          [{ text: '🎯 Главное меню' }]
        ]
      }
    };
  }

  resumeSession(userId) {
    const session = this.sessions.get(userId);
    if (!session || session.isRunning) {
      return {
        text: '❌ Нет сессии на паузе.',
        keyboard: pomodoroKeyboard
      };
    }

    session.isRunning = true;

    const interval = setInterval(() => {
      this._updateSession(userId);
    }, 1000);

    this.intervals.set(userId, interval);

    return {
      text: `▶️ **Pomodoro продолжен!**\n\nОсталось: ${this._formatTime(session.timeLeft)}`,
      keyboard: {
        buttons: [
          [{ text: '⏸️ Пауза' }, { text: '⏹️ Стоп' }],
          [{ text: '🎯 Главное меню' }]
        ]
      }
    };
  }

  stopSession(userId) {
    const session = this.sessions.get(userId);
    if (session) {
      session.isRunning = false;
    }

    const interval = this.intervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(userId);
    }

    this.sessions.delete(userId);

    return {
      text: '⏹️ **Pomodoro сессия остановлена.**\n\nХорошая работа! Не забудьте сделать перерыв.',
      keyboard: pomodoroKeyboard
    };
  }

  _updateSession(userId) {
    const session = this.sessions.get(userId);
    if (!session || !session.isRunning) return;

    session.timeLeft--;

    if (session.timeLeft <= 0) {
      this._completeSession(userId);
    }
  }

  _completeSession(userId) {
    const session = this.sessions.get(userId);
    if (!session) return;

    // Останавливаем таймер
    const interval = this.intervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(userId);
    }

    // Обновляем в БД
    db.run(
      'UPDATE pomodoro_sessions SET completed = TRUE, end_time = ? WHERE user_id = ? AND completed = FALSE',
      [new Date().toISOString(), userId]
    );

    this.sessions.delete(userId);

    // Здесь можно добавить отправку уведомления пользователю
    console.log(`Pomodoro session completed for user ${userId}`);
  }

  _getSessionMessage(userId) {
    const session = this.sessions.get(userId);
    if (!session) return '❌ Сессия не найдена.';

    const progressBar = this._createProgressBar(session.timeLeft, session.duration);
    
    return `🍅 **Pomodoro сессия**\n\n${progressBar}\nОсталось: ${this._formatTime(session.timeLeft)}\n\nСфокусируйтесь на задаче! 💪`;
  }

  _createProgressBar(current, total) {
    const width = 10;
    const percentage = (total - current) / total;
    const filled = Math.round(width * percentage);
    const empty = width - filled;

    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(percentage * 100)}%`;
  }

  _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async showStats(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const todaySessions = await db.all(
        `SELECT COUNT(*) as count, SUM(duration) as total_time 
         FROM pomodoro_sessions 
         WHERE user_id = ? AND date(start_time) = ? AND completed = TRUE`,
        [userId, today]
      );

      const weekSessions = await db.all(
        `SELECT COUNT(*) as count, SUM(duration) as total_time 
         FROM pomodoro_sessions 
         WHERE user_id = ? AND date(start_time) >= date('now', '-7 days') AND completed = TRUE`,
        [userId]
      );

      const todayCount = todaySessions[0].count || 0;
      const todayTime = todaySessions[0].total_time || 0;
      const weekCount = weekSessions[0].count || 0;
      const weekTime = weekSessions[0].total_time || 0;

      const stats = `📊 **Статистика Pomodoro**\n\n` +
                   `📅 **Сегодня:**\n` +
                   `• Сессии: ${todayCount}\n` +
                   `• Время: ${Math.round(todayTime / 60)} мин\n\n` +
                   `📈 **За неделю:**\n` +
                   `• Сессии: ${weekCount}\n` +
                   `• Время: ${Math.round(weekTime / 60)} мин\n\n` +
                   `🎯 Цель: 8 помидорок в день!`;

      return {
        text: stats,
        keyboard: pomodoroKeyboard
      };
    } catch (error) {
      console.error('Error showing pomodoro stats:', error);
      return {
        text: '❌ Произошла ошибка при загрузке статистики.',
        keyboard: pomodoroKeyboard
      };
    }
  }
}

module.exports = new PomodoroHandler();