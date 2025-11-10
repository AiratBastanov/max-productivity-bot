const axios = require('axios');

class MaxWebhookService {
  constructor() {
    this.token = 'f9LHodD0cOLRv2026hcJeiEfVp86_-YsOOTJiUUxUKBXxoOsjOwzpj6OumSK0XuISSFoSMrzhJlC_DMH6iQl';
    this.apiUrl = 'https://api.max.ru/v1';
  }

  // Отправка сообщения пользователю
  async sendMessage(userId, message, keyboard = null) {
    try {
      const payload = {
        user_id: userId,
        message: {
          text: message
        }
      };

      if (keyboard) {
        payload.message.keyboard = keyboard;
      }

      const response = await axios.post(`${this.apiUrl}/messages`, payload, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Message sent to MAX:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending message to MAX:', error.response?.data || error.message);
      throw error;
    }
  }

  // Установка вебхука
  async setWebhook(webhookUrl) {
    try {
      const response = await axios.post(`${this.apiUrl}/webhooks`, {
        url: webhookUrl,
        events: ['message_received']
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Webhook set successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error setting webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  // Удаление вебхука
  async deleteWebhook() {
    try {
      const response = await axios.delete(`${this.apiUrl}/webhooks`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      console.log('Webhook deleted successfully');
      return response.data;
    } catch (error) {
      console.error('Error deleting webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  // Получение информации о боте
  async getBotInfo() {
    try {
      const response = await axios.get(`${this.apiUrl}/bots/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      console.log('Bot info:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting bot info:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new MaxWebhookService();