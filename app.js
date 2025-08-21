document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const userForm = document.getElementById('user-form');
    const newUsernameInput = document.getElementById('new-username-input');
    const userDropdown = document.getElementById('user-dropdown');
    const muscleGroupSection = document.getElementById('muscle-group-section');
    const muscleGroupList = document.getElementById('muscle-group-list');
    const addMuscleGroupForm = document.getElementById('add-muscle-group-form');
    const muscleGroupNameInput = document.getElementById('muscle-group-name-input');
    const exercisesSection = document.getElementById('exercises');
    const currentMuscleGroupName = document.getElementById('current-muscle-group-name');
    const exerciseList = document.getElementById('exercise-list');
    const addExerciseForm = document.getElementById('add-exercise-form');
    const exerciseNameInput = document.getElementById('exercise-name-input');
    const weightInput = document.getElementById('weight-input');
    const setsInput = document.getElementById('sets-input');
    const repsInput = document.getElementById('reps-input');
    const exerciseImageInput = document.getElementById('exercise-image-input');
    const backToMuscleGroupsBtn = document.getElementById('back-to-muscle-groups');
    const editModal = document.getElementById('edit-modal');
    const editExerciseForm = document.getElementById('edit-exercise-form');
    const editExerciseNameInput = document.getElementById('edit-exercise-name-input');
    const editWeightInput = document.getElementById('edit-weight-input');
    const editSetsInput = document.getElementById('edit-sets-input');
    const editRepsInput = document.getElementById('edit-reps-input');
    const editExerciseImageInput = document.getElementById('edit-exercise-image-input');
    const cancelEditBtn = document.getElementById('cancel-edit');

    // App State
    let appData = JSON.parse(localStorage.getItem('gymAppData')) || { users: {}, currentUser: null };
    let currentMuscleGroupId = null;
    let editingExerciseId = null;

    // Data Functions
    function saveData() {
        try {
            localStorage.setItem('gymAppData', JSON.stringify(appData));
        } catch (e) {
            console.error("Error saving to localStorage:", e);
            alert("Error: Could not save data. The storage may be full.");
        }
    }

    // User Functions
    function renderUsers() {
        userDropdown.innerHTML = '<option value="">Seleccionar Usuario</option>';
        for (const username in appData.users) {
            const option = document.createElement('option');
            option.value = username;
            option.textContent = username;
            userDropdown.appendChild(option);
        }
        userDropdown.value = appData.currentUser;
        muscleGroupSection.style.display = appData.currentUser ? 'block' : 'none';
        if (appData.currentUser) renderMuscleGroups();
    }

    function addUser(username) {
        if (!appData.users[username]) {
            appData.users[username] = { muscleGroups: [] };
            appData.currentUser = username;
            saveData();
            renderUsers();
            showMuscleGroupsView();
        } else {
            alert('User already exists!');
        }
    }

    function switchUser(username) {
        appData.currentUser = username;
        saveData();
        renderUsers();
        showMuscleGroupsView();
    }

    // Muscle Group Functions
    function renderMuscleGroups() {
        muscleGroupList.innerHTML = '';
        if (!appData.currentUser || !appData.users[appData.currentUser]) return;
        const muscleGroups = appData.users[appData.currentUser].muscleGroups;
        muscleGroups.forEach(mg => {
            const li = document.createElement('li');
            li.textContent = mg.name;
            li.dataset.id = mg.id;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteMuscleGroup(mg.id);
            });
            li.appendChild(deleteBtn);
            li.addEventListener('click', () => showExercisesView(mg.id));
            muscleGroupList.appendChild(li);
        });
    }

    function addMuscleGroup(name) {
        if (!appData.currentUser) return;
        const newMuscleGroup = { id: Date.now(), name, exercises: [] };
        appData.users[appData.currentUser].muscleGroups.push(newMuscleGroup);
        saveData();
        renderMuscleGroups();
    }

    function deleteMuscleGroup(id) {
        if (!appData.currentUser) return;
        const user = appData.users[appData.currentUser];
        user.muscleGroups = user.muscleGroups.filter(mg => mg.id !== id);
        saveData();
        renderMuscleGroups();
    }

    // Exercise Functions
    function renderExercises() {
        exerciseList.innerHTML = '';
        if (!appData.currentUser || !currentMuscleGroupId) return;
        const muscleGroup = appData.users[appData.currentUser].muscleGroups.find(mg => mg.id === currentMuscleGroupId);
        if (!muscleGroup) return;

        muscleGroup.exercises.forEach(exercise => {
            const li = document.createElement('li');
            const imageHTML = exercise.imageDataURL ? `<img src="${exercise.imageDataURL}" alt="${exercise.name}" class="exercise-img">` : '';
            li.innerHTML = `
                <div class="exercise-info">
                    ${imageHTML}
                    <span>${exercise.name} - ${exercise.weight}kg, ${exercise.sets} sets, ${exercise.reps} reps</span>
                </div>
                <div class="exercise-actions">
                    <button class="edit-btn" data-id="${exercise.id}">Edit</button>
                    <button class="delete-btn" data-id="${exercise.id}">Delete</button>
                </div>
            `;
            li.querySelector('.edit-btn').addEventListener('click', () => openEditModal(exercise.id));
            li.querySelector('.delete-btn').addEventListener('click', () => deleteExercise(exercise.id));
            exerciseList.appendChild(li);
        });
    }

    async function addExercise(name, weight, sets, reps, imageFile) {
        if (!appData.currentUser || !currentMuscleGroupId) return;
        let imageDataURL = null;
        if (imageFile) {
            imageDataURL = await readFileAsDataURL(imageFile);
        }
        const newExercise = { id: Date.now(), name, weight, sets, reps, imageDataURL };
        const muscleGroup = appData.users[appData.currentUser].muscleGroups.find(mg => mg.id === currentMuscleGroupId);
        muscleGroup.exercises.push(newExercise);
        saveData();
        renderExercises();
    }

    function deleteExercise(id) {
        if (!appData.currentUser || !currentMuscleGroupId) return;
        const muscleGroup = appData.users[appData.currentUser].muscleGroups.find(mg => mg.id === currentMuscleGroupId);
        muscleGroup.exercises = muscleGroup.exercises.filter(ex => ex.id !== id);
        saveData();
        renderExercises();
    }

    async function updateExercise(id, name, weight, sets, reps, imageFile) {
        if (!appData.currentUser || !currentMuscleGroupId) return;
        const muscleGroup = appData.users[appData.currentUser].muscleGroups.find(mg => mg.id === currentMuscleGroupId);
        const exercise = muscleGroup.exercises.find(ex => ex.id === id);
        if (exercise) {
            exercise.name = name;
            exercise.weight = weight;
            exercise.sets = sets;
            exercise.reps = reps;
            if (imageFile) {
                exercise.imageDataURL = await readFileAsDataURL(imageFile);
            }
            saveData();
            renderExercises();
            closeEditModal();
        }
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // View Management
    function showMuscleGroupsView() {
        muscleGroupSection.style.display = appData.currentUser ? 'block' : 'none';
        exercisesSection.style.display = 'none';
        currentMuscleGroupId = null;
        if (appData.currentUser) renderMuscleGroups();
    }

    function showExercisesView(id) {
        currentMuscleGroupId = id;
        const muscleGroup = appData.users[appData.currentUser].muscleGroups.find(mg => mg.id === id);
        currentMuscleGroupName.textContent = muscleGroup.name;
        muscleGroupSection.style.display = 'none';
        exercisesSection.style.display = 'block';
        renderExercises();
    }

    // Modal Management
    function openEditModal(id) {
        editingExerciseId = id;
        const muscleGroup = appData.users[appData.currentUser].muscleGroups.find(mg => mg.id === currentMuscleGroupId);
        const exercise = muscleGroup.exercises.find(ex => ex.id === id);
        if (exercise) {
            editExerciseNameInput.value = exercise.name;
            editWeightInput.value = exercise.weight;
            editSetsInput.value = exercise.sets;
            editRepsInput.value = exercise.reps;
            editExerciseImageInput.value = ''; // Clear previous file selection
            editModal.style.display = 'flex';
        }
    }

    function closeEditModal() {
        editingExerciseId = null;
        editModal.style.display = 'none';
    }

    // Event Listeners
    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = newUsernameInput.value.trim();
        if (username) addUser(username);
    });

    userDropdown.addEventListener('change', (e) => {
        const username = e.target.value;
        if (username) {
            switchUser(username);
        } else {
            appData.currentUser = null;
            saveData();
            showMuscleGroupsView();
        }
    });

    addMuscleGroupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = muscleGroupNameInput.value.trim();
        if (name) {
            addMuscleGroup(name);
            muscleGroupNameInput.value = '';
        }
    });

    addExerciseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = exerciseNameInput.value.trim();
        const weight = weightInput.value.trim();
        const sets = setsInput.value.trim();
        const reps = repsInput.value.trim();
        const imageFile = exerciseImageInput.files[0];
        if (name && weight && sets && reps) {
            await addExercise(name, weight, sets, reps, imageFile);
            addExerciseForm.reset();
        }
    });

    editExerciseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = editExerciseNameInput.value.trim();
        const weight = editWeightInput.value.trim();
        const sets = editSetsInput.value.trim();
        const reps = editRepsInput.value.trim();
        const imageFile = editExerciseImageInput.files[0];
        if (name && weight && sets && reps && editingExerciseId) {
            await updateExercise(editingExerciseId, name, weight, sets, reps, imageFile);
        }
    });

    backToMuscleGroupsBtn.addEventListener('click', showMuscleGroupsView);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });

    // Initial Render
    renderUsers();
    showMuscleGroupsView();
});
