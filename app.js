// ===== Данные питомцев =====
const PETS = [
  { id: 'ugolek', name: 'Уголёк', emoji: '🐣', description: 'Дракончик' },
  { id: 'sliz', name: 'Слизень', emoji: '🟢', description: 'Мягкий и добрый' },
  { id: 'lis', name: 'Лисёнок', emoji: '🦊', description: 'Хитрый спутник' },
  { id: 'robot', name: 'Робот', emoji: '🤖', description: 'Пиксельный друг' }
];

// ===== Состояние игры =====
let state = {
  petId: null,
  petName: '',
  petEmoji: '',
  xp: 0,
  level: 1,
  streak: 0,
  lastCheckIn: null, // 'YYYY-MM-DD'
  freezesLeft: 3, // 3 попытки в месяц (как в Тиктоке)
  freezesMonth: null, // 'YYYY-MM'
  tasks: [], // { id, text, done }
  lastTaskDate: null // для сброса дел на новый день
};

// ===== Загрузка/сохранение =====
function saveState() {
  localStorage.setItem('zhivoyDen_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('zhivoyDen_state');
  if (saved) {
    state = { ...state, ...JSON.parse(saved) };
  }
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

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

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

  // Обработчики
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

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  
  if (task.done) {
    addXP(10);
    updateStreak();
    aiMessage(`Отлично! ${state.petName} радуется: «+10 XP за "${task.text}"!»`);
  }
  
  saveState();
  updateUI();
  updatePetMood();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  updateUI();
}

function addTask(text) {
  if (!text.trim()) return;
  state.tasks.push({
    id: Date.now().toString(),
    text: text.trim(),
    done: false
  });
  saveState();
  updateUI();
}

// ===== Опыт и уровень =====
function addXP(amount) {
  state.xp += amount;
  const xpNeeded = state.level * 100;
  if (state.xp >= xpNeeded) {
    state.level++;
    aiMessage(`🎉 ${state.petName} вырос до уровня ${state.level}! Ты молодец!`);
  }
  saveState();
  updateUI();
}

// ===== Стрик (серийничек с заморозкой) =====
function updateStreak() {
  const today = todayStr();
  
  // Сброс заморозок в новый месяц
  if (state.freezesMonth !== monthStr()) {
    state.freezesMonth = monthStr();
    state.freezesLeft = 3;
    saveState();
  }
  
  if (state.lastCheckIn === today) return; // уже отмечен сегодня
  
  if (state.lastCheckIn) {
    const days = daysBetween(state.lastCheckIn, today);
    
    if (days === 1) {
      // Вчера был чек-ин, стрик продолжается
      state.streak++;
    } else if (days === 2 && state.freezesLeft > 0) {
      // Пропустил 1 день, но есть заморозка
      state.freezesLeft--;
      state.streak++; // стрик не сгорает
      aiMessage(`❄️ Ты пропустил день, но заморозка спасла серию! Осталось: ${state.freezesLeft}`);
    } else {
      // Стрик сгорает
      state.streak = 1;
    }
  } else {
    // Первый чек-ин
    state.streak = 1;
  }
  
  state.lastCheckIn = today;
  saveState();
  updateUI();
}

// ===== Проверка нового дня =====
function checkNewDay() {
  const today = todayStr();
  
  if (state.lastTaskDate !== today) {
    // Новый день — сбрасываем дела
    state.tasks = [];
    state.lastTaskDate = today;
    saveState();
    
    // Проверяем, не сгорел ли стрик (если не было чек-ина вчера или сегодня)
    if (state.lastCheckIn) {
      const days = daysBetween(state.lastCheckIn, today);
      if (days >= 2 && state.freezesLeft <= 0) {
        state.streak = 0;
        aiMessage(`${state.petName} загрустил... Серия сгорела. Но ты можешь начать заново!`);
      }
    }
    
    updateUI();
    updatePetMood();
  }
}

// ===== Настроение питомца =====
function updatePetMood() {
  const moodEl = document.getElementById('pet-mood');
  const spriteEl = document.getElementById('pet-sprite');
  
  if (state.streak > 0 && state.tasks.some(t => t.done)) {
    moodEl.textContent = 'Счастлив и сыт!';
    spriteEl.style.filter = 'none';
  } else if (state.streak === 0) {
    moodEl.textContent = 'Грустит...';
    spriteEl.style.filter = 'grayscale(50%)';
  } else {
    moodEl.textContent = 'Ждёт твоих дел...';
    spriteEl.style.filter = 'none';
  }
}

// ===== ИИ-сообщения (заглушка) =====
// Позже здесь будет вызов GigaChat API
function aiMessage(text) {
  document.getElementById('ai-message').textContent = text;
}

// ===== Инициализация =====
function init() {
  loadState();
  
  // Регистрация service worker для PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  
  if (state.petId) {
    showMainScreen();
  } else {
    renderPetSelection();
  }
  
  // Обработчики
  document.getElementById('btn-add-task').addEventListener('click', () => {
    const input = document.getElementById('new-task-input');
    addTask(input.value);
    input.value = '';
  });
  
  document.getElementById('new-task-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const input = e.target;
      addTask(input.value);
      input.value = '';
    }
  });
  
  document.getElementById('btn-settings').addEventListener('click', () => {
    if (confirm('Сбросить весь прогресс?')) {
      localStorage.removeItem('zhivoyDen_state');
      location.reload();
    }
  });
}

init();