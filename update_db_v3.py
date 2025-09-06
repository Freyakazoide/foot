import sqlite3
import os

print("Iniciando atualização v3 do banco de dados...")
script_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(script_dir, 'foot.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE players ADD COLUMN potential INTEGER DEFAULT 10;")
    print("Coluna 'potential' adicionada à tabela 'players'.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Coluna 'potential' já existe em 'players'. Nenhuma alteração feita.")
    else:
        raise e

conn.commit()
conn.close()
print("Atualização do banco de dados v3 concluída!")