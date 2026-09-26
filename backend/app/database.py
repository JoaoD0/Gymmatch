import os
from contextlib import contextmanager

import mysql.connector
from mysql.connector.pooling import MySQLConnectionPool
from dotenv import load_dotenv

load_dotenv()

_pool = MySQLConnectionPool(
    pool_name="gymmatch_pool",
    pool_size=5,
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "gymmatch"),
)


@contextmanager
def get_connection():
    """Fornece uma conexão do pool e garante que ela seja fechada ao final."""
    conn = _pool.get_connection()
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_cursor(commit: bool = False):
    """Fornece um cursor (dict rows) já associado a uma conexão do pool."""
    with get_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        try:
            yield cursor
            if commit:
                conn.commit()
        except mysql.connector.Error:
            conn.rollback()
            raise
        finally:
            cursor.close()
