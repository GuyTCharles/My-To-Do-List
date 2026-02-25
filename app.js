(function () {
    // Persistent keys and static configuration.
    const STORAGE_KEY = "tasks";
    const THEME_KEY = "focusboard-theme";
    const IOS_DATE_PLACEHOLDER = "mm / dd / yyyy";
    const PRIORITY_LEVELS = ["High", "Medium", "Low"];
    const PRIORITY_RANK = {
        High: 3,
        Medium: 2,
        Low: 1
    };

    // Task model stored in memory and serialized to localStorage.
    function Task(description, priority, dueDate, createdAt) {
        this.description = description;
        this.completed = false;
        this.priority = normalizePriority(priority);
        this.dueDate = normalizeDueDate(dueDate);
        this.createdAt = Number(createdAt) || Date.now();
    }

    // Toggle task completion state.
    Task.prototype.toggleComplete = function () {
        this.completed = !this.completed;
    };

    // DOM references.
    const taskForm = document.querySelector("#new-task-form");
    const taskInput = document.querySelector("#new-task-input");
    const taskDueDateInput = document.querySelector("#new-task-due-date");
    const tasksList = document.querySelector("#tasks-list");
    const emptyState = document.querySelector("#empty-state");
    const totalCount = document.querySelector("#count-total");
    const activeCount = document.querySelector("#count-active");
    const doneCount = document.querySelector("#count-done");
    const filterButtons = Array.from(document.querySelectorAll(".btn-filter"));
    const priorityFilterSelect = document.querySelector("#priority-filter");
    const sortModeSelect = document.querySelector("#sort-mode");
    const themeToggle = document.querySelector("#theme-toggle");

    // UI state for filtering and sorting.
    let activeFilter = "all";
    let activePriorityFilter = "all";
    let sortMode = "newest";
    const useIOSDateFallback = shouldUseIOSDateFallback();

    // In-memory state loaded once at startup.
    const tasks = loadTasks();

    // Normalize priority values from UI/storage.
    function normalizePriority(priority) {
        return PRIORITY_LEVELS.includes(priority) ? priority : "High";
    }

    // Trim and collapse repeated whitespace.
    function normalizeDescription(value) {
        return value.replace(/\s+/g, " ").trim();
    }

    // Keep only ISO date values (YYYY-MM-DD).
    function normalizeDueDate(value) {
        if (typeof value !== "string" || value.length === 0) {
            return "";
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return "";
        }

        const parsedDate = new Date(`${value}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
            return "";
        }

        return value;
    }

    // Basic input safety and non-empty validation.
    function isValidDescription(value) {
        return value.length > 0 && !/[<>]/.test(value);
    }

    // Detect iOS/macOS touch Safari where empty date inputs can appear blank.
    function shouldUseIOSDateFallback() {
        const ua = navigator.userAgent || "";
        const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
        const isTouchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
        return isIOSDevice || isTouchMac;
    }

    // Toggle "date" vs "text" rendering to keep placeholder visible on iOS.
    function syncDateInputPresentation(input, placeholderText) {
        if (!useIOSDateFallback || !input) {
            return;
        }

        const hasValue = Boolean(input.value);
        input.type = hasValue ? "date" : "text";
        input.placeholder = hasValue ? "" : placeholderText;
        input.classList.toggle("date-empty-fallback", !hasValue);

        if (hasValue) {
            input.removeAttribute("inputmode");
        } else {
            input.setAttribute("inputmode", "none");
        }
    }

    // Attach iOS fallback behavior for a date input once.
    function applyDateInputFallback(input, placeholderText = IOS_DATE_PLACEHOLDER) {
        if (!useIOSDateFallback || !input) {
            return;
        }

        if (input.dataset.iosDateFallbackAttached === "true") {
            syncDateInputPresentation(input, placeholderText);
            return;
        }

        input.dataset.iosDateFallbackAttached = "true";
        syncDateInputPresentation(input, placeholderText);

        input.addEventListener("focus", function () {
            input.type = "date";
            input.placeholder = "";
            input.classList.remove("date-empty-fallback");
            input.removeAttribute("inputmode");

            if (typeof input.showPicker === "function") {
                input.showPicker();
            }
        });

        input.addEventListener("blur", function () {
            syncDateInputPresentation(input, placeholderText);
        });

        input.addEventListener("change", function () {
            syncDateInputPresentation(input, placeholderText);
        });
    }

    // Build local YYYY-MM-DD for overdue checks.
    function getTodayISO() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    // User-facing date label for due badges.
    function formatDate(dueDate) {
        if (!dueDate) {
            return "No due date";
        }

        const parsedDate = new Date(`${dueDate}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
            return "No due date";
        }

        return parsedDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    // A task is overdue only when incomplete and due date is before today.
    function isOverdue(task) {
        return !task.completed && Boolean(task.dueDate) && task.dueDate < getTodayISO();
    }

    // Shared helper for action buttons in task cards.
    function createButton(label, buttonClass, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `btn ${buttonClass}`;
        button.textContent = label;
        button.addEventListener("click", onClick);
        return button;
    }

    // Rehydrate tasks from localStorage safely.
    function loadTasks() {
        let storedTasks = [];
        try {
            const parsedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (Array.isArray(parsedTasks)) {
                storedTasks = parsedTasks;
            }
        } catch (error) {
            storedTasks = [];
        }

        return storedTasks
            .filter(task => task && typeof task.description === "string")
            .map((task, index) => {
                const loadedTask = new Task(
                    normalizeDescription(task.description),
                    task.priority,
                    task.dueDate,
                    task.createdAt || Date.now() - index
                );
                loadedTask.completed = Boolean(task.completed);
                return loadedTask;
            })
            .filter(task => isValidDescription(task.description));
    }

    // Persist current in-memory tasks.
    function saveTasks() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }

    // Refresh task counters (total/active/done).
    function updateSummary() {
        const done = tasks.filter(task => task.completed).length;
        const total = tasks.length;
        const active = total - done;

        totalCount.textContent = total;
        activeCount.textContent = active;
        doneCount.textContent = done;
    }

    // Status filter predicate.
    function matchesActiveFilter(task) {
        if (activeFilter === "active") {
            return !task.completed;
        }

        if (activeFilter === "completed") {
            return task.completed;
        }

        return true;
    }

    // Priority filter predicate.
    function matchesPriorityFilter(task) {
        return activePriorityFilter === "all" || task.priority === activePriorityFilter;
    }

    // Compare due dates while keeping "no due date" entries last.
    function compareDueDates(taskA, taskB, latestFirst) {
        const missingDateA = !taskA.dueDate;
        const missingDateB = !taskB.dueDate;

        if (missingDateA && missingDateB) {
            return 0;
        }

        if (missingDateA) {
            return 1;
        }

        if (missingDateB) {
            return -1;
        }

        if (latestFirst) {
            return taskB.dueDate.localeCompare(taskA.dueDate);
        }

        return taskA.dueDate.localeCompare(taskB.dueDate);
    }

    // Comparator selected by current sort mode.
    function compareTasks(taskA, taskB) {
        if (sortMode === "oldest") {
            return taskA.createdAt - taskB.createdAt;
        }

        if (sortMode === "priority-desc") {
            return (PRIORITY_RANK[taskB.priority] - PRIORITY_RANK[taskA.priority]) || (taskB.createdAt - taskA.createdAt);
        }

        if (sortMode === "priority-asc") {
            return (PRIORITY_RANK[taskA.priority] - PRIORITY_RANK[taskB.priority]) || (taskB.createdAt - taskA.createdAt);
        }

        if (sortMode === "due-soon") {
            return compareDueDates(taskA, taskB, false) || (taskB.createdAt - taskA.createdAt);
        }

        if (sortMode === "due-late") {
            return compareDueDates(taskA, taskB, true) || (taskB.createdAt - taskA.createdAt);
        }

        return taskB.createdAt - taskA.createdAt;
    }

    // Build filtered/sorted task/index pairs for rendering.
    function getVisibleTaskEntries() {
        return tasks
            .map((task, index) => ({ task, index }))
            .filter(entry => matchesActiveFilter(entry.task) && matchesPriorityFilter(entry.task))
            .sort((entryA, entryB) => compareTasks(entryA.task, entryB.task));
    }

    // Keep filter button "active" style in sync with state.
    function updateFilterButtons() {
        filterButtons.forEach(button => {
            button.classList.toggle("is-active", button.dataset.filter === activeFilter);
        });
    }

    // Build priority selector for each task row.
    function createPrioritySelect(index, currentPriority) {
        const select = document.createElement("select");
        select.className = "task-priority";
        select.setAttribute("aria-label", "Task priority");

        PRIORITY_LEVELS.forEach(priority => {
            const option = document.createElement("option");
            option.value = priority;
            option.textContent = priority;
            option.selected = priority === currentPriority;
            select.appendChild(option);
        });

        select.addEventListener("change", function () {
            updateTaskPriority(index, this.value);
        });

        return select;
    }

    // Create one task row and wire all row-level interactions.
    function createTaskItem(task, index) {
        const item = document.createElement("li");
        item.className = `task priority-${task.priority.toLowerCase()}`;
        if (task.completed) {
            item.classList.add("done");
        }

        const main = document.createElement("div");
        main.className = "task-main";

        const descInput = document.createElement("input");
        descInput.type = "text";
        descInput.className = "task-desc";
        descInput.value = task.description;
        descInput.maxLength = 180;
        descInput.setAttribute("aria-label", `Task ${index + 1} description`);
        descInput.addEventListener("blur", function () {
            updateTaskDescription(index, this.value);
        });
        descInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                this.blur();
            }
        });

        const stateText = document.createElement("p");
        stateText.className = "task-state";
        stateText.textContent = task.completed ? "Status: Completed" : "Status: In progress";

        const meta = document.createElement("div");
        meta.className = "task-meta";

        const dueBadge = document.createElement("p");
        dueBadge.className = "due-badge";

        if (task.dueDate) {
            dueBadge.textContent = `${isOverdue(task) ? "Overdue" : "Due"}: ${formatDate(task.dueDate)}`;
        } else {
            dueBadge.textContent = "No due date";
        }

        if (isOverdue(task)) {
            dueBadge.classList.add("overdue");
        }

        const dueDateInput = document.createElement("input");
        dueDateInput.type = "date";
        dueDateInput.className = "task-due-date";
        dueDateInput.value = task.dueDate;
        dueDateInput.setAttribute("aria-label", `Task ${index + 1} due date`);
        dueDateInput.addEventListener("change", function () {
            updateTaskDueDate(index, this.value);
        });
        applyDateInputFallback(dueDateInput);

        meta.appendChild(dueBadge);
        meta.appendChild(dueDateInput);

        main.appendChild(descInput);
        main.appendChild(stateText);
        main.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const toggleButton = createButton(
            task.completed ? "Undo" : "Complete",
            "btn-secondary",
            function () {
                toggleTaskComplete(index);
            }
        );

        const deleteButton = createButton("Delete", "btn-danger", function () {
            removeTask(index);
        });

        actions.appendChild(toggleButton);
        actions.appendChild(deleteButton);

        item.appendChild(main);
        item.appendChild(createPrioritySelect(index, task.priority));
        item.appendChild(actions);

        return item;
    }

    // Render visible tasks and empty states.
    function renderTasks() {
        tasksList.innerHTML = "";
        const visibleEntries = getVisibleTaskEntries();

        visibleEntries.forEach(({ task, index }) => {
            tasksList.appendChild(createTaskItem(task, index));
        });

        if (tasks.length === 0) {
            emptyState.textContent = "No tasks yet. Add your first task above.";
        } else if (visibleEntries.length === 0) {
            emptyState.textContent = "No tasks match the current filters.";
        }

        emptyState.hidden = visibleEntries.length > 0;

        updateSummary();
    }

    // Add a task from form values and reconcile active filters if needed.
    function addTask(description, priority, dueDate) {
        const normalizedDescription = normalizeDescription(description);
        if (!normalizedDescription) {
            alert("Please add a task.");
            return false;
        }

        if (/[<>]/.test(normalizedDescription)) {
            alert("Please enter a valid task description without HTML characters.");
            return false;
        }

        const newTask = new Task(normalizedDescription, priority, dueDate, Date.now());
        tasks.unshift(newTask);

        let shouldUpdateFilterUI = false;

        if (!matchesActiveFilter(newTask)) {
            activeFilter = "all";
            shouldUpdateFilterUI = true;
        }

        if (!matchesPriorityFilter(newTask)) {
            activePriorityFilter = "all";
            priorityFilterSelect.value = "all";
        }

        if (shouldUpdateFilterUI) {
            updateFilterButtons();
        }

        saveTasks();
        renderTasks();
        scrollToFirstTask();
        return true;
    }

    // Remove task at index.
    function removeTask(index) {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    }

    // Toggle completion for task at index.
    function toggleTaskComplete(index) {
        tasks[index].toggleComplete();
        saveTasks();
        renderTasks();
    }

    // Save edited task text after validation.
    function updateTaskDescription(index, description) {
        const normalizedDescription = normalizeDescription(description);
        if (!normalizedDescription) {
            alert("Task description cannot be empty.");
            renderTasks();
            return;
        }

        if (/[<>]/.test(normalizedDescription)) {
            alert("Invalid input. HTML tags are not allowed.");
            renderTasks();
            return;
        }

        tasks[index].description = normalizedDescription;
        saveTasks();
        renderTasks();
    }

    // Save edited priority value.
    function updateTaskPriority(index, priority) {
        tasks[index].priority = normalizePriority(priority);
        saveTasks();
        renderTasks();
    }

    // Save edited due date value.
    function updateTaskDueDate(index, dueDate) {
        tasks[index].dueDate = normalizeDueDate(dueDate);
        saveTasks();
        renderTasks();
    }

    // Bring newly added item into view.
    function scrollToFirstTask() {
        const firstTask = tasksList.firstElementChild;
        if (firstTask) {
            firstTask.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        }
    }

    // Apply selected theme and persist preference.
    function applyTheme(theme) {
        const resolvedTheme = theme === "dark" ? "dark" : "light";
        const nextThemeLabel = resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
        document.documentElement.setAttribute("data-theme", resolvedTheme);
        themeToggle.setAttribute("aria-pressed", resolvedTheme === "dark" ? "true" : "false");
        themeToggle.setAttribute("aria-label", nextThemeLabel);
        themeToggle.setAttribute("title", nextThemeLabel);
        localStorage.setItem(THEME_KEY, resolvedTheme);
    }

    // Initialize theme from localStorage, then system preference fallback.
    function initializeTheme() {
        const storedTheme = localStorage.getItem(THEME_KEY);
        if (storedTheme === "dark" || storedTheme === "light") {
            applyTheme(storedTheme);
            return;
        }

        const prefersDark =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;

        applyTheme(prefersDark ? "dark" : "light");
    }

    // Form submission: add task and reset composer inputs.
    taskForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const selectedPriority = document.querySelector("input[name='priority']:checked").value;
        const description = taskInput.value;
        const dueDate = taskDueDateInput.value;

        if (addTask(description, selectedPriority, dueDate)) {
            taskInput.value = "";
            taskDueDateInput.value = "";
            syncDateInputPresentation(taskDueDateInput, IOS_DATE_PLACEHOLDER);
            taskInput.focus();
        }
    });

    // Status filter buttons.
    filterButtons.forEach(button => {
        button.addEventListener("click", function () {
            activeFilter = this.dataset.filter;
            updateFilterButtons();
            renderTasks();
        });
    });

    // Priority filter dropdown.
    priorityFilterSelect.addEventListener("change", function () {
        activePriorityFilter = this.value;
        renderTasks();
    });

    // Sort mode dropdown.
    sortModeSelect.addEventListener("change", function () {
        sortMode = this.value;
        renderTasks();
    });

    // Theme toggle button.
    themeToggle.addEventListener("click", function () {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        applyTheme(currentTheme === "dark" ? "light" : "dark");
    });

    // Initial boot sequence.
    activePriorityFilter = priorityFilterSelect.value;
    sortMode = sortModeSelect.value;
    updateFilterButtons();
    applyDateInputFallback(taskDueDateInput);
    initializeTheme();
    renderTasks();
})();
