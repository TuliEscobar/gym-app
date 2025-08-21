document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://127.0.0.1:5000/api';

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
    const exerciseImageInput = document.getElementById('exercise-image-input');
    const backToMuscleGroupsBtn = document.getElementById('back-to-muscle-groups');
    const editModal = document.getElementById('edit-modal');
    const editExerciseForm = document.getElementById('edit-exercise-form');
    const cancelEditBtn = document.getElementById('cancel-edit');

    // App State
    let currentUser = null;
    let currentMuscleGroup = null;

    // --- API Functions ---
    async function apiFetch(endpoint, options = {}) {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }
        if (response.status === 204 || response.status === 200 && options.method === 'DELETE') {
            return; // No content to parse
        }
        return response.json();
    }

    // --- User Functions ---
    async function renderUsers() {
        try {
            const users = await apiFetch('/users');
            userDropdown.innerHTML = '<option value="">Seleccionar Usuario</option>';
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.username;
                userDropdown.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    async function addUser(username) {
        try {
            const newUser = await apiFetch('/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            await renderUsers();
            userDropdown.value = newUser.id;
            switchUser(newUser.id);
        } catch (error) {
            console.error('Failed to add user:', error);
            alert(error.message);
        }
    }

    function switchUser(userId) {
        currentUser = userId ? { id: parseInt(userId, 10) } : null;
        if (currentUser) {
            muscleGroupSection.style.display = 'block';
            renderMuscleGroups();
        } else {
            muscleGroupSection.style.display = 'none';
        }
        showMuscleGroupsView();
    }

    // --- Muscle Group Functions ---
    async function renderMuscleGroups() {
        muscleGroupList.innerHTML = '';
        if (!currentUser) return;
        try {
            const groups = await apiFetch(`/users/${currentUser.id}/musclegroups`);
            groups.forEach(group => {
                const li = document.createElement('li');
                li.textContent = group.name;
                li.dataset.id = group.id;
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.classList.add('delete-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteMuscleGroup(group.id);
                });
                li.appendChild(deleteBtn);
                li.addEventListener('click', () => showExercisesView(group));
                muscleGroupList.appendChild(li);
            });
        } catch (error) {
            console.error('Failed to load muscle groups:', error);
        }
    }

    async function addMuscleGroup(name) {
        if (!currentUser) return;
        try {
            await apiFetch(`/users/${currentUser.id}/musclegroups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            renderMuscleGroups();
        } catch (error) {
            console.error('Failed to add muscle group:', error);
        }
    }

    async function deleteMuscleGroup(groupId) {
        if (!confirm('Are you sure you want to delete this muscle group and all its exercises?')) return;
        try {
            await apiFetch(`/musclegroups/${groupId}`, { method: 'DELETE' });
            renderMuscleGroups();
        } catch (error) {
            console.error('Failed to delete muscle group:', error);
        }
    }

    // --- Exercise Functions ---
    async function renderExercises() {
        exerciseList.innerHTML = '';
        if (!currentMuscleGroup) return;
        try {
            const exercises = await apiFetch(`/musclegroups/${currentMuscleGroup.id}/exercises`);
            exercises.forEach(exercise => {
                const li = document.createElement('li');
                const imageHTML = exercise.image_path ? `<img src="${exercise.image_path}" alt="${exercise.name}" class="exercise-img">` : '';
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
                li.querySelector('.edit-btn').addEventListener('click', () => openEditModal(exercise));
                li.querySelector('.delete-btn').addEventListener('click', () => deleteExercise(exercise.id));
                exerciseList.appendChild(li);
            });
        } catch (error) {
            console.error('Failed to load exercises:', error);
        }
    }

    async function addExercise(formData) {
        if (!currentMuscleGroup) return;
        try {
            await apiFetch(`/musclegroups/${currentMuscleGroup.id}/exercises`, {
                method: 'POST',
                body: formData,
            });
            renderExercises();
        } catch (error) {
            console.error('Failed to add exercise:', error);
        }
    }

    async function deleteExercise(exerciseId) {
        if (!confirm('Are you sure you want to delete this exercise?')) return;
        try {
            await apiFetch(`/exercises/${exerciseId}`, { method: 'DELETE' });
            renderExercises();
        } catch (error) {
            console.error('Failed to delete exercise:', error);
        }
    }

    async function updateExercise(exerciseId, formData) {
        try {
            await apiFetch(`/exercises/${exerciseId}`, {
                method: 'PUT',
                body: formData,
            });
            renderExercises();
            closeEditModal();
        } catch (error) {
            console.error('Failed to update exercise:', error);
        }
    }

    // --- View Management ---
    function showMuscleGroupsView() {
        muscleGroupSection.style.display = currentUser ? 'block' : 'none';
        exercisesSection.style.display = 'none';
        currentMuscleGroup = null;
        if (currentUser) renderMuscleGroups();
    }

    function showExercisesView(group) {
        currentMuscleGroup = group;
        currentMuscleGroupName.textContent = group.name;
        muscleGroupSection.style.display = 'none';
        exercisesSection.style.display = 'block';
        renderExercises();
    }

    // --- Modal Management ---
    function openEditModal(exercise) {
        editModal.style.display = 'flex';
        editExerciseForm.dataset.exerciseId = exercise.id;
        editExerciseForm.querySelector('#edit-exercise-name-input').value = exercise.name;
        editExerciseForm.querySelector('#edit-weight-input').value = exercise.weight;
        editExerciseForm.querySelector('#edit-sets-input').value = exercise.sets;
        editExerciseForm.querySelector('#edit-reps-input').value = exercise.reps;
    }

    function closeEditModal() {
        editModal.style.display = 'none';
    }

    // --- Event Listeners ---
    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = newUsernameInput.value.trim();
        if (username) {
            addUser(username);
            newUsernameInput.value = '';
        }
    });

    userDropdown.addEventListener('change', (e) => {
        switchUser(e.target.value);
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
        const formData = new FormData(addExerciseForm);
        // a file input's value is the filename, not the file. We need to get the file from the files property
        const imageFile = exerciseImageInput.files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        await addExercise(formData);
        addExerciseForm.reset();
    });

    editExerciseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const exerciseId = e.target.dataset.exerciseId;
        const formData = new FormData(e.target);
        const imageFile = e.target.querySelector('#edit-exercise-image-input').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        await updateExercise(exerciseId, formData);
    });

    backToMuscleGroupsBtn.addEventListener('click', showMuscleGroupsView);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });

    // --- Initial Load ---
    renderUsers();
    showMuscleGroupsView();
});
