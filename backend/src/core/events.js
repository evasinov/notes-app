// Простая, но мощная шина событий
// Позволяет модулям общаться, не зная друг о друге

class EventBus {
  constructor() {
    this.listeners = {};
  }

  // Подписаться на событие
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    console.log(`[EventBus] Подписка на "${event}"`);
  }

  // Отправить событие
  emit(event, data) {
    console.log(`[EventBus] Событие "${event}" отправлено`);
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        callback(data);
      });
    }
  }
}

// Экспортируем один экземпляр (синглтон), чтобы все модули использовали его
export default new EventBus();

