// main.js - логіка навігації та сторінок
import { showMessage, setAuthUI, getToken, fetchWithAuth, loadProfile, showLogin, showRegister, logout } from './auth.js';
import { fetchFlashcards, updateList, editCard, deleteCard, fetchTopics, addTopic, updateTopic } from './flashcards.js';

window.showPage = function(page) {
  // Ховаємо всі сторінки
  document.querySelectorAll('.page').forEach(el => el.style.display = 'none');
  // Показуємо потрібну
  const el = document.getElementById('page-' + page);
  if (el) el.style.display = '';
  // Додаткові дії
  if (page === 'list') fetchFlashcards();
  if (page === 'add') {
    document.getElementById('addForm').reset();
    initTopicSelect();
  }
  if (page === 'profile') loadProfile();
  if (page === 'test') initTestPage();
};

// Початковий показ сторінки
if (getToken()) {
  setAuthUI();
  showPage('list');
} else {
  setAuthUI();
  showLogin();
}

// --- ТЕМИ: ініціалізація вибору теми у формі додавання картки ---
async function initTopicSelect() {
  const topics = await fetchTopics();
  const select = document.getElementById('topicSelect');
  const prev = select.value;
  select.innerHTML = '';
  topics.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t._id;
    opt.textContent = t.name;
    opt.style.background = t.color || '#e0eaff';
    select.appendChild(opt);
  });
  // Відновити попередній вибір, якщо можливо
  if (prev && topics.find(t => t._id === prev)) select.value = prev;
}

if (document.getElementById('addTopicBtn')) {
  document.getElementById('addTopicBtn').onclick = () => {
    document.getElementById('newTopicModal').style.display = 'block';
    document.getElementById('newTopicInput').value = '';
    document.getElementById('newTopicColor').value = '#e0eaff';
  };
  // Зберігаємо тему та оновлюємо select без перезавантаження
  document.getElementById('saveTopicBtn').onclick = async () => {
    const name = document.getElementById('newTopicInput').value.trim();
    const color = document.getElementById('newTopicColor').value;
    if (!name) return;
    const ok = await addTopic(name, color);
    if (ok) {
      showMessage('Тему додано!', 'success');
      document.getElementById('newTopicModal').style.display = 'none';
      // Оновлюємо select
      const topics = await fetchTopics();
      const select = document.getElementById('topicSelect');
      select.innerHTML = topics.map(t => 
        `<option value="${t._id}" style="background:${t.color || '#e0eaff'}">${t.name}</option>`
      ).join('');
      // Вибираємо нову тему
      const newTopic = topics.find(t => t.name === name);
      if (newTopic) select.value = newTopic._id;
    } else {
      showMessage('Не вдалося додати тему', 'error');
    }
  };
}

if (document.getElementById('topicSelect')) {
  initTopicSelect();
}

// --- Додавання картки з темою ---
const addForm = document.getElementById('addForm');
if (addForm) {
  addForm.onsubmit = async e => {
    e.preventDefault();
    const question = document.getElementById('question').value.trim();
    const answer = document.getElementById('answer').value.trim();
    const topicId = document.getElementById('topicSelect').value;
    if (!question || !answer || !topicId) return;
    const res = await fetchWithAuth('/.netlify/functions/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, topicId })
    });
    if (res.ok) {
      showMessage('Картку додано!', 'success');
      showPage('list');
    } else {
      showMessage('Помилка додавання картки', 'error');
    }
  };
}

// --- ТЕСТУВАННЯ ПО ТЕМАХ ---
async function initTestPage() {
  const topics = await fetchTopics();
  const select = document.getElementById('testTopicSelect');
  select.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'Всі теми';
  select.appendChild(allOpt);
  topics.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t._id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });
  document.getElementById('testBlock').style.display = 'none';
  document.getElementById('testStats').innerHTML = '';
}

let testCards = [], testIndex = 0, testScore = 0, testWrong = 0;

if (document.getElementById('testTopicForm')) {
  document.getElementById('testTopicForm').onsubmit = async e => {
    e.preventDefault();
    const topicId = document.getElementById('testTopicSelect').value;
    // Отримати картки по темі
    const res = await fetchWithAuth('/.netlify/functions/flashcards');
    const all = await res.json();
    testCards = topicId === 'all' ? all : all.filter(c => c.topicId === topicId);
    if (!testCards.length) {
      document.getElementById('testBlock').style.display = 'none';
      document.getElementById('testStats').innerHTML = '<span style="color:red">Немає карток для цієї теми</span>';
      return;
    }
    // Перемішати
    testCards = testCards.sort(() => Math.random() - 0.5);
    testIndex = 0; testScore = 0; testWrong = 0;
    showTestCard();
  };
}

function showTestCard() {
  const block = document.getElementById('testBlock');
  fetchTopics().then(topics => {
    const topic = topics.find(t => t._id === testCards[testIndex].topicId);
    const color = topic && topic.color ? topic.color : '#e0eaff';
    block.innerHTML = `
      <div class="test-card" id="testCard" style="background:${color}">
        <div class="test-card-inner" id="testCardInner">
          <div class="test-card-front" style="background:${color}"><strong>Q:</strong> ${testCards[testIndex].question}</div>
          <div class="test-card-back"><strong>A:</strong> ${testCards[testIndex].answer}</div>
        </div>
      </div>
      <div id="testActions" style="display:none;">
        <button id="testCorrectBtn">Вгадав</button>
        <button id="testWrongBtn">Не вгадав</button>
      </div>
      <div id="testStats"></div>
    `;
    const card = document.getElementById('testCard');
    card.onclick = () => {
      card.classList.add('flipped');
      document.getElementById('testActions').style.display = 'flex';
    };
    document.getElementById('testCorrectBtn').onclick = () => {
      testScore++;
      nextTestCard();
    };
    document.getElementById('testWrongBtn').onclick = () => {
      testWrong++;
      nextTestCard();
    };
  });
  block.style.display = '';
}

function nextTestCard() {
  testIndex++;
  if (testIndex >= testCards.length) {
    const percent = Math.round((testScore / testCards.length) * 100);
    document.getElementById('testBlock').innerHTML = `<div id="testStats"><b>Тест завершено!</b><br>Вірно: ${testScore} / ${testCards.length}<br>Невірно: ${testWrong}<br>Відсоток: ${percent}%</div>`;
  } else {
    showTestCard();
  }
}

// --- КНОПКА ПЕРЕХОДУ ДО ТЕСТУВАННЯ ---
if (document.getElementById('goToTestBtn')) {
  document.getElementById('goToTestBtn').onclick = () => showPage('test');
}

// --- Імпорт карток з тексту/JSON ---
window.importFlashcards = async function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.json';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    let cards = [];
    if (file.name.endsWith('.json')) {
      try {
        const arr = JSON.parse(text);
        if (Array.isArray(arr)) {
          cards = arr.map(obj => ({
            question: obj.q || obj.question,
            answer: obj.a || obj.answer,
            topic: obj.topic || ''
          }));
        }
      } catch {}
    } else {
      // Текстовий формат: q: ...\na: ...\ntopic: ...\n---
      const blocks = text.split(/\n-{2,}\n/);
      for (const block of blocks) {
        const q = block.match(/q:\s*(.+)/i);
        const a = block.match(/a:\s*(.+)/i);
        const t = block.match(/topic:\s*(.+)/i);
        if (q && a) {
          cards.push({
            question: q[1].trim(),
            answer: a[1].trim(),
            topic: t ? t[1].trim() : ''
          });
        }
      }
    }
    if (!cards.length) {
      showMessage('Не знайдено жодної картки у файлі', 'error');
      return;
    }
    // Отримати всі теми
    const topics = await fetchTopics();
    // Додати нові теми, якщо треба
    for (const card of cards) {
      if (card.topic && !topics.find(t => t.name === card.topic)) {
        await addTopic(card.topic);
      }
    }
    const topicsNow = await fetchTopics();
    // Додаємо картки
    for (const card of cards) {
      const topicObj = topicsNow.find(t => t.name === card.topic) || topicsNow[0];
      await fetchWithAuth('/.netlify/functions/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: card.question,
          answer: card.answer,
          topicId: topicObj._id
        })
      });
    }
    showMessage('Картки імпортовано!', 'success');
    showPage('list');
  };
  input.click();
};
// Додаємо кнопку імпорту на сторінку всіх карток
if (document.getElementById('importBtn') === null && document.getElementById('page-list')) {
  const btn = document.createElement('button');
  btn.id = 'importBtn';
  btn.textContent = 'Імпорт карток (.txt/.json)';
  btn.style.marginRight = '12px';
  btn.onclick = () => window.importFlashcards();
  document.getElementById('page-list').insertBefore(btn, document.getElementById('flashcards'));
}

// --- UI для створення/редагування теми з кольором ---
async function showTopicEditor(topic = null) {
  const block = document.getElementById('topic-block-form');
  block.innerHTML = `
    <label>Назва теми:
      <input id="topicNameInput" type="text" value="${topic ? topic.name : ''}" required />
    </label>
    <label>Колір теми:
      <input id="topicColorInput" type="color" value="${topic && topic.color ? topic.color : '#e0eaff'}" />
    </label>
    <button id="saveTopicBtn2">${topic ? 'Зберегти зміни' : 'Додати тему'}</button>
    <button id="cancelTopicBtn" type="button">Скасувати</button>
  `;
  document.getElementById('saveTopicBtn2').onclick = async () => {
    const name = document.getElementById('topicNameInput').value.trim();
    const color = document.getElementById('topicColorInput').value;
    if (!name) return;
    if (topic) {
      await updateTopic(topic._id, name, color);
    } else {
      await addTopic(name, color);
    }
    await initTopicSelect();
    block.innerHTML = '';
  };
  document.getElementById('cancelTopicBtn').onclick = () => {
    block.innerHTML = '';
  };
}

// --- Додаємо кнопку для створення теми з кольором ---
if (document.getElementById('addTopicBtn')) {
  document.getElementById('addTopicBtn').onclick = () => showTopicEditor();
}

// --- Окрема форма для створення теми ---
if (document.getElementById('addTopicPage')) {
  const addTopicForm = document.getElementById('addTopicForm');
  addTopicForm.onsubmit = async e => {
    e.preventDefault();
    const name = document.getElementById('newTopicName').value.trim();
    const color = document.getElementById('newTopicColor').value;
    if (!name) {
      showMessage('Назва теми не може бути порожньою', 'error');
      return;
    }
    const ok = await addTopic(name, color);
    if (ok) {
      showMessage('Тему додано!', 'success');
      document.getElementById('newTopicName').value = '';
      document.getElementById('newTopicColor').value = '#e0eaff';
      await initTopicSelect();
    } else {
      showMessage('Помилка додавання теми', 'error');
    }
  };
}

// --- Окремий модальний блок для створення теми ---
if (!document.getElementById('newTopicModal')) {
  const modal = document.createElement('div');
  modal.id = 'newTopicModal';
  modal.style.display = 'none';
  modal.style.position = 'fixed';
  modal.style.left = '0';
  modal.style.top = '0';
  modal.style.right = '0';
  modal.style.bottom = '0';
  modal.style.background = '#0008';
  modal.style.zIndex = '1000';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.innerHTML = `
    <div style="background:#fff; padding:24px; border-radius:12px; min-width:240px; max-width:90vw; margin:80px auto; box-shadow:0 4px 24px #0003; display:flex; flex-direction:column; gap:14px; align-items:center;">
      <h3 style="margin-bottom:8px;">Нова тема</h3>
      <input type="text" id="newTopicInput" placeholder="Назва теми" required style="width:100%;padding:10px;">
      <input type="color" id="newTopicColor" value="#e0eaff" style="width:60px;height:36px;">
      <div style="display:flex;gap:10px;">
        <button id="saveTopicBtn" type="button">Зберегти</button>
        <button type="button" onclick="document.getElementById('newTopicModal').style.display='none'">Скасувати</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

if (document.getElementById('addTopicBtn')) {
  document.getElementById('addTopicBtn').onclick = () => {
    document.getElementById('newTopicModal').style.display = 'flex';
    document.getElementById('newTopicInput').value = '';
    document.getElementById('newTopicColor').value = '#e0eaff';
  };
  document.getElementById('saveTopicBtn').onclick = async () => {
    const name = document.getElementById('newTopicInput').value.trim();
    const color = document.getElementById('newTopicColor').value;
    if (!name) return;
    const ok = await addTopic(name, color);
    if (ok) {
      showMessage('Тему додано!', 'success');
      document.getElementById('newTopicModal').style.display = 'none';
      await initTopicSelect();
      // Вибрати нову тему одразу
      const topics = await fetchTopics();
      const select = document.getElementById('topicSelect');
      const newTopic = topics.find(t => t.name === name);
      if (newTopic) select.value = newTopic._id;
    } else {
      showMessage('Не вдалося додати тему', 'error');
    }
  };
}

// --- Сторінка для редагування тем ---
if (!document.getElementById('page-edit-topics')) {
  const page = document.createElement('div');
  page.id = 'page-edit-topics';
  page.className = 'page';
  page.style.display = 'none';
  page.innerHTML = `
    <h2>Редагування тем</h2>
    <div id="topicsList"></div>
    <button onclick="showPage('list')">Назад</button>
  `;
  document.querySelector('.container').appendChild(page);
}

window.showEditTopics = async function() {
  showPage('edit-topics');
  const topics = await fetchTopics();
  const list = document.getElementById('topicsList');
  list.innerHTML = '';
  topics.forEach(t => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '12px';
    row.style.marginBottom = '10px';
    row.innerHTML = `
      <input type="text" value="${t.name}" style="padding:6px 8px; border-radius:6px; border:1px solid #0077ff44; min-width:120px;">
      <input type="color" value="${t.color || '#e0eaff'}" style="width:38px;height:28px;">
      <button style="background:#0077ff;color:#fff;border:none;border-radius:6px;padding:7px 14px;">💾</button>
      <button style="background:#ffe0e0;color:#a00;border:none;border-radius:6px;padding:7px 14px;">🗑️</button>
    `;
    // Save
    row.children[2].onclick = async () => {
      const newName = row.children[0].value.trim();
      const newColor = row.children[1].value;
      if (!newName) return showMessage('Назва не може бути порожньою', 'error');
      const ok = await updateTopic(t._id, newName, newColor);
      if (ok) showMessage('Тему оновлено!', 'success');
      else showMessage('Помилка оновлення', 'error');
      await initTopicSelect();
      if (typeof updateList === 'function') await updateList(); // Оновити картки
      if (document.getElementById('testTopicSelect')) await initTestPage(); // Оновити select у тесті
      await window.showEditTopics();
    };
    // Delete
    row.children[3].onclick = async () => {
      if (!confirm('Видалити тему?')) return;
      await fetchWithAuth('/.netlify/functions/topics', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t._id })
      });
      showMessage('Тему видалено!', 'success');
      await initTopicSelect();
      await window.showEditTopics();
    };
    list.appendChild(row);
  });
};
// Додаємо кнопку для переходу до редагування тем у меню
if (!document.getElementById('editTopicsBtn')) {
  const btn = document.createElement('button');
  btn.id = 'editTopicsBtn';
  btn.textContent = 'Редагувати теми';
  btn.style.marginLeft = '8px';
  btn.onclick = () => window.showEditTopics();
  const navLeft = document.querySelector('.nav-left');
  if (navLeft) navLeft.appendChild(btn);
}

// Експортуємо для глобального доступу
window.logout = logout;
window.editCard = editCard;
window.deleteCard = deleteCard;
window.showLogin = showLogin;
window.showRegister = showRegister;
