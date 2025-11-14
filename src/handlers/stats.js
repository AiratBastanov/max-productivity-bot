const db = require('../database');
const { Keyboard } = require('@maxhub/max-bot-api');

class StatsHandler {
  async handleMessage(text, userId) {
    const statsKeyboard = Keyboard.inlineKeyboard([
      [
        Keyboard.button.message('📊 Общая статистика'),
        Keyboard.button.message('📈 Недельный отчет')
      ],
      [
        Keyboard.button.message('📝 По задачам'),
        Keyboard.button.message('🌱 По привычкам')
      ],
      [
        Keyboard.button.message('🍅 По Pomodoro'),
        Keyboard.button.message('😊 По настроению')
      ],
      [
        Keyboard.button.message('🎯 Главное меню')
      ]
    ]);

    if (text.includes('обща') || text.includes('свод')) {
      return this.showOverallStats(userId);
    } else if (text.includes('недел') || text.includes('неделя')) {
      return this.showWeeklyStats(userId);
    } else if (text.includes('задач')) {
      return this.showTaskStats(userId);
    } else if (text.includes('привыч')) {
      return this.showHabitStats(userId);
    } else if (text.includes('помидор')) {
      return this.showPomodoroStats(userId);
    } else if (text.includes('настроен')) {
      return this.showMoodStats(userId);
    } else {
      return this.showOverallStats(userId);
    }
  }

  async showOverallStats(userId) {
    try {
      const [
        taskStats,
        habitStats, 
        pomodoroStats,
        moodStats
      ] = await Promise.all([
        this._getTaskStats(userId),
        this._getHabitStats(userId),
        this._getPomodoroStats(userId),
        this._getMoodStats(userId)
      ]);

      const today = new Date().toLocaleDateString('ru-RU');
      
      let stats = `📊 **Общая статистика**\n\n`;
      stats += `📅 Отчет на: ${today}\n\n`;

      stats += `📝 **Задачи:**\n`;
      stats += `• Активные: ${taskStats.active}\n`;
      stats += `• Выполнено сегодня: ${taskStats.completedToday}\n`;
      stats += `• Всего выполнено: ${taskStats.totalCompleted}\n\n`;

      stats += `🌱 **Привычки:**\n`;
      stats += `• Всего привычек: ${habitStats.total}\n`;
      stats += `• Выполнено сегодня: ${habitStats.completedToday}\n`;
      stats += `• Лучшая серия: ${habitStats.bestStreak} дней\n\n`;

      stats += `🍅 **Pomodoro:**\n`;
      stats += `• Сегодня: ${pomodoroStats.todayCount} сессий\n`;
      stats += `• Всего времени: ${pomodoroStats.totalTime} мин\n`;
      stats += `• За неделю: ${pomodoroStats.weekCount} сессий\n\n`;

      stats += `😊 **Настроение:**\n`;
      stats += `• Среднее: ${moodStats.average}/5\n`;
      stats += `• Сегодня: ${moodStats.today || 'не отмечено'}\n`;
      stats += `• Записей: ${moodStats.totalEntries}\n\n`;

      stats += `🎯 **Продуктивность сегодня:** ${this._calculateProductivityScore(taskStats, habitStats, pomodoroStats)}%`;

      const overallStatsKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('📝 По задачам'),
          Keyboard.button.message('🌱 По привычкам')
        ],
        [
          Keyboard.button.message('🍅 По Pomodoro'),
          Keyboard.button.message('😊 По настроению')
        ],
        [
          Keyboard.button.message('📈 Недельный отчет'),
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: stats,
        keyboard: overallStatsKeyboard
      };

    } catch (error) {
      console.error('Error showing overall stats:', error);
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

      return {
        text: '❌ Произошла ошибка при загрузке статистики.',
        keyboard: mainMenu
      };
    }
  }

  async showWeeklyStats(userId) {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [
        weeklyTasks,
        weeklyHabits,
        weeklyPomodoro,
        weeklyMood
      ] = await Promise.all([
        this._getWeeklyTaskStats(userId, weekAgo),
        this._getWeeklyHabitStats(userId, weekAgo),
        this._getWeeklyPomodoroStats(userId, weekAgo),
        this._getWeeklyMoodStats(userId, weekAgo)
      ]);

      let weeklyReport = `📈 **Недельный отчет**\n\n`;
      weeklyReport += `Период: ${weekAgo.toLocaleDateString('ru-RU')} - ${new Date().toLocaleDateString('ru-RU')}\n\n`;

      weeklyReport += `📝 **Задачи за неделю:**\n`;
      weeklyReport += `• Создано: ${weeklyTasks.created}\n`;
      weeklyReport += `• Выполнено: ${weeklyTasks.completed}\n`;
      weeklyReport += `• Процент выполнения: ${weeklyTasks.completionRate}%\n\n`;

      weeklyReport += `🌱 **Привычки за неделю:**\n`;
      weeklyReport += `• Всего проверок: ${weeklyHabits.totalChecks}\n`;
      weeklyReport += `• Выполнено: ${weeklyHabits.completedChecks}\n`;
      weeklyReport += `• Процент выполнения: ${weeklyHabits.completionRate}%\n\n`;

      weeklyReport += `🍅 **Pomodoro за неделю:**\n`;
      weeklyReport += `• Сессии: ${weeklyPomodoro.sessions}\n`;
      weeklyReport += `• Общее время: ${weeklyPomodoro.totalTime} мин\n`;
      weeklyReport += `• В среднем в день: ${weeklyPomodoro.dailyAverage} мин\n\n`;

      weeklyReport += `😊 **Настроение за неделю:**\n`;
      weeklyReport += `• Среднее: ${weeklyMood.average}/5\n`;
      weeklyReport += `• Лучший день: ${weeklyMood.bestDay}\n`;
      weeklyReport += `• Тренд: ${weeklyMood.trend}\n\n`;

      weeklyReport += `🏆 **Итог недели:** ${this._getWeeklySummary(weeklyTasks, weeklyHabits, weeklyPomodoro, weeklyMood)}`;

      const weeklyStatsKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('📊 Общая статистика'),
          Keyboard.button.message('📝 Детали по задачам')
        ],
        [
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: weeklyReport,
        keyboard: weeklyStatsKeyboard
      };

    } catch (error) {
      console.error('Error showing weekly stats:', error);
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

      return {
        text: '❌ Произошла ошибка при загрузке недельного отчета.',
        keyboard: mainMenu
      };
    }
  }

  async showTaskStats(userId) {
    try {
      const stats = await this._getTaskStats(userId);
      
      let taskStats = `📝 **Статистика по задачам**\n\n`;
      taskStats += `• Всего создано: ${stats.totalCreated}\n`;
      taskStats += `• Активных: ${stats.active}\n`;
      taskStats += `• Выполнено: ${stats.totalCompleted}\n`;
      taskStats += `• Выполнено сегодня: ${stats.completedToday}\n`;
      taskStats += `• Процент выполнения: ${stats.completionRate}%\n\n`;

      if (stats.recentCompleted.length > 0) {
        taskStats += `✅ **Недавно выполнено:**\n`;
        stats.recentCompleted.forEach(task => {
          taskStats += `• ${task.title}\n`;
        });
      }

      taskStats += `\n🎯 **Рекомендация:** ${this._getTaskRecommendation(stats)}`;

      const taskStatsKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('📊 Общая статистика'),
          Keyboard.button.message('📈 Недельный отчет')
        ],
        [
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: taskStats,
        keyboard: taskStatsKeyboard
      };

    } catch (error) {
      console.error('Error showing task stats:', error);
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

      return {
        text: '❌ Произошла ошибка при загрузке статистики задач.',
        keyboard: mainMenu
      };
    }
  }

  async showHabitStats(userId) {
    try {
      const habits = await db.all(
        `SELECT h.*, 
         COUNT(hc.id) as total_days,
         SUM(CASE WHEN hc.completed = 1 THEN 1 ELSE 0 END) as completed_days
         FROM habits h
         LEFT JOIN habit_checks hc ON h.id = hc.habit_id
         WHERE h.user_id = ?
         GROUP BY h.id`,
        [userId]
      );

      if (habits.length === 0) {
        const habitsKeyboard = Keyboard.inlineKeyboard([
          [
            Keyboard.button.message('🌱 Новая привычка'),
            Keyboard.button.message('📊 Мои привычки')
          ],
          [
            Keyboard.button.message('🎯 Главное меню')
          ]
        ]);

        return {
          text: '📊 У вас пока нет привычек для статистики.',
          keyboard: habitsKeyboard
        };
      }

      let stats = '📊 **Статистика привычек:**\n\n';
      
      for (let habit of habits) {
        const completionRate = habit.total_days > 0 
          ? Math.round((habit.completed_days / habit.total_days) * 100) 
          : 0;

        stats += `**${habit.name}**\n`;
        stats += `🔥 Текущая серия: ${habit.current_streak} дней\n`;
        stats += `🏆 Лучшая серия: ${habit.best_streak} дней\n`;
        stats += `✅ Выполнено: ${habit.completed_days}/${habit.total_days} дней (${completionRate}%)\n\n`;
      }

      const habitStatsKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('📊 Общая статистика'),
          Keyboard.button.message('📈 Недельный отчет')
        ],
        [
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: stats,
        keyboard: habitStatsKeyboard
      };
    } catch (error) {
      console.error('Error showing habit stats:', error);
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

      return {
        text: '❌ Произошла ошибка при загрузке статистики привычек.',
        keyboard: mainMenu
      };
    }
  }

  async showPomodoroStats(userId) {
    try {
      const stats = await this._getPomodoroStats(userId);
      
      let pomodoroStats = `🍅 **Статистика Pomodoro**\n\n`;
      pomodoroStats += `📅 **Сегодня:**\n`;
      pomodoroStats += `• Сессии: ${stats.todayCount}\n`;
      pomodoroStats += `• Время: ${stats.todayTime} мин\n\n`;
      pomodoroStats += `📈 **За неделю:**\n`;
      pomodoroStats += `• Сессии: ${stats.weekCount}\n`;
      pomodoroStats += `• Время: ${stats.weekTime} мин\n\n`;
      pomodoroStats += `🏆 **Всего:**\n`;
      pomodoroStats += `• Сессии: ${stats.totalCount}\n`;
      pomodoroStats += `• Время: ${stats.totalTime} мин\n\n`;
      pomodoroStats += `🎯 **Совет:** Старайтесь делать 4-8 помидорок в день для максимальной продуктивности!`;

      const pomodoroStatsKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('📊 Общая статистика'),
          Keyboard.button.message('📈 Недельный отчет')
        ],
        [
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: pomodoroStats,
        keyboard: pomodoroStatsKeyboard
      };

    } catch (error) {
      console.error('Error showing pomodoro stats:', error);
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

      return {
        text: '❌ Произошла ошибка при загрузке статистики Pomodoro.',
        keyboard: mainMenu
      };
    }
  }

  async showMoodStats(userId) {
    try {
      const stats = await this._getMoodStats(userId);
      
      let moodStats = `😊 **Статистика настроения**\n\n`;
      moodStats += `📊 **Общее:**\n`;
      moodStats += `• Среднее настроение: ${stats.average}/5\n`;
      moodStats += `• Всего записей: ${stats.totalEntries}\n\n`;
      
      if (stats.today) {
        moodStats += `📅 **Сегодня:**\n`;
        moodStats += `• Настроение: ${stats.today}\n\n`;
      }
      
      moodStats += `💡 **Рекомендация:** ${this._getMoodAdvice(parseFloat(stats.average))}`;

      const moodStatsKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('📊 Общая статистика'),
          Keyboard.button.message('📈 Недельный отчет')
        ],
        [
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: moodStats,
        keyboard: moodStatsKeyboard
      };

    } catch (error) {
      console.error('Error showing mood stats:', error);
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

      return {
        text: '❌ Произошла ошибка при загрузке статистики настроения.',
        keyboard: mainMenu
      };
    }
  }

  // Вспомогательные методы для сбора статистики (остаются без изменений)
  async _getTaskStats(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      totalCreated,
      active,
      totalCompleted,
      completedToday,
      recentCompleted
    ] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?', [userId]),
      db.get('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = FALSE', [userId]),
      db.get('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = TRUE', [userId]),
      db.get(`SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = TRUE 
              AND date(created_at) = ?`, [userId, today]),
      db.all(`SELECT title FROM tasks WHERE user_id = ? AND completed = TRUE 
              ORDER BY created_at DESC LIMIT 3`, [userId])
    ]);

    const completionRate = totalCreated.count > 0 
      ? Math.round((totalCompleted.count / totalCreated.count) * 100)
      : 0;

    return {
      totalCreated: totalCreated.count,
      active: active.count,
      totalCompleted: totalCompleted.count,
      completedToday: completedToday.count,
      completionRate,
      recentCompleted
    };
  }

  async _getHabitStats(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      totalHabits,
      completedToday,
      bestStreak
    ] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM habits WHERE user_id = ?', [userId]),
      db.get(`SELECT COUNT(*) as count FROM habit_checks hc
              JOIN habits h ON hc.habit_id = h.id
              WHERE h.user_id = ? AND hc.check_date = ? AND hc.completed = TRUE`, 
              [userId, today]),
      db.get(`SELECT MAX(best_streak) as streak FROM habits WHERE user_id = ?`, [userId])
    ]);

    return {
      total: totalHabits.count,
      completedToday: completedToday.count,
      bestStreak: bestStreak.streak || 0
    };
  }

  async _getPomodoroStats(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      todayStats,
      weekStats,
      totalStats
    ] = await Promise.all([
      db.get(`SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_time 
              FROM pomodoro_sessions 
              WHERE user_id = ? AND date(start_time) = ? AND completed = TRUE`, 
              [userId, today]),
      db.get(`SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_time 
              FROM pomodoro_sessions 
              WHERE user_id = ? AND date(start_time) >= date('now', '-7 days') AND completed = TRUE`, 
              [userId]),
      db.get(`SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_time 
              FROM pomodoro_sessions 
              WHERE user_id = ? AND completed = TRUE`, 
              [userId])
    ]);

    return {
      todayCount: todayStats.count,
      todayTime: Math.round(todayStats.total_time / 60),
      weekCount: weekStats.count,
      weekTime: Math.round(weekStats.total_time / 60),
      totalCount: totalStats.count,
      totalTime: Math.round(totalStats.total_time / 60)
    };
  }

  async _getMoodStats(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      todayMood,
      averageMood,
      totalEntries
    ] = await Promise.all([
      db.get(`SELECT mood_score, notes FROM moods 
              WHERE user_id = ? AND date(created_at) = ? 
              ORDER BY created_at DESC LIMIT 1`, [userId, today]),
      db.get('SELECT AVG(mood_score) as avg FROM moods WHERE user_id = ?', [userId]),
      db.get('SELECT COUNT(*) as count FROM moods WHERE user_id = ?', [userId])
    ]);

    return {
      today: todayMood ? `${todayMood.mood_score}/5 (${todayMood.notes})` : null,
      average: averageMood.avg ? parseFloat(averageMood.avg).toFixed(1) : '0.0',
      totalEntries: totalEntries.count
    };
  }

  _calculateProductivityScore(taskStats, habitStats, pomodoroStats) {
    let score = 0;
    
    if (taskStats.completedToday > 0) score += Math.min(taskStats.completedToday * 10, 40);
    if (habitStats.completedToday > 0) score += Math.min(habitStats.completedToday * 6, 30);
    if (pomodoroStats.todayCount > 0) score += Math.min(pomodoroStats.todayCount * 6, 30);
    
    return Math.min(score, 100);
  }

  _getTaskRecommendation(stats) {
    if (stats.completionRate >= 80) return 'Отличная работа! Продолжайте в том же темпе! 🎉';
    if (stats.completionRate >= 60) return 'Хорошие результаты! Может, поставить более конкретные цели?';
    if (stats.completionRate >= 40) return 'Старайтесь разбивать большие задачи на мелкие шаги.';
    return 'Начните с самых важных задач. Вы можете это сделать! 💪';
  }

  _getMoodAdvice(avgMood) {
    if (avgMood >= 4.5) return 'Продолжайте в том же духе! Ваше позитивное отношение вдохновляет!';
    if (avgMood >= 3.5) return 'Хороший баланс! Может, попробовать новое хобби для разнообразия?';
    if (avgMood >= 2.5) return 'Старайтесь находить маленькие радости в каждом дне.';
    return 'Помните, что можно всегда обратиться за поддержкой. Вы не одни!';
  }

  _getWeeklySummary(tasks, habits, pomodoro, mood) {
    const totalScore = (tasks.completionRate + habits.completionRate + (pomodoro.sessions * 10) + (parseFloat(mood.average) * 10)) / 4;
    
    if (totalScore >= 80) return 'Великолепная неделя! Вы на пике продуктивности! 🌟';
    if (totalScore >= 60) return 'Хорошая неделя! Есть к чему стремиться! 💪';
    if (totalScore >= 40) return 'Неплохая неделя! Небольшие улучшения приведут к большим результатам.';
    return 'Каждая неделя - новый шанс! Начните с маленьких шагов. 🚀';
  }

  async _getWeeklyTaskStats(userId, weekAgo) {
    const result = await db.get(
      `SELECT 
        COUNT(*) as created,
        SUM(CASE WHEN completed = TRUE THEN 1 ELSE 0 END) as completed
       FROM tasks 
       WHERE user_id = ? AND created_at >= ?`,
      [userId, weekAgo.toISOString()]
    );

    const completionRate = result.created > 0 
      ? Math.round((result.completed / result.created) * 100)
      : 0;

    return {
      created: result.created || 0,
      completed: result.completed || 0,
      completionRate
    };
  }

  async _getWeeklyHabitStats(userId, weekAgo) {
    const result = await db.get(
      `SELECT 
        COUNT(*) as total_checks,
        SUM(CASE WHEN hc.completed = TRUE THEN 1 ELSE 0 END) as completed_checks
       FROM habit_checks hc
       JOIN habits h ON hc.habit_id = h.id
       WHERE h.user_id = ? AND hc.check_date >= ?`,
      [userId, weekAgo.toISOString().split('T')[0]]
    );

    const completionRate = result.total_checks > 0 
      ? Math.round((result.completed_checks / result.total_checks) * 100)
      : 0;

    return {
      totalChecks: result.total_checks || 0,
      completedChecks: result.completed_checks || 0,
      completionRate
    };
  }

  async _getWeeklyPomodoroStats(userId, weekAgo) {
    const result = await db.get(
      `SELECT 
        COUNT(*) as sessions,
        COALESCE(SUM(duration), 0) as total_time
       FROM pomodoro_sessions 
       WHERE user_id = ? AND start_time >= ? AND completed = TRUE`,
      [userId, weekAgo.toISOString()]
    );

    return {
      sessions: result.sessions || 0,
      totalTime: Math.round(result.total_time / 60),
      dailyAverage: Math.round(result.total_time / 60 / 7)
    };
  }

  async _getWeeklyMoodStats(userId, weekAgo) {
    const result = await db.get(
      `SELECT 
        AVG(mood_score) as average,
        MAX(mood_score) as best_score
       FROM moods 
       WHERE user_id = ? AND created_at >= ?`,
      [userId, weekAgo.toISOString()]
    );

    const bestDay = result.best_score ? `${result.best_score}/5` : 'нет данных';
    const trend = result.average >= 4 ? '📈 Положительный' : result.average >= 3 ? '➡️ Стабильный' : '📉 Отрицательный';

    return {
      average: result.average ? parseFloat(result.average).toFixed(1) : '0.0',
      bestDay,
      trend
    };
  }
}

module.exports = new StatsHandler();