(function () {
    const STORAGE_KEY = "tasks";
    const PRIORITY_LEVELS = ["High", "Medium", "Low"];

    function Task(description, priority) {
        this.description = description;
        this.completed = false;
        this.priority = normalizePriority(priority);
    }

    Task.prototype.toggleComplete = function () {
        this.completed = !this.completed;
    };

    const taskForm = document.querySelector("#new-task-form");
    const taskInput = document.querySelector("#new-task-input");
    const tasksList = document.querySelector("#tasks-list");
    const emptyState = document.querySelector("#empty-state");
    const totalCount = document.querySelector("#count-total");
    const activeCount = document.querySelector("#count-active");
    const doneCount = document.querySelector("#count-done");

    const tasks = loadTasks();

    function normalizePriority(priority) {
        return PRIORITY_LEVELS.includes(priority) ? priority : "High";
    }

    function normalizeDescription(value) {
        return value.replace(/\s+/g, " ").trim();
    }

    function isValidDescription(value) {
        return value.length > 0 && !/[<>]/.test(value);
    }

    function createButton(label, buttonClass, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `btn ${buttonClass}`;
        button.textContent = label;
        button.addEventListener("click", onClick);
        return button;
    }

    function loadTasks() {
        const storedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        return storedTasks
            .filter(task => task && typeof task.description === "string")
            .map(task => {
                const loadedTask = new Task(normalizeDescription(task.description), task.priority);
                loadedTask.completed = Boolean(task.completed);
                return loadedTask;
            })
            .filter(task => isValidDescription(task.description));
    }

    function saveTasks() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }

    function updateSummary() {
        const done = tasks.filter(task => task.completed).length;
        const total = tasks.length;
        const active = total - done;

        totalCount.textContent = total;
        activeCount.textContent = active;
        doneCount.textContent = done;
    }

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

        main.appendChild(descInput);
        main.appendChild(stateText);

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

    function renderTasks() {
        tasksList.innerHTML = "";

        tasks.forEach((task, index) => {
            tasksList.appendChild(createTaskItem(task, index));
        });

        const hasTasks = tasks.length > 0;
        emptyState.hidden = hasTasks;

        updateSummary();
    }

    function addTask(description, priority) {
        const normalizedDescription = normalizeDescription(description);
        if (!normalizedDescription) {
            alert("Please add a task.");
            return false;
        }

        if (/[<>]/.test(normalizedDescription)) {
            alert("Please enter a valid task description without HTML characters.");
            return false;
        }

        tasks.unshift(new Task(normalizedDescription, priority));
        saveTasks();
        renderTasks();
        scrollToFirstTask();
        return true;
    }

    function removeTask(index) {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    }

    function toggleTaskComplete(index) {
        tasks[index].toggleComplete();
        saveTasks();
        renderTasks();
    }

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

    function updateTaskPriority(index, priority) {
        tasks[index].priority = normalizePriority(priority);
        saveTasks();
        renderTasks();
    }

    function scrollToFirstTask() {
        const firstTask = tasksList.firstElementChild;
        if (firstTask) {
            firstTask.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        }
    }

    taskForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const selectedPriority = document.querySelector("input[name='priority']:checked").value;
        const description = taskInput.value;

        if (addTask(description, selectedPriority)) {
            taskInput.value = "";
            taskInput.focus();
        }
    });

    renderTasks();
})();
