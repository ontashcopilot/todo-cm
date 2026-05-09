'use strict';

// --- State ---
let todos = JSON.parse(localStorage.getItem('todos') || '[]');
let currentFilter = 'all';

// --- DOM refs ---
const todoInput    = document.getElementById('todo-input');
const addBtn       = document.getElementById('add-btn');
const todoList     = document.getElementById('todo-list');
const itemCount    = document.getElementById('item-count');
const clearBtn     = document.getElementById('clear-completed');
const filterBtns   = document.querySelectorAll('.filter-btn');
const dateEl       = document.getElementById('date');

// --- Init ---
dateEl.textContent = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

render();

// --- Event listeners ---
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTodo();
});

clearBtn.addEventListener('click', () => {
  todos = todos.filter((t) => !t.completed);
  save();
  render();
});

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// --- Functions ---
function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;

  todos.push({ id: Date.now(), text, completed: false });
  todoInput.value = '';
  todoInput.focus();
  save();
  render();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) todo.completed = !todo.completed;
  save();
  render();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  save();
  render();
}

function save() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function getFiltered() {
  switch (currentFilter) {
    case 'active':    return todos.filter((t) => !t.completed);
    case 'completed': return todos.filter((t) => t.completed);
    default:          return todos;
  }
}

function render() {
  const filtered = getFiltered();
  todoList.innerHTML = '';

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent =
      currentFilter === 'completed' ? 'No completed tasks.' :
      currentFilter === 'active'    ? 'No active tasks.' :
                                      'Add your first task above!';
    todoList.appendChild(li);
  } else {
    filtered.forEach((todo) => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (todo.completed ? ' completed' : '');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = todo.completed;
      checkbox.setAttribute('aria-label', 'Mark task complete');
      checkbox.addEventListener('change', () => toggleTodo(todo.id));

      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = todo.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '&#x2715;';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      todoList.appendChild(li);
    });
  }

  // Update footer
  const activeCount = todos.filter((t) => !t.completed).length;
  itemCount.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
}
