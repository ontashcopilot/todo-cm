// --- State ---
var todos = JSON.parse(localStorage.getItem('todos') || '[]');
var currentFilter = 'all';
var searchQuery = '';

// Priority order for sorting
const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };

// --- DOM refs ---
const todoInput      = document.getElementById('todo-input');
const addBtn         = document.getElementById('add-btn');
const todoList       = document.getElementById('todo-list');
const itemCount      = document.getElementById('item-count');
const clearBtn       = document.getElementById('clear-completed');
const filterBtns     = document.querySelectorAll('.filter-btn');
const dateEl         = document.getElementById('date');
const searchInput    = document.getElementById('search-input');
const prioritySelect = document.getElementById('priority-select');
const dueDateInput   = document.getElementById('due-date-input');

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

// BUG: uses new RegExp(searchQuery) without escaping — crashes on special
// regex characters like '(', '[', '*', etc.
searchInput.addEventListener('input', function() {
  searchQuery = this.value;
  render();
});

clearBtn.addEventListener('click', () => {
  todos = todos.filter((t) => !t.completed);
  // CODE SMELL: save() duplicated here instead of calling the function
  localStorage.setItem('todos', JSON.stringify(todos));
  render();
  // BUG: filter is not reset to 'all' — if the user is in 'completed' view
  // and clears completed tasks, the list shows "No completed tasks" even
  // though active tasks exist. Very confusing UX.
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

  const priority = prioritySelect.value;
  const dueDate  = dueDateInput.value;  // "YYYY-MM-DD" or ""

  todos.push({
    id: Date.now(),
    text,
    completed: false,
    priority,
    dueDate,
    createdAt: new Date().toISOString()
  });

  todoInput.value    = '';
  dueDateInput.value = '';
  todoInput.focus();
  save();
  render();
}

function toggleTodo(id) {
  // CODE SMELL: using == instead of ===
  const todo = todos.find((t) => t.id == id);
  if (todo) todo.completed = !todo.completed;
  save();
  render();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  save();
  render();
}

// Inline edit — double-click to edit a task
function startEdit(id, spanEl) {
  const todo = todos.find(t => t.id === id);
  if (!todo || todo.completed) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-input';
  input.value = todo.text;

  spanEl.replaceWith(input);
  input.focus();

  function commitEdit() {
    // BUG: allows saving an empty string — should validate and reject blank
    todo.text = input.value;
    save();
    render();
  }

  input.addEventListener('blur', commitEdit);

  // BUG: pressing Enter fires 'blur' AND this handler, so commitEdit()
  // runs twice — double-saving and double-rendering
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      input.blur();
    }
    if (e.key === 'Escape') {
      input.removeEventListener('blur', commitEdit);
      render();
    }
  });
}

function save() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// BUG: isOverdue uses `new Date()` (current date + time), not midnight.
// So a task due today (e.g. "2026-05-09") is compared against the full
// datetime and is marked overdue the entire day until the clock rolls to
// the next day.
function isOverdue(todo) {
  if (!todo.dueDate || todo.completed) return false;
  return new Date(todo.dueDate) < new Date();
}

function getFiltered() {
  let result;

  switch (currentFilter) {
    case 'active':    result = todos.filter((t) => !t.completed); break;
    case 'completed': result = todos.filter((t) => t.completed);  break;
    case 'overdue':   result = todos.filter((t) => isOverdue(t)); break;
    default:          result = todos;
  }

  // Apply search
  if (searchQuery.trim() !== '') {
    // BUG: unescaped user input fed directly into RegExp constructor.
    // Throws SyntaxError for inputs like "(test" or "[abc" etc.
    const re = new RegExp(searchQuery, 'i');
    result = result.filter(t => re.test(t.text));
  }

  // CODE SMELL: mutates `result` in-place (which is the same reference as
  // `todos` for the 'all' filter), silently reordering localStorage data
  // after the next save()
  result.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] || 99;
    const pb = PRIORITY_ORDER[b.priority] || 99;
    // BUG: when priorities are equal, there's no stable secondary sort,
    // causing items to jump order randomly on each render in some engines
    return pa - pb;
  });

  return result;
}

// CODE SMELL: render() does too many things — filtering, sorting, DOM
// building, badge logic, and footer update all in one giant function
function render() {
  const filtered = getFiltered();
  todoList.innerHTML = '';

  if (filtered.length == 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';

    // CODE SMELL: nested ternary chain, hard to read
    li.textContent =
      currentFilter === 'completed' ? 'No completed tasks.' :
      currentFilter === 'active'    ? 'No active tasks.' :
      currentFilter === 'overdue'   ? 'No overdue tasks.' :
      searchQuery                   ? 'No tasks match your search.' :
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

      // Meta wrapper
      const meta = document.createElement('div');
      meta.className = 'todo-meta';

      // Text + priority badge row
      const textRow = document.createElement('div');
      textRow.style.display = 'flex';
      textRow.style.alignItems = 'center';

      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = todo.text;
      // Double-click to edit
      span.addEventListener('dblclick', () => startEdit(todo.id, span));

      const badge = document.createElement('span');
      badge.className = `priority-badge priority-${todo.priority || 'low'}`;
      badge.textContent = todo.priority || 'low';

      textRow.appendChild(span);
      textRow.appendChild(badge);

      // Due date row
      if (todo.dueDate) {
        const due = document.createElement('div');
        due.className = 'due-date' + (isOverdue(todo) ? ' overdue' : '');
        // CODE SMELL: magic string "Due: " inline, not a constant
        due.textContent = 'Due: ' + todo.dueDate;
        meta.appendChild(textRow);
        meta.appendChild(due);
      } else {
        meta.appendChild(textRow);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '&#x2715;';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

      li.appendChild(checkbox);
      li.appendChild(meta);
      li.appendChild(deleteBtn);
      todoList.appendChild(li);
    });
  }

  // BUG: itemCount always shows count of ALL active todos, not the count
  // relevant to the current filter (e.g. shows "5 items left" even when
  // viewing 'overdue' filter with only 2 items)
  const activeCount = todos.filter((t) => !t.completed).length;
  itemCount.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
}
