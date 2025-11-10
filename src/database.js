const sqlite3 = require('sqlite3').verbose();

class Database {
  constructor() {
    this.db = new sqlite3.Database(':memory:');
    this.init();
  }

  init() {
    this.db.serialize(() => {
      // Задачи
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          title TEXT NOT NULL,
          description TEXT,
          due_date DATETIME,
          completed BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Привычки
      this.db.run(`
        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          name TEXT NOT NULL,
          frequency TEXT DEFAULT 'daily',
          current_streak INTEGER DEFAULT 0,
          best_streak INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Отметки привычек
      this.db.run(`
        CREATE TABLE IF NOT EXISTS habit_checks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habit_id INTEGER,
          check_date DATE,
          completed BOOLEAN,
          FOREIGN KEY(habit_id) REFERENCES habits(id)
        )
      `);

      // Настроения
      this.db.run(`
        CREATE TABLE IF NOT EXISTS moods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          mood_score INTEGER CHECK(mood_score >= 1 AND mood_score <= 5),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Pomodoro сессии
      this.db.run(`
        CREATE TABLE IF NOT EXISTS pomodoro_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          duration INTEGER,
          completed BOOLEAN DEFAULT FALSE,
          start_time DATETIME,
          end_time DATETIME
        )
      `);
    });
  }

  // Общие методы для работы с БД
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = new Database();