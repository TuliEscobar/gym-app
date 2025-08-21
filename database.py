import sqlite3

def get_db_connection():
    """Creates a database connection."""
    conn = sqlite3.connect('gym.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database and creates tables if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Enable foreign key support
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE
    );
    """)

    # Create muscle_groups table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS muscle_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)

    # Create exercises table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        muscle_group_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        weight REAL NOT NULL,
        sets INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        image_path TEXT,
        FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups (id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()

if __name__ == '__main__':
    print("Initializing database...")
    init_db()
    print("Database initialized successfully.")
