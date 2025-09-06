import sqlite3

# Conecta ao banco de dados (cria o arquivo se não existir)
conn = sqlite3.connect('foot.db')
cursor = conn.cursor()

print("Conectado ao banco de dados foot.db.")

# --- TABELAS EXISTENTES (VERIFICADAS) ---
cursor.execute("""
CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    reputation INTEGER DEFAULT 1000,
    finance_transfer_budget REAL DEFAULT 1000000.0,
    finance_wage_budget REAL DEFAULT 50000.0
);
""")
print("Tabela 'clubs' verificada/criada.")

cursor.execute("""
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, age INTEGER NOT NULL, nationality TEXT NOT NULL, position TEXT NOT NULL,
    club_id INTEGER,
    finishing INTEGER DEFAULT 10, passing INTEGER DEFAULT 10, tackling INTEGER DEFAULT 10,
    vision INTEGER DEFAULT 10, positioning INTEGER DEFAULT 10, determination INTEGER DEFAULT 10,
    pace INTEGER DEFAULT 10, stamina INTEGER DEFAULT 10, strength INTEGER DEFAULT 10,
    FOREIGN KEY (club_id) REFERENCES clubs (id)
);
""")
print("Tabela 'players' verificada/criada.")

# --- NOVAS TABELAS E ATUALIZAÇÕES ---

# Tabela de Competições
cursor.execute("""
CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'league' -- 'league' ou 'cup'
);
""")
print("NOVO: Tabela 'competitions' verificada/criada.")

# Tabela de Classificação da Liga
cursor.execute("""
CREATE TABLE IF NOT EXISTS league_tables (
    competition_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL,
    position INTEGER DEFAULT 0,
    played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    goal_difference INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    FOREIGN KEY (competition_id) REFERENCES competitions (id),
    FOREIGN KEY (club_id) REFERENCES clubs (id),
    PRIMARY KEY (competition_id, club_id)
);
""")
print("NOVO: Tabela 'league_tables' verificada/criada.")

# Apagando e recriando a tabela de partidas para adicionar a referência da competição
cursor.execute("DROP TABLE IF EXISTS fixtures;")
cursor.execute("""
CREATE TABLE fixtures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    match_date TEXT,
    round INTEGER,
    home_club_id INTEGER NOT NULL,
    away_club_id INTEGER NOT NULL,
    home_goals INTEGER,
    away_goals INTEGER,
    is_played INTEGER DEFAULT 0, -- 0 para não jogado, 1 para jogado
    FOREIGN KEY (competition_id) REFERENCES competitions (id),
    FOREIGN KEY (home_club_id) REFERENCES clubs (id),
    FOREIGN KEY (away_club_id) REFERENCES clubs (id)
);
""")
print("ATUALIZADO: Tabela 'fixtures' recriada com referência à competição.")

# NOVO: Tabela para guardar o estado atual do jogo
cursor.execute("""
CREATE TABLE IF NOT EXISTS game_state (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Garante que haverá apenas uma linha
    current_date TEXT NOT NULL
);
""")
print("NOVO: Tabela 'game_state' verificada/criada.")

# Salva as alterações e fecha a conexão
conn.commit()
conn.close()

print("\nBanco de dados atualizado com sucesso! Conexão fechada.")