// flashcards.js - CRUD для карток
import { fetchWithAuth, showMessage } from './auth.js';

export async function fetchFlashcards() {
  try {
    const res = await fetchWithAuth('/.netlify/functions/flashcards');
    if (!res.ok) throw new Error('Помилка при завантаженні карток');
    const data = await res.json();
    updateList(Array.isArray(data) ? data : []);
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
  const res = await fetchWithAuth('/.netlify/functions/flashcards/' + id);
  const card = await res.json();
  // Отримати всі теми для select
  const topics = await fetchTopics();
  const editDiv = document.getElementById('page-edit');
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
  // Додаємо стилізацію для select (залишаємо як є, бо стилі вже додані в style.css)
  document.getElementById('editForm').onsubmit = async e => {
    e.preventDefault();
    const question = document.getElementById('editQ').value.trim();
    const answer = document.getElementById('editA').value.trim();
    const topicId = document.getElementById('editTopicSelect').value;
    if (!question || !answer || !topicId) return;
    await fetchWithAuth('/.netlify/functions/flashcards/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, topicId })
    });
    showPage('list');
  };
}

export async function deleteCard(id) {
  if (!confirm('Видалити цю картку?')) return;
  await fetchWithAuth('/.netlify/functions/flashcards/' + id, { method: 'DELETE' });
  showPage('list');
}

// --- Отримати всі теми користувача ---
export async function fetchTopics() {
  const res = await fetchWithAuth('/.netlify/functions/topics');
  if (!res.ok) return [];
  return await res.json();
}

// --- Додати/редагувати тему з кольором ---
export async function addTopic(name, color) {
  const res = await fetchWithAuth('/.netlify/functions/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color })
  });
  return res.ok;
}

export async function updateTopic(id, name, color) {
  const res = await fetchWithAuth('/.netlify/functions/topics', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, color })
  });
  return res.ok;
}
