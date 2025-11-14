const db = require('../database');
const { Keyboard } = require('@maxhub/max-bot-api');
const { setUserState } = require('../index');

class MoodHandler {
  async handleMessage(text, userId) {
    const moodKeyboard = Keyboard.inlineKeyboard([
      [
        Keyboard.button.message('😊 Отлично'),
        Keyboard.button.message('😐 Нормально'),
        Keyboard.button.message('😔 Плохо')
      ],
      [
        Keyboard.button.message('📈 История'),
        Keyboard.button.message('🎯 Главное меню')
      ]
    ]);

    if (text.includes('отлично') || text.includes('😊')) {
      return this.recordMood(userId, 5, 'Отлично');
    } else if (text.includes('нормально') || text.includes('😐')) {
      return this.recordMood(userId, 3, 'Нормально');
    } else if (text.includes('плохо') || text.includes('😔')) {
      return this.recordMood(userId, 1, 'Плохо');
    } else if (text.includes('хорошо') || text.includes('🙂')) {
      return this.recordMood(userId, 4, 'Хорошо');
    } else if (text.includes('ужасно') || text.includes('😞')) {
      return this.recordMood(userId, 2, 'Не очень');
    } else if (text.includes('истори') || text.includes('график')) {
      return this.showMoodHistory(userId);
    } else if (text.includes('анализ') || text.includes('тренд')) {
      return this.showMoodAnalysis(userId);
    } else {
      return {
        text: '😊 **Трекер настроения**\n\nКак вы себя чувствуете сегодня?',
        keyboard: moodKeyboard
      };
    }
  }

  async recordMood(userId, score, moodText) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const existingMood = await db.get(
        'SELECT * FROM moods WHERE user_id = ? AND date(created_at) = ?',
        [userId, today]
      );

      if (existingMood) {
        await db.run(
          'UPDATE moods SET mood_score = ?, notes = ? WHERE id = ?',
          [score, `${moodText} (обновлено)`, existingMood.id]
        );
      } else {
        await db.run(
          'INSERT INTO moods (user_id, mood_score, notes) VALUES (?, ?, ?)',
          [userId, score, moodText]
        );
      }

      const response = this._getMoodResponse(score, moodText);
      
      const moodStatsKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('📈 История настроения'),
          Keyboard.button.message('📊 Анализ трендов')
        ],
        [
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: response,
        keyboard: moodStatsKeyboard
      };

    } catch (error) {
      console.error('Error recording mood:', error);
      const moodKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('😊 Отлично'),
          Keyboard.button.message('😐 Нормально'),
          Keyboard.button.message('😔 Плохо')
        ],
        [
          Keyboard.button.message('📈 История'),
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: '❌ Произошла ошибка при сохранении настроения.',
        keyboard: moodKeyboard
      };
    }
  }

  _getMoodResponse(score, moodText) {
    const responses = {
      5: `🎉 **Отлично!** ${moodText}\n\nЗамечательно! Поделитесь своим секретом хорошего настроения? ✨`,
      4: `😊 **Хорошо!** ${moodText}\n\nОтличный день продолжается! 🌞`,
      3: `😐 **Нормально** ${moodText}\n\nСтабильность - это хорошо! Может, сделать что-то приятное? ☕`,
      2: `😔 **Не очень** ${moodText}\n\nНадеюсь, день станет лучше! Помните, это временно. 💫`,
      1: `💔 **Плохо** ${moodText}\n\nМожет, прогуляться или поговорить с кем-то? Вы не одни. 🤗`
    };

    return responses[score] || `Настроение: ${moodText}`;
  }

  async showMoodHistory(userId) {
    try {
      const moods = await db.all(
        `SELECT * FROM moods 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 14`,
        [userId]
      );

      if (moods.length === 0) {
        const moodKeyboard = Keyboard.inlineKeyboard([
          [
            Keyboard.button.message('😊 Отлично'),
            Keyboard.button.message('😐 Нормально'),
            Keyboard.button.message('😔 Плохо')
          ],
          [
            Keyboard.button.message('📈 История'),
            Keyboard.button.message('🎯 Главное меню')
          ]
        ]);

        return {
          text: '📝 У вас пока нет записей о настроении.\n\nНачните отслеживать своё настроение!',
          keyboard: moodKeyboard
        };
      }

      let history = '📈 **История настроения (последние 14 дней):**\n\n';
      
      moods.forEach(mood => {
        const date = new Date(mood.created_at).toLocaleDateString('ru-RU');
        const moodEmoji = this._getMoodEmoji(mood.mood_score);
        history += `${date}: ${moodEmoji} ${mood.notes}\n`;
      });

      const avgMood = await this._calculateAverageMood(userId);
      history += `\n📊 Среднее настроение: ${avgMood.toFixed(1)}/5 ${this._getMoodEmoji(Math.round(avgMood))}`;

      const historyKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('📊 Подробный анализ'),
          Keyboard.button.message('😊 Отметить настроение')
        ],
        [
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: history,
        keyboard: historyKeyboard
      };

    } catch (error) {
      console.error('Error showing mood history:', error);
      const moodKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('😊 Отлично'),
          Keyboard.button.message('😐 Нормально'),
          Keyboard.button.message('😔 Плохо')
        ],
        [
          Keyboard.button.message('📈 История'),
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: '❌ Произошла ошибка при загрузке истории настроения.',
        keyboard: moodKeyboard
      };
    }
  }

  async showMoodAnalysis(userId) {
    try {
      const moodStats = await db.all(
        `SELECT 
          mood_score,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM moods WHERE user_id = ?), 1) as percentage
         FROM moods 
         WHERE user_id = ?
         GROUP BY mood_score
         ORDER BY mood_score DESC`,
        [userId, userId]
      );

      if (moodStats.length === 0) {
        const moodKeyboard = Keyboard.inlineKeyboard([
          [
            Keyboard.button.message('😊 Отлично'),
            Keyboard.button.message('😐 Нормально'),
            Keyboard.button.message('😔 Плохо')
          ],
          [
            Keyboard.button.message('📈 История'),
            Keyboard.button.message('🎯 Главное меню')
          ]
        ]);

        return {
          text: '📊 Нет данных для анализа.\n\nНачните отслеживать настроение!',
          keyboard: moodKeyboard
        };
      }

      let analysis = '📊 **Анализ настроения:**\n\n';

      moodStats.forEach(stat => {
        const emoji = this._getMoodEmoji(stat.mood_score);
        const label = this._getMoodLabel(stat.mood_score);
        const bar = '█'.repeat(Math.round(stat.percentage / 5));
        
        analysis += `${emoji} ${label}: ${bar} ${stat.percentage}% (${stat.count} раз)\n`;
      });

      const avgMood = await this._calculateAverageMood(userId);
      const bestStreak = await this._calculateBestMoodStreak(userId);
      
      analysis += `\n📈 **Статистика:**\n`;
      analysis += `• Среднее настроение: ${avgMood.toFixed(1)}/5\n`;
      analysis += `• Лучшая серия хороших дней: ${bestStreak} дней\n`;
      analysis += `• Всего записей: ${moodStats.reduce((sum, stat) => sum + stat.count, 0)}\n\n`;
      analysis += `💡 **Совет:** ${this._getMoodAdvice(avgMood)}`;

      const analysisKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('📈 История'),
          Keyboard.button.message('😊 Отметить сегодня')
        ],
        [
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: analysis,
        keyboard: analysisKeyboard
      };

    } catch (error) {
      console.error('Error showing mood analysis:', error);
      const moodKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('😊 Отлично'),
          Keyboard.button.message('😐 Нормально'),
          Keyboard.button.message('😔 Плохо')
        ],
        [
          Keyboard.button.message('📈 История'),
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: '❌ Произошла ошибка при анализе настроения.',
        keyboard: moodKeyboard
      };
    }
  }

  async _calculateAverageMood(userId) {
    const result = await db.get(
      'SELECT AVG(mood_score) as avg_mood FROM moods WHERE user_id = ?',
      [userId]
    );
    return result.avg_mood || 0;
  }

  async _calculateBestMoodStreak(userId) {
    const moods = await db.all(
      `SELECT created_at, mood_score 
       FROM moods 
       WHERE user_id = ? 
       ORDER BY created_at ASC`,
      [userId]
    );

    let currentStreak = 0;
    let bestStreak = 0;

    for (let mood of moods) {
      if (mood.mood_score >= 4) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return bestStreak;
  }

  _getMoodEmoji(score) {
    const emojis = {
      1: '💔',
      2: '😔', 
      3: '😐',
      4: '😊',
      5: '🎉'
    };
    return emojis[score] || '❓';
  }

  _getMoodLabel(score) {
    const labels = {
      1: 'Плохо',
      2: 'Не очень',
      3: 'Нормально', 
      4: 'Хорошо',
      5: 'Отлично'
    };
    return labels[score] || 'Неизвестно';
  }

  _getMoodAdvice(avgMood) {
    if (avgMood >= 4.5) return 'Продолжайте в том же духе! Ваше позитивное отношение вдохновляет!';
    if (avgMood >= 3.5) return 'Хороший баланс! Может, попробовать новое хобби для разнообразия?';
    if (avgMood >= 2.5) return 'Старайтесь находить маленькие радости в каждом дне.';
    return 'Помните, что можно всегда обратиться за поддержкой. Вы не одни!';
  }

  async recordMoodWithNote(userId, score, moodText) {
    setUserState(userId, 'awaiting_mood_note', { moodScore: score, moodText });
    
    const noteKeyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.message('Пропустить')],
      [Keyboard.button.message('🎯 Главное меню')]
    ]);

    return {
      text: `📝 **${moodText}**\n\nХотите добавить заметку о своём настроении? (или напишите "пропустить")`,
      keyboard: noteKeyboard
    };
  }

  async saveMoodWithNote(userId, score, note) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (note.toLowerCase() === 'пропустить') {
        note = '';
      }

      const existingMood = await db.get(
        'SELECT * FROM moods WHERE user_id = ? AND date(created_at) = ?',
        [userId, today]
      );

      if (existingMood) {
        await db.run(
          'UPDATE moods SET mood_score = ?, notes = ? WHERE id = ?',
          [score, note || 'Без заметки', existingMood.id]
        );
      } else {
        await db.run(
          'INSERT INTO moods (user_id, mood_score, notes) VALUES (?, ?, ?)',
          [userId, score, note || 'Без заметки']
        );
      }

      const moodKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('😊 Отлично'),
          Keyboard.button.message('😐 Нормально'),
          Keyboard.button.message('😔 Плохо')
        ],
        [
          Keyboard.button.message('📈 История'),
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: `✅ Настроение сохранено! ${note ? `Заметка: "${note}"` : ''}`,
        keyboard: moodKeyboard
      };

    } catch (error) {
      console.error('Error saving mood with note:', error);
      const moodKeyboard = Keyboard.inlineKeyboard([
        [
          Keyboard.button.message('😊 Отлично'),
          Keyboard.button.message('😐 Нормально'),
          Keyboard.button.message('😔 Плохо')
        ],
        [
          Keyboard.button.message('📈 История'),
          Keyboard.button.message('🎯 Главное меню')
        ]
      ]);

      return {
        text: '❌ Произошла ошибка при сохранении настроения.',
        keyboard: moodKeyboard
      };
    }
  }
}

module.exports = new MoodHandler();