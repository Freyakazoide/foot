import sqlite3
import os

print("Iniciando atualização do banco de dados...")
script_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(script_dir, 'foot.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Adiciona a coluna para guardar o ID do clube do jogador
    cursor.execute("ALTER TABLE game_state ADD COLUMN player_club_id INTEGER;")
    print("Coluna 'player_club_id' adicionada à tabela 'game_state'.")
except sqlite3.OperationalError as e:
    # Ignora o erro se a coluna já existir, para que o script possa ser rodado várias vezes
    if "duplicate column name" in str(e):
        print("Coluna 'player_club_id' já existe. Nenhuma alteração feita.")
    else:
        raise e

conn.commit()
conn.close()
print("Atualização do banco de dados concluída com sucesso!")