import sqlite3
import os

print("Iniciando atualização v2 do banco de dados...")
script_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(script_dir, 'foot.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE clubs ADD COLUMN balance REAL DEFAULT 5000000.0;")
    print("Coluna 'balance' adicionada à tabela 'clubs'.")
except sqlite3.OperationalError:
    print("Coluna 'balance' já existe em 'clubs'.")

try:
    cursor.execute("ALTER TABLE players ADD COLUMN wage REAL DEFAULT 1000.0;")
    print("Coluna 'wage' adicionada à tabela 'players'.")
except sqlite3.OperationalError:
    print("Coluna 'wage' já existe em 'players'.")

try:
    cursor.execute("ALTER TABLE players ADD COLUMN contract_expires TEXT;")
    print("Coluna 'contract_expires' adicionada à tabela 'players'.")
except sqlite3.OperationalError:
    print("Coluna 'contract_expires' já existe em 'players'.")

conn.commit()
conn.close()
print("Atualização do banco de dados v2 concluída!")