(function () {
    // Task Constructor with default priority changed to High
    function Task(description, priority = 'High') {
        this.description = description;
        this.completed = false;
        this.priority = priority;
    }

    // Add method to toggle the completion status of a task
    Task.prototype.toggleComplete = function () {
        this.completed = !this.completed;
    };

    // DOM Elements
    const taskForm = document.querySelector('#new-task-form');
    const taskInput = document.querySelector('#new-task-input');
    const tasksList = document.querySelector('#tasks-list');

    // Function to convert stored tasks back into Task instances
    function loadTasks() {
        const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        return storedTasks.map(task => {
            let loadedTask = new Task(task.description, task.priority);
            loadedTask.completed = task.completed;
            return loadedTask;
        });
    }

    // Initialize tasks array from local storage or empty array if nothing in storage
    const tasks = loadTasks();

    // Add a new task with provided description and priority, includes validation
    function addTask(taskDescription, priority) {
        if (!validateInput(taskDescription)) {
            alert("Please enter a valid task description. HTML tags are not allowed.");
            return;
        }
        const task = new Task(taskDescription, priority);
        tasks.push(task);
        saveTasks(); // Save tasks to local storage
        renderTasks(); // Update UI
        scrollToLastTask(); // Scroll to the last task added
    }

    // Input validation function to prevent XSS
    function validateInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML === input;
    }

    // Render tasks to the DOM
    function renderTasks() {
        tasksList.innerHTML = ''; // Clear current list
        tasks.forEach((task, index) => {
            const taskElement = document.createElement('li');
            taskElement.classList.add('task', `priority-${task.priority.toLowerCase()}`); // Add priority class

            if (task.completed) {
                taskElement.classList.add('done');
            }

            taskElement.innerHTML = `
                <span contenteditable="true" class="task-desc">${task.description}</span>
                <select class="task-priority">
                    <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
                    <option value="Medium" ${task.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                    <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
                </select>
                <button class="toggle">${task.completed ? 'Completed' : 'Complete'}</button>
                <button class="delete">Delete</button>
            `;

            // Event handlers for task manipulation
            taskElement.querySelector('.toggle').addEventListener('click', function () {
                toggleTaskComplete(index);
            });
            taskElement.querySelector('.delete').addEventListener('click', function () {
                removeTask(index);
            });

            // Save changes to task description
            taskElement.querySelector('.task-desc').addEventListener('blur', function () {
                updateTaskDescription(index, this.textContent);
            });

            // Save changes to task priority
            taskElement.querySelector('.task-priority').addEventListener('change', function () {
                updateTaskPriority(index, this.value);
            });

            tasksList.appendChild(taskElement);
        });
    }

    // Save tasks to local storage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Remove a task from the list
    function removeTask(index) {
        tasks.splice(index, 1);
        saveTasks(); // Update local storage
        renderTasks(); // Update UI
    }

    // Toggle the completion status of a task
    function toggleTaskComplete(index) {
        tasks[index].toggleComplete();
        saveTasks(); // Update local storage
        renderTasks(); // Update UI
    }

    // Update a task's description
    function updateTaskDescription(index, newDescription) {
        if (validateInput(newDescription)) {
            tasks[index].description = newDescription;
            saveTasks(); // Update local storage
            renderTasks(); // Update UI
        } else {
            alert("Invalid input. HTML tags are not allowed."); // Show error only if the input is invalid
        }
    }

    // Update a task's priority
    function updateTaskPriority(index, newPriority) {
        tasks[index].priority = newPriority;
        saveTasks(); // Update local storage
        renderTasks(); // Update UI
    }

    // Scroll to the last task added
    function scrollToLastTask() {
        const lastTask = tasksList.lastElementChild;
        if (lastTask) {
            lastTask.scrollIntoView({
                behavior: 'smooth',
                block: 'end'
            });
        }
    }

    // Handle new task submissions
    taskForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const priority = document.querySelector('input[name="priority"]:checked').value; // Get selected priority
        const newTaskDescription = taskInput.value.trim();
        if (newTaskDescription) {
            addTask(newTaskDescription, priority);
            taskInput.value = ''; // Clear the input after submitting
        } else {
            alert("Please add a task."); // Display alert when input is empty
        }
    });

    // Initial call to display any tasks already in storage
    renderTasks();
})();
