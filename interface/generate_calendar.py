import sqlite3
import os
import random

def generate_season():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, 'foot.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Iniciando a geração da temporada...")

    # APAGA E RECRIA AS TABELAS RELACIONADAS À TEMPORADA
    cursor.execute("DROP TABLE IF EXISTS league_tables;")
    cursor.execute("DROP TABLE IF EXISTS fixtures;")
    cursor.execute("DROP TABLE IF EXISTS competitions;")
    cursor.execute("DROP TABLE IF EXISTS game_state;")

    cursor.execute("""
    CREATE TABLE competitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, country TEXT NOT NULL, type TEXT );
    """)
    cursor.execute("""
    CREATE TABLE league_tables (
        competition_id INTEGER NOT NULL, club_id INTEGER NOT NULL, position INTEGER DEFAULT 0, played INTEGER DEFAULT 0, 
        wins INTEGER DEFAULT 0, draws INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, goals_for INTEGER DEFAULT 0,
        goals_against INTEGER DEFAULT 0, goal_difference INTEGER DEFAULT 0, points INTEGER DEFAULT 0,
        FOREIGN KEY (competition_id) REFERENCES competitions (id), FOREIGN KEY (club_id) REFERENCES clubs (id),
        PRIMARY KEY (competition_id, club_id) );
    """)
    cursor.execute("""
    CREATE TABLE fixtures (
        id INTEGER PRIMARY KEY AUTOINCREMENT, competition_id INTEGER NOT NULL, match_date TEXT, round INTEGER,
        home_club_id INTEGER NOT NULL, away_club_id INTEGER NOT NULL, home_goals INTEGER, away_goals INTEGER,
        is_played INTEGER DEFAULT 0, FOREIGN KEY (competition_id) REFERENCES competitions (id),
        FOREIGN KEY (home_club_id) REFERENCES clubs (id), FOREIGN KEY (away_club_id) REFERENCES clubs (id) );
    """)
    cursor.execute("""
    CREATE TABLE game_state (
        id INTEGER PRIMARY KEY, current_date TEXT NOT NULL, player_club_id INTEGER );
    """)
    print("Tabelas de temporada recriadas.")

    # CRIA A COMPETIÇÃO
    cursor.execute("INSERT INTO competitions (name, country, type) VALUES (?, ?, ?)", 
                   ('Campeonato Brasileiro', 'Brasil', 'league'))
    competition_id = cursor.lastrowid
    conn.commit()

    # INSERE OS CLUBES NA TABELA DE CLASSIFICAÇÃO
    cursor.execute("SELECT id FROM clubs")
    club_ids = [row[0] for row in cursor.fetchall()]
    if len(club_ids) < 2:
        print("Erro: Precisa de pelo menos 2 clubes para criar uma competição.")
        return

    for club_id in club_ids:
        cursor.execute("INSERT INTO league_tables (competition_id, club_id) VALUES (?, ?)", (competition_id, club_id))
    conn.commit()

    # GERA OS CONFRONTOS (FIXTURES)
    random.shuffle(club_ids)
    if len(club_ids) % 2 != 0:
        club_ids.append(None)
    
    num_teams = len(club_ids)
    num_rounds = num_teams - 1
    
    fixtures = []
    for round_num in range(num_rounds):
        round_fixtures = []
        for i in range(num_teams // 2):
            home = club_ids[i]
            away = club_ids[num_teams - 1 - i]
            if home is not None and away is not None:
                round_fixtures.append((home, away))
        fixtures.append(round_fixtures)
        club_ids.insert(1, club_ids.pop())

    return_fixtures = []
    for round_list in fixtures:
        return_round = [(away, home) for home, away in round_list]
        return_fixtures.append(return_round)
    
    all_fixtures = fixtures + return_fixtures

    # INSERE OS JOGOS NA BASE DE DADOS
    round_counter = 1
    for round_list in all_fixtures:
        for home_id, away_id in round_list:
            cursor.execute("INSERT INTO fixtures (competition_id, round, home_club_id, away_club_id) VALUES (?, ?, ?, ?)", 
                           (competition_id, round_counter, home_id, away_id))
        round_counter += 1

    # DEFINE A DATA INICIAL DO JOGO
    start_date = "2025-01-20"
    cursor.execute("INSERT INTO game_state (id, current_date) VALUES (1, ?)", (start_date,))

    conn.commit()
    conn.close()
    
    print("\nTemporada gerada com sucesso!")

if __name__ == "__main__":
    generate_season()