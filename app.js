// ===== Данные питомцев =====
const PETS = [
  { id: 'ugolek', name: 'Уголёк', emoji: '🐣', description: 'Дракончик' },
  { id: 'sliz', name: 'Слизень', emoji: '🟢', description: 'Мягкий и добрый' },
  { id: 'lis', name: 'Лисёнок', emoji: '🦊', description: 'Хитрый спутник' },
  { id: 'robot', name: 'Робот', emoji: '🤖', description: 'Пиксельный друг' }
];

// ===== ТВОЙ КЛЮЧ GIGACHAT =====
const GIGACHAT_AUTH_KEY = 'MDFhMTVmMzItZjdmYS03NmIzLTk5MWYtNWRiZWFjMzRiZmFiOjAwZTIwYTgxLTNlN2UtNGM3OC1hZDUwLWMwNTA5YzFkMzJlNA==';

// ===== Состояние игры =====
let state = {
  petId: null, petName: '', petEmoji: '', xp: 0, level: 1, streak: 0,
  lastCheckIn: null, freezesLeft: 3, freezesMonth: null, tasks: [], lastTaskDate: null
};

// ===== Загрузка/сохранение =====
function saveState() { localStorage.setItem('zhivoyDen_state', JSON.stringify(state)); }
function loadState() {
  const saved = localStorage.getItem('zhivoyDen_state');
  if (saved) state = { ...state, ...JSON.parse(saved) };
}

// ===== Утилиты =====
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function daysBetween(d1, d2) { return Math.floor((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24)); }

// ===== Выбор питомца =====
function renderPetSelection() {
  const grid = document.getElementById('pet-grid');
  grid.innerHTML = PETS.map(p => `
    <div class="pet-card" data-id="${p.id}">
      <span class="emoji">${p.emoji}</span>
      <span class="name">${p.name}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.pet-card').forEach(card => {
    card.addEventListener('click', () => {
      const pet = PETS.find(p => p.id === card.dataset.id);
      state.petId = pet.id;
      state.petName = pet.name;
      state.petEmoji = pet.emoji;
      saveState();
      showMainScreen();
    });
  });
}

// ===== Экран =====
function showMainScreen() {
  document.getElementById('screen-select').classList.remove('active');
  document.getElementById('screen-main').classList.add('active');
  document.getElementById('pet-sprite').textContent = state.petEmoji;
  checkMissedDays(); 
  updateUI();
  checkNewDay();
}

// ===== Обновление UI =====
function updateUI() {
  document.getElementById('streak-count').textContent = state.streak;
  document.getElementById('freeze-info').textContent = `❄️ ${state.freezesLeft}`;
  const xpNeeded = state.level * 100;
  document.getElementById('xp-fill').style.width = `${(state.xp % xpNeeded) / xpNeeded * 100}%`;
  document.getElementById('xp-text').textContent = `${state.xp % xpNeeded} / ${xpNeeded} XP (Ур. ${state.level})`;
  renderTasks();
  updatePetMood();
}

// ===== Задачи =====
function renderTasks() {
  const list = document.getElementById('task-list');
  if (state.tasks.length === 0) {
    list.innerHTML = '<li style="color:#666;font-size:13px;text-align:center;padding:10px;">Добавь первое дело на сегодня</li>';
    return;
  }
  list.innerHTML = state.tasks.map(t => `
    <li class="task-item ${t.done ? 'done' : ''}" data-id="${t.id}">
      <div class="task-checkbox ${t.done ? 'checked' : ''}">${t.done ? '✓' : ''}</div>
      <span class="task-text">${escapeHtml(t.text)}</span>
      <button class="task-delete" data-id="${t.id}">×</button>
    </li>
  `).join('');

  list.querySelectorAll('.task-item').forEach(item => {
    item.querySelector('.task-checkbox').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTask(item.dataset.id);
    });
  });
  list.querySelectorAll('.task-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(btn.dataset.id);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== ВЫПОЛНЕНИЕ ЗАДАЧИ =====
function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.done) return; // Если уже сделано — ничего не делаем
  
  task.done = true;
  addXP(10);
  updateStreak();
  
  aiMessage('Думает...'); 
  
  const prompt = `Ты — пиксельный дракончик по имени ${state.petName}. Твой характер: веселый, немного ленивый, но очень любящий хозяина. Хозяин выполнил задачу: "${task.text}". Напиши короткую (до 15 слов) реакцию, похвали его и пошути.`;
  
  askGigaChat(prompt).then(aiText => {
    aiMessage(aiText);
  });
  
  saveState();
  updateUI();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState(); updateUI();
}

function addTask(text) {
  if (!text.trim()) return;
  state.tasks.push({ id: Date.now().toString(), text: text.trim(), done: false });
  saveState(); updateUI();
}

// ===== Опыт =====
function addXP(amount) {
  state.xp += amount;
  const xpNeeded = state.level * 100;
  if (state.xp >= xpNeeded) {
    state.level++;
    aiMessage(`🎉 ${state.petName} вырос до уровня ${state.level}!`);
  }
  saveState(); updateUI();
}

// ===== Стрик =====
function updateStreak() {
  const today = todayStr();
  if (state.freezesMonth !== monthStr()) {
    state.freezesMonth = monthStr(); state.freezesLeft = 3;
  }
  if (state.lastCheckIn === today) return; 
  
  if (state.lastCheckIn) {
    const days = daysBetween(state.lastCheckIn, today);
    if (days === 1) state.streak++;
    else if (days === 2 && state.freezesLeft > 0) {
      state.freezesLeft--; state.streak++; 
      aiMessage(`❄️ Заморозка спасла серию! Осталось: ${state.freezesLeft}`);
    } else state.streak = 1;
  } else state.streak = 1;
  
  state.lastCheckIn = today;
  saveState(); updateUI();
}

function checkMissedDays() {
  if (!state.lastCheckIn) return;
  const days = daysBetween(state.lastCheckIn, todayStr());
  if (days >= 2) {
    if (state.freezesLeft > 0 && days === 2) {} 
    else if (days > 2 || state.freezesLeft <= 0) {
      if (state.streak > 0) {
        state.streak = 0;
        aiMessage(`😢 ${state.petName} загрустил... Серия сгорела. Начнем заново?`);
        saveState();
      }
    }
  }
}

function checkNewDay() {
  const today = todayStr();
  if (state.lastTaskDate !== today) {
    state.tasks = []; state.lastTaskDate = today;
    saveState(); updateUI();
  }
}

function updatePetMood() {
  const moodEl = document.getElementById('pet-mood');
  const spriteEl = document.getElementById('pet-sprite');
  if (state.streak > 0 && state.tasks.some(t => t.done)) {
    moodEl.textContent = 'Счастлив и сыт!'; spriteEl.style.filter = 'none';
  } else if (state.streak === 0) {
    moodEl.textContent = 'Грустит...'; spriteEl.style.filter = 'grayscale(80%)';
  } else {
    moodEl.textContent = 'Ждёт твоих дел...'; spriteEl.style.filter = 'none';
  }
}

function aiMessage(text) { document.getElementById('ai-message').textContent = text; }

// ===== GigaChat =====
async function askGigaChat(promptText) {
  try {
    // Отправляем запрос на наш собственный сервер (Vercel)
    const response = await fetch('/api/gigachat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Server error');
    }

    const data = await response.json();
    return data.text;

  } catch (error) {
    console.error('GigaChat Error:', error);
    return `Ошибка ИИ: ${error.message}`;
  }
}

// ===== Инициализация =====
function init() {
  loadState();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  
  if (state.petId) showMainScreen();
  else renderPetSelection();
  
  document.getElementById('btn-add-task').addEventListener('click', () => {
    const input = document.getElementById('new-task-input');
    addTask(input.value); input.value = '';
  });
  
  document.getElementById('new-task-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const input = e.target;
      addTask(input.value); input.value = '';
    }
  });
  
  document.getElementById('btn-settings').addEventListener('click', () => {
    if (confirm('Сбросить весь прогресс?')) {
      localStorage.removeItem('zhivoyDen_state'); location.reload();
    }
  });
}

init();



