[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/Om1zqYVh)

# Генератор Флешкарток

## Опис
Сучасний генератор флешкарток із підтримкою тем, імпорту, тестування, пошуку, CRUD, профілю користувача. Весь функціонал працює через GraphQL endpoint (ApolloServer на Netlify Functions). Прямий доступ до БД і REST-запити не використовуються.

## Основні можливості
- **Авторизація, реєстрація, профіль** — через GraphQL (login, register, profile, updateProfile)
- **CRUD для тем і карток** — створення, редагування, видалення, кольори тем
- **Імпорт карток** з .txt/.json (автоматичне створення тем)
- **Тестування по темах** — вибір теми, випадковий порядок, підрахунок результату
- **Пошук** — окрема сторінка, пошук карток, тем, карток за темою питання
- **Редагування/видалення** карток і тем прямо з результатів пошуку
- **Сучасний UI** — уніфікований стиль кнопок, адаптивний дизайн
- **GraphQL endpoint** — стабільна робота на Netlify Functions (dev/production), підтримка фільтрації, сортування, skip/take

## Технології
- Frontend: Vanilla JS, CSS (сучасний стиль)
- Backend: Netlify Functions (Node.js), MongoDB, ApolloServer (GraphQL)

## Структура
- `src/` — фронтенд (main.js, flashcards.js, auth.js, style.css)
- `functions/` — бекенд (graphql.js, auth.js, db.js, flashcards.js, topics.js)
- `index.html` — структура сторінок
- `netlify.toml` — редіректи для GraphQL endpoint

## Запуск локально
1. Встановіть залежності: `npm install`
2. Запустіть Netlify Dev: `netlify dev`
3. Відкрийте [http://localhost:8888](http://localhost:8888)

## Приклади GraphQL-запитів
**Авторизація:**
```graphql
mutation { login(email: "test@test.com", password: "12345678") { token user { _id email nickname } } }
```
**Реєстрація:**
```graphql
mutation { register(email: "test2@test.com", password: "12345678", nickname: "Test") { token user { _id email nickname } } }
```
**Профіль:**
```graphql
query { profile { _id email nickname } }
```
**CRUD тем:**
```graphql
mutation { createTopic(name: "Математика", color: "#e0eaff") { _id name color } }
mutation { updateTopic(id: "...", name: "Math", color: "#ff0") { _id name color } }
mutation { deleteTopic(id: "...") }
```
**CRUD карток:**
```graphql
mutation { createFlashcard(question: "Q?", answer: "A", topicId: "...") { _id } }
mutation { updateFlashcard(id: "...", question: "Q2", answer: "A2", topicId: "...") { _id } }
mutation { deleteFlashcard(id: "...") }
```
**Пошук:**
```graphql
query { flashcards(filter: "слово", skip: 0, take: 100) { _id question answer topicId } }
query { topics(filter: "мат", skip: 0, take: 100) { _id name color } }
query { flashcards(topicName: "математика") { _id question answer topicId } }
```

## Додатково
- Весь фронтенд працює через window.queryGraphQL (жодного fetchWithAuth/REST)
- CRUD, імпорт, тестування, пошук — все через GraphQL
- Сучасний стиль кнопок у навігації, адаптивний дизайн
- README.md містить актуальні інструкції та приклади

## Автори
- Чайка Валерія Сергіївна ([hrrcnnmdlr](https://github.com/hrrcnnmdlr))
- Венгринюк Марія Михайлівна ([mriotte](https://github.com/mriotte))

---

**Зворотній зв'язок та побажання вітаються!**
