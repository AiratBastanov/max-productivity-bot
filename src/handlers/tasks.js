const db = require('../database');
const { tasksKeyboard } = require('../utils/keyboards');

class TasksHandler {
  async handleMessage(text, userId) {
    if (text.includes('новая') || text.includes('добав')) {
      return this.addTask(userId);
    } else if (text.includes('мои') || text.includes('список')) {
      return this.listTasks(userId);
    } else if (text.includes('выполн')) {
      return this.completeTask(text, userId);
    } else {
      return {
        text: '📝 **Управление задачами**\n\n• "Новая задача" - создать задачу\n• "Мои задачи" - посмотреть список\n• "Выполнил 1" - отметить выполнение',
        keyboard: tasksKeyboard
      };
    }
  }

  async addTask(userId) {
    return {
      text: '📝 Напишите название новой задачи:',
      keyboard: {
        buttons: [[{ text: 'Отмена' }]]
      },
      state: 'awaiting_task_title' // Состояние для следующего сообщения
    };
  }

  async listTasks(userId) {
    try {
      const tasks = await db.all(
        'SELECT * FROM tasks WHERE user_id = ? AND completed = FALSE ORDER BY created_at DESC',
        [userId]
      );

      if (tasks.length === 0) {
        return {
          text: '🎉 Отлично! У вас нет активных задач.',
          keyboard: tasksKeyboard
        };
      }

      let taskList = '📋 **Ваши активные задачи:**\n\n';
      tasks.forEach((task, index) => {
        const dueDate = task.due_date ? ` (до ${new Date(task.due_date).toLocaleDateString('ru-RU')})` : '';
        taskList += `${index + 1}. ${task.title}${dueDate}\n`;
      });

      taskList += '\nНапишите "Выполнил X" чтобы отметить задачу выполненной.';

      return {
        text: taskList,
        keyboard: tasksKeyboard
      };
    } catch (error) {
      console.error('Error listing tasks:', error);
      return {
        text: '❌ Произошла ошибка при загрузке задач.',
        keyboard: tasksKeyboard
      };
    }
  }

  async completeTask(text, userId) {
    const taskNumber = parseInt(text.match(/\d+/)?.[0]);
    
    if (!taskNumber) {
      return {
        text: '❌ Укажите номер задачи. Например: "Выполнил 1"',
        keyboard: tasksKeyboard
      };
    }

    try {
      const tasks = await db.all(
        'SELECT * FROM tasks WHERE user_id = ? AND completed = FALSE ORDER BY created_at DESC',
        [userId]
      );

      if (taskNumber < 1 || taskNumber > tasks.length) {
        return {
          text: `❌ Задача с номером ${taskNumber} не найдена.`,
          keyboard: tasksKeyboard
        };
      }

      const task = tasks[taskNumber - 1];
      await db.run(
        'UPDATE tasks SET completed = TRUE WHERE id = ?',
        [task.id]
      );

      return {
        text: `✅ Задача "${task.title}" выполнена! Отлично! 🎉`,
        keyboard: tasksKeyboard
      };
    } catch (error) {
      console.error('Error completing task:', error);
      return {
        text: '❌ Произошла ошибка при выполнении задачи.',
        keyboard: tasksKeyboard
      };
    }
  }

  async createTask(userId, title) {
    try {
      await db.run(
        'INSERT INTO tasks (user_id, title) VALUES (?, ?)',
        [userId, title]
      );

      return {
        text: `✅ Задача "${title}" создана!`,
        keyboard: tasksKeyboard
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return {
        text: '❌ Произошла ошибка при создании задачи.',
        keyboard: tasksKeyboard
      };
    }
  }
}

module.exports = new TasksHandler();