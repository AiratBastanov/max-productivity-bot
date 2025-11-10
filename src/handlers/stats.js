const db = require('../database');
const { mainMenu } = require('../utils/keyboards');

class StatsHandler {
  async handleMessage(text, userId) {
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

      // Задачи
      stats += `📝 **Задачи:**\n`;
      stats += `• Активные: ${taskStats.active}\n`;
      stats += `• Выполнено сегодня: ${taskStats.completedToday}\n`;
      stats += `• Всего выполнено: ${taskStats.totalCompleted}\n\n`;

      // Привычки
      stats += `🌱 **Привычки:**\n`;
      stats += `• Всего привычек: ${habitStats.total}\n`;
      stats += `• Выполнено сегодня: ${habitStats.completedToday}\n`;
      stats += `• Лучшая серия: ${habitStats.bestStreak} дней\n\n`;

      // Pomodoro
      stats += `🍅 **Pomodoro:**\n`;
      stats += `• Сегодня: ${pomodoroStats.todayCount} сессий\n`;
      stats += `• Всего времени: ${pomodoroStats.totalTime} мин\n`;
      stats += `• За неделю: ${pomodoroStats.weekCount} сессий\n\n`;

      // Настроение
      stats += `😊 **Настроение:**\n`;
      stats += `• Среднее: ${moodStats.average}/5\n`;
      stats += `• Сегодня: ${moodStats.today || 'не отмечено'}\n`;
      stats += `• Записей: ${moodStats.totalEntries}\n\n`;

      stats += `🎯 **Продуктивность сегодня:** ${this._calculateProductivityScore(taskStats, habitStats, pomodoroStats)}%`;

      return {
        text: stats,
        keyboard: {
          buttons: [
            [{ text: '📝 По задачам' }, { text: '🌱 По привычкам' }],
            [{ text: '🍅 По Pomodoro' }, { text: '😊 По настроению' }],
            [{ text: '📈 Недельный отчет' }, { text: '🎯 Главное меню' }]
          ]
        }
      };

    } catch (error) {
      console.error('Error showing overall stats:', error);
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

      return {
        text: weeklyReport,
        keyboard: {
          buttons: [
            [{ text: '📊 Общая статистика' }, { text: '📝 Детали по задачам' }],
            [{ text: '🎯 Главное меню' }]
          ]
        }
      };

    } catch (error) {
      console.error('Error showing weekly stats:', error);
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

      return {
        text: taskStats,
        keyboard: {
          buttons: [
            [{ text: '📊 Общая статистика' }, { text: '📈 Недельный отчет' }],
            [{ text: '🎯 Главное меню' }]
          ]
        }
      };

    } catch (error) {
      console.error('Error showing task stats:', error);
      return {
        text: '❌ Произошла ошибка при загрузке статистики задач.',
        keyboard: mainMenu
      };
    }
  }

  // Вспомогательные методы для сбора статистики
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
    
    // Задачи: максимум 40 баллов
    if (taskStats.completedToday > 0) score += Math.min(taskStats.completedToday * 10, 40);
    
    // Привычки: максимум 30 баллов
    if (habitStats.completedToday > 0) score += Math.min(habitStats.completedToday * 6, 30);
    
    // Pomodoro: максимум 30 баллов
    if (pomodoroStats.todayCount > 0) score += Math.min(pomodoroStats.todayCount * 6, 30);
    
    return Math.min(score, 100);
  }

  _getTaskRecommendation(stats) {
    if (stats.completionRate >= 80) return 'Отличная работа! Продолжайте в том же темпе! 🎉';
    if (stats.completionRate >= 60) return 'Хорошие результаты! Может, поставить более конкретные цели?';
    if (stats.completionRate >= 40) return 'Старайтесь разбивать большие задачи на мелкие шаги.';
    return 'Начните с самых важных задач. Вы можете это сделать! 💪';
  }

  _getWeeklySummary(tasks, habits, pomodoro, mood) {
    const totalScore = (tasks.completionRate + habits.completionRate + (pomodoro.sessions * 10) + (mood.average * 10)) / 4;
    
    if (totalScore >= 80) return 'Великолепная неделя! Вы на пике продуктивности! 🌟';
    if (totalScore >= 60) return 'Хорошая неделя! Есть к чему стремиться! 💪';
    if (totalScore >= 40) return 'Неплохая неделя! Небольшие улучшения приведут к большим результатам.';
    return 'Каждая неделя - новый шанс! Начните с маленьких шагов. 🚀';
  }

  // Методы для недельной статистики
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