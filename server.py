import sqlite3
import os
from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
from database import init_db, get_db_connection
from werkzeug.utils import secure_filename

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Enable CORS for all routes
CORS(app)

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize the database
init_db()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- HTML Rendering Route ---
@app.route('/')
def index():
    return render_template('index.html')

# --- Static File Route for Uploaded Images ---
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- API Routes ---

# == USERS ==
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    users = conn.execute('SELECT * FROM users ORDER BY username').fetchall()
    conn.close()
    return jsonify([dict(row) for row in users])

@app.route('/api/users', methods=['POST'])
def add_user():
    data = request.get_json()
    username = data.get('username')
    if not username:
        return jsonify({'error': 'Username is required'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.execute('INSERT INTO users (username) VALUES (?)', (username,))
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Username already exists'}), 409
    finally:
        conn.close()

    return jsonify({'id': user_id, 'username': username}), 201

# == MUSCLE GROUPS ==
@app.route('/api/users/<int:user_id>/musclegroups', methods=['GET'])
def get_muscle_groups(user_id):
    conn = get_db_connection()
    groups = conn.execute('SELECT * FROM muscle_groups WHERE user_id = ? ORDER BY name', (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in groups])

@app.route('/api/users/<int:user_id>/musclegroups', methods=['POST'])
def add_muscle_group(user_id):
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Muscle group name is required'}), 400

    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO muscle_groups (user_id, name) VALUES (?, ?)', (user_id, name))
    conn.commit()
    group_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': group_id, 'user_id': user_id, 'name': name}), 201

@app.route('/api/musclegroups/<int:group_id>', methods=['DELETE'])
def delete_muscle_group(group_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM muscle_groups WHERE id = ?', (group_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Muscle group deleted successfully'}), 200

# == EXERCISES ==
@app.route('/api/musclegroups/<int:group_id>/exercises', methods=['GET'])
def get_exercises(group_id):
    conn = get_db_connection()
    exercises = conn.execute('SELECT * FROM exercises WHERE muscle_group_id = ? ORDER BY name', (group_id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in exercises])

@app.route('/api/musclegroups/<int:group_id>/exercises', methods=['POST'])
def add_exercise(group_id):
    # Form data is expected because of file upload
    name = request.form.get('name')
    weight = request.form.get('weight')
    sets = request.form.get('sets')
    reps = request.form.get('reps')

    if not all([name, weight, sets, reps]):
        return jsonify({'error': 'Missing exercise data'}), 400

    image_path = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(image_path)
            image_path = f'/uploads/{filename}' # Store URL path

    conn = get_db_connection()
    cursor = conn.execute(
        'INSERT INTO exercises (muscle_group_id, name, weight, sets, reps, image_path) VALUES (?, ?, ?, ?, ?, ?)',
        (group_id, name, weight, sets, reps, image_path)
    )
    conn.commit()
    exercise_id = cursor.lastrowid
    conn.close()

    return jsonify({
        'id': exercise_id, 'muscle_group_id': group_id, 'name': name, 'weight': weight,
        'sets': sets, 'reps': reps, 'image_path': image_path
    }), 201

@app.route('/api/exercises/<int:exercise_id>', methods=['PUT'])
def update_exercise(exercise_id):
    name = request.form.get('name')
    weight = request.form.get('weight')
    sets = request.form.get('sets')
    reps = request.form.get('reps')

    if not all([name, weight, sets, reps]):
        return jsonify({'error': 'Missing exercise data'}), 400

    conn = get_db_connection()

    # Handle image update
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(image_path)
            image_path = f'/uploads/{filename}'
            conn.execute(
                'UPDATE exercises SET name = ?, weight = ?, sets = ?, reps = ?, image_path = ? WHERE id = ?',
                (name, weight, sets, reps, image_path, exercise_id)
            )
        else: # If a file is sent but it's empty or not allowed, don't update image
            conn.execute(
                'UPDATE exercises SET name = ?, weight = ?, sets = ?, reps = ? WHERE id = ?',
                (name, weight, sets, reps, exercise_id)
            )
    else: # No new image sent, don't update the image path
        conn.execute(
            'UPDATE exercises SET name = ?, weight = ?, sets = ?, reps = ? WHERE id = ?',
            (name, weight, sets, reps, exercise_id)
        )

    conn.commit()

    # Fetch the updated exercise to return it
    updated_exercise = conn.execute('SELECT * FROM exercises WHERE id = ?', (exercise_id,)).fetchone()
    conn.close()

    if updated_exercise is None:
        return jsonify({'error': 'Exercise not found'}), 404

    return jsonify(dict(updated_exercise)), 200

@app.route('/api/exercises/<int:exercise_id>', methods=['DELETE'])
def delete_exercise(exercise_id):
    conn = get_db_connection()
    # Optional: Delete the image file from the server
    exercise = conn.execute('SELECT image_path FROM exercises WHERE id = ?', (exercise_id,)).fetchone()
    if exercise and exercise['image_path']:
        # Path is stored as /uploads/filename.jpg, we need to get the local path
        local_image_path = exercise['image_path'].lstrip('/')
        if os.path.exists(local_image_path):
            os.remove(local_image_path)

    conn.execute('DELETE FROM exercises WHERE id = ?', (exercise_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Exercise deleted successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
