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
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, age INTEGER NOT NULL, nationality TEXT NOT NULL, position TEXT NOT NULL,
    club_id INTEGER, wage REAL DEFAULT 1000.0, contract_expires TEXT, potential INTEGER DEFAULT 10,

    -- Atributos Técnicos (1-20)
    crossing INTEGER DEFAULT 10, dribbling INTEGER DEFAULT 10, finishing INTEGER DEFAULT 10,
    free_kicks INTEGER DEFAULT 10, heading INTEGER DEFAULT 10, long_shots INTEGER DEFAULT 10,
    marking INTEGER DEFAULT 10, tackling INTEGER DEFAULT 10, passing INTEGER DEFAULT 10,
    penalties INTEGER DEFAULT 10,

    -- Atributos Mentais (1-20)
    aggression INTEGER DEFAULT 10, anticipation INTEGER DEFAULT 10, composure INTEGER DEFAULT 10,
    concentration INTEGER DEFAULT 10, decisions INTEGER DEFAULT 10, determination INTEGER DEFAULT 10,
    leadership INTEGER DEFAULT 10, positioning INTEGER DEFAULT 10, vision INTEGER DEFAULT 10,
    work_rate INTEGER DEFAULT 10,

    -- Atributos Físicos (1-20)
    acceleration INTEGER DEFAULT 10, agility INTEGER DEFAULT 10, balance INTEGER DEFAULT 10,
    stamina INTEGER DEFAULT 10, strength INTEGER DEFAULT 10, pace INTEGER DEFAULT 10, -- Pace/Velocidade é o mesmo

    FOREIGN KEY (club_id) REFERENCES clubs (id)
);
""")
print("Tabela 'players' verificada/criada com novos atributos detalhados.")

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