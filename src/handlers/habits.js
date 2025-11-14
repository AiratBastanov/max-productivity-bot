const db = require('../database');
const { Keyboard } = require('@maxhub/max-bot-api');
const { setUserState } = require('../index');

class HabitsHandler {
  async handleMessage(text, userId) {
    const habitsKeyboard = Keyboard.inlineKeyboard([
      [
        Keyboard.button.message('🌱 Новая привычка'),
        Keyboard.button.message('📊 Мои привычки')
      ],
      [
        Keyboard.button.message('✅ Отметить выполнение'),
        Keyboard.button.message('🎯 Главное меню')
      ]
    ]);

    if (text.includes('новая') || text.includes('добав')) {
      return this.addHabit(userId);
    } else if (text.includes('мои') || text.includes('список')) {
      return this.listHabits(userId);
    } else if (text.includes('отмет') || text.includes('выполн')) {
      return this.markHabitComplete(text, userId);
    } else if (text.includes('статистика') || text.includes('прогресс')) {
      return this.showHabitStats(userId);
    } else {
      return {
        text: '🌱 **Трекер привычек**\n\n• "Новая привычка" - создать привычку\n• "Мои привычки" - посмотреть список\n• "Отметить выполнение" - отметить сегодняшнее выполнение\n• "Статистика" - посмотреть прогресс',
        keyboard: habitsKeyboard
      };
    }
  }

  async addHabit(userId) {
    setUserState(userId, 'awaiting_habit_name');
    
    const cancelKeyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.message('Отмена')]
    ]);

    return {
      text: '🌱 Напишите название новой привычки:',
      keyboard: cancelKeyboard
    };
  }

  async createHabit(userId, name) {
    try {
      await db.run(
        'INSERT INTO habits (user_id, name) VALUES (?, ?)',
        [userId, name]
      );

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
        text: `✅ Привычка "${name}" создана! Отмечайте выполнение каждый день.`,
        keyboard: habitsKeyboard
      };
    } catch (error) {
      console.error('Error creating habit:', error);
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
        text: '❌ Произошла ошибка при создании привычки.',
        keyboard: habitsKeyboard
      };
    }
  }

  async listHabits(userId) {
    try {
      const habits = await db.all(
        `SELECT h.*, 
         COUNT(hc.id) as total_checks,
         SUM(CASE WHEN hc.completed = 1 THEN 1 ELSE 0 END) as completed_checks
         FROM habits h
         LEFT JOIN habit_checks hc ON h.id = hc.habit_id
         WHERE h.user_id = ?
         GROUP BY h.id
         ORDER BY h.current_streak DESC`,
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
          text: '📝 У вас пока нет привычек. Создайте первую!',
          keyboard: habitsKeyboard
        };
      }

      let habitList = '🌱 **Ваши привычки:**\n\n';
      const today = new Date().toISOString().split('T')[0];

      for (let habit of habits) {
        const todayCheck = await db.get(
          'SELECT * FROM habit_checks WHERE habit_id = ? AND check_date = ?',
          [habit.id, today]
        );

        const status = todayCheck ? (todayCheck.completed ? '✅' : '❌') : '⏳';
        const streak = habit.current_streak > 0 ? ` 🔥 ${habit.current_streak}д` : '';

        habitList += `${status} ${habit.name}${streak}\n`;
      }

      habitList += '\nНажмите "Отметить выполнение" чтобы отметить привычки на сегодня.';

      const habitsKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('🌱 Новая привычка'),
          Keyboard.button.message('📊 Мои привычки')
        ],
        [
          Keyboard.button.message('✅ Отметить выполнение'),
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: habitList,
        keyboard: habitsKeyboard
      };
    } catch (error) {
      console.error('Error listing habits:', error);
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
        text: '❌ Произошла ошибка при загрузке привычек.',
        keyboard: habitsKeyboard
      };
    }
  }

  async markHabitComplete(text, userId) {
    try {
      const habits = await db.all(
        'SELECT * FROM habits WHERE user_id = ?',
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
          text: '❌ У вас нет привычек для отметки.',
          keyboard: habitsKeyboard
        };
      }

      const today = new Date().toISOString().split('T')[0];

      if (text !== 'отметить выполнение') {
        const habitName = text.replace('отметить', '').replace('выполнение', '').trim();
        const habit = habits.find(h => 
          h.name.toLowerCase().includes(habitName.toLowerCase())
        );

        if (habit) {
          await this._markHabitAsCompleted(habit.id, today);
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
            text: `✅ Привычка "${habit.name}" отмечена как выполненная сегодня!`,
            keyboard: habitsKeyboard
          };
        }
      }

      // Создаем кнопки для каждой привычки
      const habitButtons = habits.map(habit => [
        Keyboard.button.message(`✅ ${habit.name}`)
      ]);

      const selectionKeyboard = Keyboard.inlineKeyboard([
        ...habitButtons,
        [
          Keyboard.button.message('✅ Отметить все'),
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      setUserState(userId, 'awaiting_habit_selection');

      return {
        text: `📋 **Отметить выполнение привычек**\n\nВыберите привычку для отметки:`,
        keyboard: selectionKeyboard
      };

    } catch (error) {
      console.error('Error marking habit complete:', error);
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
        text: '❌ Произошла ошибка при отметке привычки.',
        keyboard: habitsKeyboard
      };
    }
  }

  async _markHabitAsCompleted(habitId, date) {
    const existingCheck = await db.get(
      'SELECT * FROM habit_checks WHERE habit_id = ? AND check_date = ?',
      [habitId, date]
    );

    if (existingCheck) {
      await db.run(
        'UPDATE habit_checks SET completed = TRUE WHERE id = ?',
        [existingCheck.id]
      );
    } else {
      await db.run(
        'INSERT INTO habit_checks (habit_id, check_date, completed) VALUES (?, ?, TRUE)',
        [habitId, date]
      );
    }

    await this._updateHabitStreak(habitId);
  }

  async _updateHabitStreak(habitId) {
    const checks = await db.all(
      `SELECT check_date, completed 
       FROM habit_checks 
       WHERE habit_id = ? 
       AND check_date >= date('now', '-30 days')
       ORDER BY check_date DESC`,
      [habitId]
    );

    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let check of checks) {
      if (check.completed) {
        currentStreak++;
      } else {
        break;
      }
    }

    const habit = await db.get('SELECT * FROM habits WHERE id = ?', [habitId]);
    const bestStreak = Math.max(habit.best_streak, currentStreak);

    await db.run(
      'UPDATE habits SET current_streak = ?, best_streak = ? WHERE id = ?',
      [currentStreak, bestStreak, habitId]
    );
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
        text: stats,
        keyboard: habitsKeyboard
      };
    } catch (error) {
      console.error('Error showing habit stats:', error);
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
        text: '❌ Произошла ошибка при загрузке статистики.',
        keyboard: habitsKeyboard
      };
    }
  }

  async handleHabitSelection(userId, habitName) {
    try {
      const habit = await db.get(
        'SELECT * FROM habits WHERE user_id = ? AND name LIKE ?',
        [userId, `%${habitName}%`]
      );

      if (!habit) {
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
          text: '❌ Привычка не найдена.',
          keyboard: habitsKeyboard
        };
      }

      const today = new Date().toISOString().split('T')[0];
      await this._markHabitAsCompleted(habit.id, today);

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
        text: `✅ Привычка "${habit.name}" отмечена как выполненная! Текущая серия: ${habit.current_streak + 1} дней 🔥`,
        keyboard: habitsKeyboard
      };
    } catch (error) {
      console.error('Error handling habit selection:', error);
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
        text: '❌ Произошла ошибка при отметке привычки.',
        keyboard: habitsKeyboard
      };
    }
  }

  async markAllHabitsComplete(userId) {
    try {
      const habits = await db.all(
        'SELECT * FROM habits WHERE user_id = ?',
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
          text: '❌ У вас нет привычек для отметки.',
          keyboard: habitsKeyboard
        };
      }

      const today = new Date().toISOString().split('T')[0];
      let markedCount = 0;

      for (let habit of habits) {
        await this._markHabitAsCompleted(habit.id, today);
        markedCount++;
      }

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
        text: `✅ Все ${markedCount} привычек отмечены как выполненные сегодня! 🎉`,
        keyboard: habitsKeyboard
      };
    } catch (error) {
      console.error('Error marking all habits complete:', error);
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
        text: '❌ Произошла ошибка при отметке привычек.',
        keyboard: habitsKeyboard
      };
    }
  }
}

module.exports = new HabitsHandler();