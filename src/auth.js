// auth.js - авторизація, профіль, повідомлення
export function showMessage(msg, type = 'info') {
  const el = document.getElementById('message');
  el.textContent = msg;
  el.style.display = '';
  el.style.background = type === 'error' ? '#ffe0e0' : '#e0ffe0';
  el.style.color = type === 'error' ? '#a00' : '#070';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}
export function getToken() {
  return localStorage.getItem('token') || '';
}
export function getUserEmail() {
  return localStorage.getItem('userEmail') || '';
}
export function getUserNickname() {
  return localStorage.getItem('userNickname') || '';
}
export function setAuthUI() {
  const token = getToken();
  const nickname = getUserNickname();
  const userInfo = document.getElementById('user-info');
  const navProfile = document.querySelector('.nav-profile');
  const navLeft = document.querySelector('.nav-left');
  if (token) {
    let displayName = nickname || getUserEmail();
    let icon = `<span class="user-icon">${(nickname || getUserEmail())[0].toUpperCase()}</span>`;
    userInfo.innerHTML = icon + displayName;
    userInfo.classList.remove('hide-profile');
    if (navProfile) navProfile.classList.remove('hide-profile');
    if (navLeft) navLeft.classList.remove('hide-profile');
  } else {
    userInfo.innerHTML = '';
    userInfo.classList.add('hide-profile');
    if (navProfile) navProfile.classList.add('hide-profile');
    if (navLeft) navLeft.classList.add('hide-profile');
    // Приховати всі сторінки, показати лише auth-block
    document.getElementById('page-list').style.display = 'none';
    document.getElementById('page-add').style.display = 'none';
    document.getElementById('page-edit').style.display = 'none';
    document.getElementById('page-profile').style.display = 'none';
    document.getElementById('auth-block').style.display = '';
  }
  document.getElementById('logoutBtn').style.display = token ? '' : 'none';
  document.getElementById('loginForm').style.display = token ? 'none' : '';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('auth-block').style.display = token ? 'none' : '';
  document.getElementById('page-list').style.display = token ? '' : 'none';
  document.getElementById('page-add').style.display = token ? '' : 'none';
  document.getElementById('page-edit').style.display = 'none';
  document.getElementById('page-profile').style.display = 'none';
}
export function showLogin() {
  document.getElementById('loginForm').style.display = '';
  document.getElementById('registerForm').style.display = 'none';
}
export function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = '';
}
export async function loadProfile() {
  const query = `query { profile { _id email nickname } }`;
  const res = await window.queryGraphQL(query);
  if (!res.data || !res.data.profile) return showMessage('Не вдалося завантажити профіль', 'error');
  const data = res.data.profile;
  document.getElementById('profileNickname').value = data.nickname || '';
  document.getElementById('profileEmail').value = data.email || '';
}
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userNickname');
  localStorage.removeItem('userAvatar');
  setAuthUI();
  showLogin(); // Показати форму логіну
  showMessage('Ви вийшли з акаунту', 'success');
}

// --- Password validation ---
export function validatePassword(password) {
  const rules = [
    { test: /.{8,}/, msg: 'Мінімум 8 символів' },
    { test: /[a-z]/, msg: 'Має бути маленька латинська літера' },
    { test: /[A-Z]/, msg: 'Має бути велика латинська літера' },
    { test: /\d/, msg: 'Має бути цифра' },
    { test: /[^a-zA-Z0-9]/, msg: 'Має бути спецсимвол' }
  ];
  const failed = rules.filter(r => !r.test.test(password));
  return { valid: failed.length === 0, failed };
}

// --- Показ підказок ---
function showPasswordHints(input, hintsId) {
  const val = input.value;
  const { failed } = validatePassword(val);
  const hints = document.getElementById(hintsId);
  if (!hints) return;
  if (!val) { hints.innerHTML = ''; return; }
  if (failed.length === 0) {
    hints.innerHTML = '<span style="color:green">Пароль надійний</span>';
  } else {
    hints.innerHTML = failed.map(r => `<span style="color:#a00">${r.msg}</span>`).join('<br>');
  }
}

// --- Додаємо підказки до форм ---
if (document.getElementById('regPass')) {
  let hints = document.createElement('div');
  hints.id = 'regPassHints';
  hints.style.fontSize = '0.95em';
  hints.style.marginTop = '-10px';
  hints.style.marginBottom = '8px';
  document.getElementById('regPass').after(hints);
  const regBtn = document.querySelector('#registerForm button[type="submit"]');
  document.getElementById('regPass').addEventListener('input', e => {
    showPasswordHints(e.target, 'regPassHints');
    const { valid } = validatePassword(e.target.value);
    regBtn.disabled = !valid;
    e.target.style.borderColor = valid || !e.target.value ? '' : '#a00';
  });
  // Початково disabled
  regBtn.disabled = true;
}
if (document.getElementById('newPass')) {
  let hints = document.createElement('div');
  hints.id = 'newPassHints';
  hints.style.fontSize = '0.95em';
  hints.style.marginTop = '-10px';
  hints.style.marginBottom = '8px';
  document.getElementById('newPass').after(hints);
  const passBtn = document.querySelector('#passwordForm button[type="submit"]');
  document.getElementById('newPass').addEventListener('input', e => {
    showPasswordHints(e.target, 'newPassHints');
    const { valid } = validatePassword(e.target.value);
    passBtn.disabled = !valid;
    e.target.style.borderColor = valid || !e.target.value ? '' : '#a00';
  });
  passBtn.disabled = true;
}

// --- Перевірка пароля при реєстрації ---
document.getElementById('registerForm').onsubmit = async e => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  const nickname = document.getElementById('regNickname') ? document.getElementById('regNickname').value.trim() : '';
  const { valid, failed } = validatePassword(password);
  if (!valid) {
    showPasswordHints(document.getElementById('regPass'), 'regPassHints');
    showMessage('Пароль не відповідає вимогам', 'error');
    return;
  }
  try {
    const query = `mutation($email: String!, $password: String!, $nickname: String) {\n  register(email: $email, password: $password, nickname: $nickname) { token user { _id email nickname } }\n}`;
    const res = await window.queryGraphQL(query, { email, password, nickname });
    const data = res.data && res.data.register ? res.data.register : null;
    if (data && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userNickname', data.user.nickname || '');
      setAuthUI();
      showPage('list');
      showMessage('Акаунт створено!', 'success');
    } else {
      showMessage('Помилка реєстрації', 'error');
    }
  } catch (err) {
    showMessage('Помилка з’єднання з сервером', 'error');
  }
};
// --- Перевірка пароля при зміні ---
document.getElementById('passwordForm').onsubmit = async e => {
  e.preventDefault();
  const password = document.getElementById('oldPass').value;
  const newPassword = document.getElementById('newPass').value;
  const { valid, failed } = validatePassword(newPassword);
  if (!password || !newPassword) return;
  if (!valid) {
    showPasswordHints(document.getElementById('newPass'), 'newPassHints');
    showMessage('Новий пароль не відповідає вимогам', 'error');
    return;
  }
  const query = `mutation($password: String!, $newPassword: String!) {\n  updateProfile(password: $password, newPassword: $newPassword) { _id email nickname }\n}`;
  const res = await window.queryGraphQL(query, { password, newPassword });
  if (res.data && res.data.updateProfile && res.data.updateProfile._id) showMessage('Пароль змінено!', 'success');
  else showMessage('Помилка зміни пароля', 'error');
};

// --- ЛОГІН ---
document.getElementById('loginForm').onsubmit = async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;
  try {
    const query = `mutation($email: String!, $password: String!) {\n  login(email: $email, password: $password) { token user { _id email nickname } }\n}`;
    const res = await window.queryGraphQL(query, { email, password });
    const data = res.data && res.data.login ? res.data.login : null;
    if (data && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userNickname', data.user.nickname || '');
      setAuthUI();
      showPage('list');
      showMessage('Вхід успішний!', 'success');
    } else {
      showMessage('Невірний email або пароль', 'error');
    }
  } catch (err) {
    showMessage('Помилка з’єднання з сервером', 'error');
  }
};

// --- РЕЄСТРАЦІЯ ---
document.getElementById('registerForm').onsubmit = async e => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  const nickname = document.getElementById('regNickname') ? document.getElementById('regNickname').value.trim() : '';
  const { valid, failed } = validatePassword(password);
  if (!valid) {
    showPasswordHints(document.getElementById('regPass'), 'regPassHints');
    showMessage('Пароль не відповідає вимогам', 'error');
    return;
  }
  try {
    const query = `mutation($email: String!, $password: String!, $nickname: String) {\n  register(email: $email, password: $password, nickname: $nickname) { token user { _id email nickname } }\n}`;
    const res = await window.queryGraphQL(query, { email, password, nickname });
    const data = res.data && res.data.register ? res.data.register : null;
    if (data && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userNickname', data.user.nickname || '');
      setAuthUI();
      showPage('list');
      showMessage('Акаунт створено!', 'success');
    } else {
      showMessage('Помилка реєстрації', 'error');
    }
  } catch (err) {
    showMessage('Помилка з’єднання з сервером', 'error');
  }
};

// --- ЗМІНА ПАРОЛЯ ---
document.getElementById('passwordForm').onsubmit = async e => {
  e.preventDefault();
  const password = document.getElementById('oldPass').value;
  const newPassword = document.getElementById('newPass').value;
  const { valid, failed } = validatePassword(newPassword);
  if (!password || !newPassword) return;
  if (!valid) {
    showPasswordHints(document.getElementById('newPass'), 'newPassHints');
    showMessage('Новий пароль не відповідає вимогам', 'error');
    return;
  }
  const query = `mutation($password: String!, $newPassword: String!) {\n  updateProfile(password: $password, newPassword: $newPassword) { _id email nickname }\n}`;
  const res = await window.queryGraphQL(query, { password, newPassword });
  if (res.data && res.data.updateProfile && res.data.updateProfile._id) showMessage('Пароль змінено!', 'success');
  else showMessage('Помилка зміни пароля', 'error');
};

// --- ОНОВЛЕННЯ ПРОФІЛЮ (нікнейм) ---
document.getElementById('profileForm').onsubmit = async e => {
  e.preventDefault();
  const nickname = document.getElementById('profileNickname').value.trim();
  const query = `mutation($nickname: String!) {\n  updateProfile(nickname: $nickname) { _id email nickname }\n}`;
  const res = await window.queryGraphQL(query, { nickname });
  if (res.data && res.data.updateProfile && res.data.updateProfile._id) {
    localStorage.setItem('userNickname', nickname);
    setAuthUI();
    showMessage('Профіль оновлено!', 'success');
  } else {
    showMessage('Помилка оновлення профілю', 'error');
  }
};
