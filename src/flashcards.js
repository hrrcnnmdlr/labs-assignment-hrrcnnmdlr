// flashcards.js - CRUD для карток
import { showMessage } from './auth.js';

export async function fetchFlashcards(filter = '', skip = 0, take = 100) {
  try {
    const query = `query($filter: String, $skip: Int, $take: Int) {\n  flashcards(filter: $filter, skip: $skip, take: $take) {\n    _id\n    question\n    answer\n    topicId\n    createdAt\n    updatedAt\n  }\n}`;
    const res = await window.queryGraphQL(query, { filter, skip, take });
    const cards = res.data && res.data.flashcards ? res.data.flashcards : [];
    updateList(cards);
  } catch (e) {
    document.getElementById('flashcards').innerHTML = '<span style="color:red">Не вдалося завантажити картки</span>';
  }
}

export function updateList(cards) {
  const container = document.getElementById('flashcards');
  container.innerHTML = '';
  if (!Array.isArray(cards) || !cards.length) {
    container.innerHTML = '<em>Немає карток</em>';
    return;
  }
  // Отримати всі теми для кольорів
  fetchTopics().then(topics => {
    cards.forEach(card => {
      const topic = topics.find(t => t._id === card.topicId);
      const color = topic && topic.color ? topic.color : '#e0eaff';
      const div = document.createElement('div');
      div.className = 'flashcard';
      div.style.background = color;
      div.innerHTML = `
        <div class="qa">
          <strong>Q:</strong> <span>${card.question || ''}</span><br>
          <strong>A:</strong> <span>${card.answer || ''}</span>
        </div>
        <div class="flashcard-actions">
          <button onclick="editCard('${card._id}')">✏️</button>
          <button onclick="deleteCard('${card._id}')">🗑️</button>
        </div>
      `;
      container.appendChild(div);
    });
  });
}

export async function editCard(id) {
  const query = `query($id: ID!) {\n  flashcard(id: $id) {\n    _id\n    question\n    answer\n    topicId\n  }\n  topics {\n    _id\n    name\n  }\n}`;
  const res = await window.queryGraphQL(query, { id });
  const card = res.data && res.data.flashcard ? res.data.flashcard : null;
  const topics = res.data && res.data.topics ? res.data.topics : [];
  const editDiv = document.getElementById('page-edit');
  if (!card) {
    editDiv.innerHTML = '<span style="color:red">Картку не знайдено</span>';
    return;
  }
  editDiv.innerHTML = `
    <h2>Редагувати картку</h2>
    <form id="editForm">
      <input type="text" id="editQ" value="${card.question || ''}" required />
      <input type="text" id="editA" value="${card.answer || ''}" required />
      <label>Тема:
        <select id="editTopicSelect">
          ${topics.map(t => `<option value="${t._id}"${card.topicId === t._id ? ' selected' : ''}>${t.name}</option>`).join('')}
        </select>
      </label>
      <button type="submit">Зберегти</button>
      <button type="button" onclick="showPage('list')">Скасувати</button>
    </form>
  `;
  showPage('edit');
  document.getElementById('editForm').onsubmit = async e => {
    e.preventDefault();
    const question = document.getElementById('editQ').value.trim();
    const answer = document.getElementById('editA').value.trim();
    const topicId = document.getElementById('editTopicSelect').value;
    if (!question || !answer || !topicId) return;
    const mutation = `mutation($id: ID!, $question: String!, $answer: String!, $topicId: ID!) {\n  updateFlashcard(id: $id, question: $question, answer: $answer, topicId: $topicId) {\n    _id\n  }\n}`;
    await window.queryGraphQL(mutation, { id, question, answer, topicId });
    showPage('list');
    fetchFlashcards();
  };
}

export async function deleteCard(id) {
  if (!confirm('Видалити цю картку?')) return;
  const mutation = `mutation($id: ID!) {\n  deleteFlashcard(id: $id)\n}`;
  await window.queryGraphQL(mutation, { id });
  showPage('list');
  fetchFlashcards();
}

// --- Всі запити до тем і карток — тільки через window.queryGraphQL (GraphQL endpoint) ---
export async function fetchTopics(filter = '', skip = 0, take = 100) {
  const query = `query($filter: String, $skip: Int, $take: Int) {\n  topics(filter: $filter, skip: $skip, take: $take) {\n    _id\n    name\n    color\n  }\n}`;
  const res = await window.queryGraphQL(query, { filter, skip, take });
  return res.data && res.data.topics ? res.data.topics : [];
}

export async function addTopic(name, color) {
  const mutation = `mutation($name: String!, $color: String) {\n  createTopic(name: $name, color: $color) {\n    _id\n  }\n}`;
  const res = await window.queryGraphQL(mutation, { name, color });
  return !!(res.data && res.data.createTopic && res.data.createTopic._id);
}

export async function updateTopic(id, name, color) {
  const mutation = `mutation($id: ID!, $name: String!, $color: String) {\n  updateTopic(id: $id, name: $name, color: $color) {\n    _id\n  }\n}`;
  const res = await window.queryGraphQL(mutation, { id, name, color });
  return !!(res.data && res.data.updateTopic && res.data.updateTopic._id);
}
