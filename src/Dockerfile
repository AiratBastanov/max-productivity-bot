FROM node:18-alpine

WORKDIR /app

# Устанавливаем зависимости для sqlite3 и других нативных модулей
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY . .

# Создаем директорию для базы данных (если будет файловая)
RUN mkdir -p /app/data

# Создаем непривилегированного пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Открываем порт
EXPOSE 3000

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3000

# Запускаем приложение
CMD ["npm", "start"]