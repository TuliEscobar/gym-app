document.addEventListener('DOMContentLoaded', () => {
    const routineList = document.getElementById('routine-list');
    const addRoutineForm = document.getElementById('add-routine-form');
    const routineNameInput = document.getElementById('routine-name-input');
    const exercisesSection = document.getElementById('exercises');
    const currentRoutineName = document.getElementById('current-routine-name');
    const exerciseList = document.getElementById('exercise-list');
    const addExerciseForm = document.getElementById('add-exercise-form');
    const exerciseNameInput = document.getElementById('exercise-name-input');
    const weightInput = document.getElementById('weight-input');
    const setsInput = document.getElementById('sets-input');
    const repsInput = document.getElementById('reps-input');
    const backToRoutinesBtn = document.getElementById('back-to-routines');
    const routinesSection = document.getElementById('routines');

    let routines = JSON.parse(localStorage.getItem('routines')) || [];
    let currentRoutineId = null;

    function saveRoutines() {
        localStorage.setItem('routines', JSON.stringify(routines));
    }

    function renderRoutines() {
        routineList.innerHTML = '';
        routines.forEach(routine => {
            const li = document.createElement('li');
            li.textContent = routine.name;
            li.dataset.id = routine.id;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteRoutine(routine.id);
            });

            li.appendChild(deleteBtn);
            li.addEventListener('click', () => showExercises(routine.id));
            routineList.appendChild(li);
        });
    }

    function addRoutine(name) {
        const newRoutine = {
            id: Date.now(),
            name,
            exercises: []
        };
        routines.push(newRoutine);
        saveRoutines();
        renderRoutines();
    }

    function deleteRoutine(id) {
        routines = routines.filter(routine => routine.id !== id);
        saveRoutines();
        renderRoutines();
    }

    function showRoutines() {
        routinesSection.style.display = 'block';
        exercisesSection.style.display = 'none';
        currentRoutineId = null;
    }

    function showExercises(id) {
        currentRoutineId = id;
        const routine = routines.find(r => r.id === id);
        currentRoutineName.textContent = routine.name;
        routinesSection.style.display = 'none';
        exercisesSection.style.display = 'block';
        renderExercises();
    }

    function renderExercises() {
        exerciseList.innerHTML = '';
        const routine = routines.find(r => r.id === currentRoutineId);
        if (!routine) return;

        routine.exercises.forEach(exercise => {
            const li = document.createElement('li');
            li.textContent = `${exercise.name} - ${exercise.weight}kg, ${exercise.sets} sets, ${exercise.reps} reps`;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteExercise(exercise.id);
            });

            li.appendChild(deleteBtn);
            exerciseList.appendChild(li);
        });
    }

    function addExercise(name, weight, sets, reps) {
        const routine = routines.find(r => r.id === currentRoutineId);
        const newExercise = {
            id: Date.now(),
            name,
            weight,
            sets,
            reps
        };
        routine.exercises.push(newExercise);
        saveRoutines();
        renderExercises();
    }

    function deleteExercise(id) {
        const routine = routines.find(r => r.id === currentRoutineId);
        routine.exercises = routine.exercises.filter(ex => ex.id !== id);
        saveRoutines();
        renderExercises();
    }

    addRoutineForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = routineNameInput.value.trim();
        if (name) {
            addRoutine(name);
            routineNameInput.value = '';
        }
    });

    addExerciseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = exerciseNameInput.value.trim();
        const weight = weightInput.value.trim();
        const sets = setsInput.value.trim();
        const reps = repsInput.value.trim();

        if (name && weight && sets && reps) {
            addExercise(name, weight, sets, reps);
            exerciseNameInput.value = '';
            weightInput.value = '';
            setsInput.value = '';
            repsInput.value = '';
        }
    });

    backToRoutinesBtn.addEventListener('click', showRoutines);

    renderRoutines();
});
