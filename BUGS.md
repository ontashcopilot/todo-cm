# Known Bugs & Code Smells — `feature/enhanced-todos`

All issues below are intentional and exist in `app.js` (and minor parts of `index.html`/`style.css`).

---

## Bugs

### 1. Unescaped user input fed into `RegExp` constructor
**File:** `app.js` — `searchInput` event handler & `getFiltered()`  
**Code:**
```js
const re = new RegExp(searchQuery, 'i');
```
**Problem:** If the user types a string containing special regex characters like `(`, `[`, `*`, `+`, `?`, or `\`, the `RegExp` constructor throws a `SyntaxError` and the entire app crashes.  
**Fix:** Escape the input first — `searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`.

---

### 2. Tasks due *today* are always marked overdue
**File:** `app.js` — `isOverdue()`  
**Code:**
```js
return new Date(todo.dueDate) < new Date();
```
**Problem:** `new Date("2026-05-09")` parses to midnight UTC. `new Date()` is the current local time (e.g. 10:30 AM). So a task due today is immediately considered overdue from the moment the page loads, all day long.  
**Fix:** Compare against midnight of today in local time, not the current timestamp.

---

### 3. Inline edit `commitEdit` fires twice on Enter
**File:** `app.js` — `startEdit()`  
**Code:**
```js
input.addEventListener('blur', commitEdit);
input.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    input.blur();  // triggers 'blur' → commitEdit()
  }
  // then keydown itself also would call blur a second time via event flow
});
```
**Problem:** Pressing Enter causes `blur` to fire (which calls `commitEdit`), and the keydown handler triggers `.blur()` again — `commitEdit` and `render()` run twice, causing a double-save and potential UI flicker.  
**Fix:** Call `input.removeEventListener('blur', commitEdit)` before `input.blur()` inside the Enter handler, then call `commitEdit()` manually once.

---

### 4. Inline edit allows saving an empty task
**File:** `app.js` — `commitEdit()` inside `startEdit()`  
**Code:**
```js
function commitEdit() {
  todo.text = input.value;  // no validation
  save();
  render();
}
```
**Problem:** If the user clears the input field and presses Enter or clicks away, the task is saved with an empty string `""` and renders as a blank item.  
**Fix:** Check `input.value.trim()` — if empty, either restore the original text or delete the todo.

---

### 5. `getFiltered()` mutates the original `todos` array
**File:** `app.js` — `getFiltered()`  
**Code:**
```js
default: result = todos;   // same reference, not a copy
// ...
result.sort(...);           // mutates `todos` in-place
```
**Problem:** For the `'all'` filter, `result` is assigned the same reference as `todos`. Calling `.sort()` on it reorders the original array. The next `save()` call persists this reordered array to `localStorage`, silently corrupting the insertion order of tasks.  
**Fix:** Use `result = [...todos]` (a shallow copy) before sorting.

---

### 6. Footer item count ignores the active filter
**File:** `app.js` — `render()`  
**Code:**
```js
const activeCount = todos.filter((t) => !t.completed).length;
```
**Problem:** The count always shows the total number of incomplete todos across the entire list, even when the user is viewing the `overdue` or `completed` filter. This is confusing and misleading.  
**Fix:** Base the count on `filtered.length` or adjust the label text to match the current filter context.

---

### 7. Clearing completed tasks doesn't reset the filter
**File:** `app.js` — `clearBtn` click handler  
**Code:**
```js
clearBtn.addEventListener('click', () => {
  todos = todos.filter((t) => !t.completed);
  localStorage.setItem('todos', JSON.stringify(todos));
  render();
  // currentFilter is NOT reset
});
```
**Problem:** If the user is on the `'completed'` filter view and clicks "Clear Completed", all completed tasks are removed but the filter stays on `'completed'`. The list shows "No completed tasks" even though active tasks exist, making it appear the list is empty.  
**Fix:** Reset `currentFilter = 'all'` and update the active filter button UI before calling `render()`.

---

## Code Smells

### S1. `var` instead of `let` / `const`
```js
var todos = JSON.parse(...);
var currentFilter = 'all';
```
`var` is function-scoped and hoisted — a source of subtle bugs in larger codebases. Use `let` or `const`.

---

### S2. Loose equality `==` instead of strict `===`
```js
const todo = todos.find((t) => t.id == id);   // toggleTodo
if (filtered.length == 0) { ... }              // render
```
Loose equality coerces types and can produce unexpected matches. Always use `===`.

---

### S3. `save()` logic duplicated inline
```js
// In clearBtn handler:
localStorage.setItem('todos', JSON.stringify(todos));
// Everywhere else:
save();
```
The `save()` helper exists but is bypassed in one handler. If the save logic ever changes, this copy will be forgotten and cause inconsistency.

---

### S4. `render()` is a god function (~90 lines)
`render()` does filtering, sorting, DOM construction, badge rendering, due-date logic, and footer updates all in one place. It should be broken into smaller focused functions (`buildTodoItem()`, `updateFooter()`, etc.).

---

### S5. Magic string not extracted to a constant
```js
due.textContent = 'Due: ' + todo.dueDate;
```
The label `"Due: "` is a magic string. If the format or label ever needs to change, it must be hunted down rather than updated in one place.

---

### S6. Unreadable nested ternary chain
```js
li.textContent =
  currentFilter === 'completed' ? 'No completed tasks.' :
  currentFilter === 'active'    ? 'No active tasks.'    :
  currentFilter === 'overdue'   ? 'No overdue tasks.'   :
  searchQuery                   ? 'No tasks match your search.' :
                                  'Add your first task above!';
```
Four-level nested ternaries are hard to read and maintain. A `switch` statement or a lookup object is clearer.
