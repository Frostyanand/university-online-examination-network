import sqlite3
import json
from datetime import datetime
from config import DATABASE_PATH

def get_db():
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS test_history (
        id TEXT PRIMARY KEY,
        test_type TEXT NOT NULL,
        test_name TEXT NOT NULL,
        source_device TEXT NOT NULL,
        dest_target TEXT NOT NULL,
        command TEXT NOT NULL,
        output TEXT,
        status TEXT NOT NULL,
        duration_ms REAL,
        timestamp TEXT NOT NULL,
        capture_id TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fault_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_device TEXT,
        target_interface TEXT,
        status TEXT NOT NULL,
        details TEXT,
        recovery_time_ms REAL,
        timestamp TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS packet_captures (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        interface_name TEXT NOT NULL,
        filter_expr TEXT,
        packet_count INTEGER DEFAULT 0,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        device_id TEXT,
        message TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()

def log_event(event_type: str, message: str, device_id: str = None, details: dict = None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO system_events (event_type, device_id, message, details, timestamp) VALUES (?, ?, ?, ?, ?)",
        (event_type, device_id, message, json.dumps(details or {}), datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

