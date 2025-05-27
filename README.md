[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/Om1zqYVh)

# Flashcard Generator (Lab 1-4)

Генератор флешкарток — це вебзастосунок для створення, організації та вивчення цифрових карток. Підтримує MongoDB, REST API, деплой на Netlify та GitHub Pages.

## Основна ідея
- Створення, редагування, видалення та перегляд флешкарток
- Організація карток у колоди (deckId)
- Простий сучасний інтерфейс (HTML+CSS+JS)
- Бекенд на Netlify Functions (Node.js), база — MongoDB (локально або Atlas)

## Як запустити локально

1. **Клонування репозиторію**
    ```bash
    git clone <посилання на репозиторій>
    cd FlashCardGen
    ```

2. **Встановлення залежностей**
    ```bash
    npm install
    ```

3. **Налаштування .env**
    - Створіть файл `.env` у корені проекту:
      ```
      MONGO_URI=mongodb://localhost:27017
      DB_NAME=flashcards
      ```
    - або для MongoDB Atlas:
      ```
      MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
      DB_NAME=flashcards
      ```

4. **Запуск локального сервера**
    ```bash
    netlify dev
    ```
    - Бекенд: http://localhost:8888/.netlify/functions/flashcards
    - Фронтенд: відкрийте `index.html` у браузері

## Як взаємодіяти
- Додавайте, редагуйте, видаляйте картки через інтерфейс
- Для роботи з колодами використовуйте поле `deckId` (можна фільтрувати GET /flashcards?deck=deckId)
- API підтримує всі CRUD-операції (GET, POST, PUT, DELETE)

## Деплой
- **Netlify**: імпортуйте репозиторій, вкажіть змінні середовища, build command: `npm install`, publish/functions directory: `functions`
- **GitHub Pages**: для фронтенду (index.html)

## Виконані завдання
- Реалізовано повний REST API для флешкарток
- Підключення до MongoDB (локально/Atlas) через .env
- CRUD-операції для карток, підтримка deckId (parent-child)
- Розширене оброблення помилок у API
- Простий фронтенд для взаємодії з API
- Деплой на Netlify (бекенд) та GitHub Pages (фронтенд)
- README з інструкціями та прикладами
