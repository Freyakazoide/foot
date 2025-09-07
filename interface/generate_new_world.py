import sqlite3
import random
import os
import sys
import argparse
from faker import Faker
from datetime import date, timedelta

def generate_attributes(position):
    attrs = {'crossing': random.randint(1, 15), 'dribbling': random.randint(1, 15), 'finishing': random.randint(1, 15),'free_kicks': random.randint(1, 15), 'heading': random.randint(1, 15), 'long_shots': random.randint(1, 15),'marking': random.randint(1, 15), 'tackling': random.randint(1, 15), 'passing': random.randint(1, 15),'penalties': random.randint(1, 15), 'aggression': random.randint(1, 15), 'anticipation': random.randint(1, 15),'composure': random.randint(1, 15), 'concentration': random.randint(1, 15), 'decisions': random.randint(1, 15),'determination': random.randint(1, 15), 'leadership': random.randint(1, 15), 'positioning': random.randint(1, 15),'vision': random.randint(1, 15), 'work_rate': random.randint(1, 15), 'acceleration': random.randint(1, 15),'agility': random.randint(1, 15), 'balance': random.randint(1, 15), 'stamina': random.randint(1, 15),'strength': random.randint(1, 15), 'pace': random.randint(1, 15)}
    if position == 'Goleiro': attrs.update({'anticipation': random.randint(10, 20), 'concentration': random.randint(10, 20), 'decisions': random.randint(10, 20), 'positioning': random.randint(10, 20), 'agility': random.randint(10, 20), 'balance': random.randint(10, 20)})
    elif position == 'Zagueiro': attrs.update({'heading': random.randint(13, 20), 'marking': random.randint(14, 20), 'tackling': random.randint(14, 20), 'strength': random.randint(14, 20)})
    elif position == 'Meio-campo': attrs.update({'passing': random.randint(14, 20), 'vision': random.randint(14, 20), 'decisions': random.randint(13, 20), 'work_rate': random.randint(13, 20)})
    elif position == 'Atacante': attrs.update({'finishing': random.randint(14, 20), 'dribbling': random.randint(13, 20), 'composure': random.randint(12, 20), 'acceleration': random.randint(14, 20), 'pace': random.randint(14, 20)})
    return attrs

def create_player(cursor, club_id, position):
    fake = Faker('pt_BR')
    nationalities = ['Brasileiro', 'Argentino', 'Uruguaio', 'Chileno', 'Paraguaio', 'Colombiano']
    attrs = generate_attributes(position)
    cursor.execute("""
    INSERT INTO players (name, age, nationality, position, club_id, wage, contract_expires, potential,
    crossing, dribbling, finishing, free_kicks, heading, long_shots, marking, tackling, passing, penalties,
    aggression, anticipation, composure, concentration, decisions, determination, leadership, positioning, vision, work_rate,
    acceleration, agility, balance, stamina, strength, pace)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (fake.name(), random.randint(17, 35), random.choice(nationalities), position, club_id, random.randint(500, 25000) * (random.randint(17,35) / 10), (date(2025, 1, 20) + timedelta(days=365 * random.randint(1, 5))).strftime('%Y-%m-%d'), random.randint(8, 20), *attrs.values()))

def main():
    # --- INÍCIO DA ALTERAÇÃO ---
    parser = argparse.ArgumentParser()
    parser.add_argument("--db_path", required=True, help="Caminho para o ficheiro da base de dados")
    args = parser.parse_args()
    db_path = args.db_path # Usa o caminho fornecido pelo Electron

    conn = sqlite3.connect(db_path)
    # --- FIM DA ALTERAÇÃO ---
    
    cursor = conn.cursor()

    print(f"--- Usando Base de Dados em: {db_path} ---", file=sys.stderr)
    
    cursor.executescript("""
        DROP TABLE IF EXISTS players; DROP TABLE IF EXISTS clubs; DROP TABLE IF EXISTS league_tables;
        DROP TABLE IF EXISTS fixtures; DROP TABLE IF EXISTS competitions; DROP TABLE IF EXISTS game_state;
        CREATE TABLE clubs (id INTEGER PRIMARY KEY, name TEXT, country TEXT, reputation INTEGER, finance_transfer_budget REAL, finance_wage_budget REAL, balance REAL );
        CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT, age INTEGER, nationality TEXT, position TEXT, club_id INTEGER, wage REAL, contract_expires TEXT, potential INTEGER, crossing INTEGER, dribbling INTEGER, finishing INTEGER, free_kicks INTEGER, heading INTEGER, long_shots INTEGER, marking INTEGER, tackling INTEGER, passing INTEGER, penalties INTEGER, aggression INTEGER, anticipation INTEGER, composure INTEGER, concentration INTEGER, decisions INTEGER, determination INTEGER, leadership INTEGER, positioning INTEGER, vision INTEGER, work_rate INTEGER, acceleration INTEGER, agility INTEGER, balance INTEGER, stamina INTEGER, strength INTEGER, pace INTEGER, FOREIGN KEY (club_id) REFERENCES clubs (id) );
        CREATE TABLE competitions (id INTEGER PRIMARY KEY, name TEXT, country TEXT, type TEXT );
        CREATE TABLE league_tables (competition_id INTEGER, club_id INTEGER, position INTEGER DEFAULT 0, played INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, draws INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, goals_for INTEGER DEFAULT 0, goals_against INTEGER DEFAULT 0, goal_difference INTEGER DEFAULT 0, points INTEGER DEFAULT 0, PRIMARY KEY (competition_id, club_id));
        CREATE TABLE fixtures (id INTEGER PRIMARY KEY, competition_id INTEGER, round INTEGER, home_club_id INTEGER, away_club_id INTEGER, home_goals INTEGER, away_goals INTEGER, is_played INTEGER DEFAULT 0);
        CREATE TABLE game_state (id INTEGER PRIMARY KEY, current_date TEXT, player_club_id INTEGER);
    """)
    print("Estrutura da Base de Dados recriada corretamente.", file=sys.stderr)

    fake = Faker('pt_BR')
    clubs_data = [('Águias da Serra', 'Brasil'), ('Tubarões da Costa', 'Brasil'), ('Lobos do Deserto', 'Argentina'), ('Fantasmas do Sul', 'Argentina'), ('Leões da Montanha', 'Chile'), ('Serpentes do Vale', 'Chile'), ('Reis da Capital', 'Uruguai'), ('Corsários do Rio', 'Uruguai')] + [(fake.city() + " FC", fake.country()) for _ in range(12)]
    for name, country in clubs_data:
        balance = random.uniform(2000000, 50000000)
        cursor.execute("INSERT INTO clubs (name, country, balance, reputation, finance_transfer_budget, finance_wage_budget) VALUES (?, ?, ?, ?, ?, ?)", (name, country, balance, random.randint(500, 8000), balance / 10, balance / 50))
    conn.commit()

    cursor.execute("SELECT id FROM clubs")
    club_ids = [row[0] for row in cursor.fetchall()]
    squad_size = 23
    min_positions = {'Goleiro': 3, 'Zagueiro': 6, 'Meio-campo': 7, 'Atacante': 5}
    for club_id in club_ids:
        for position, count in min_positions.items():
            for _ in range(count): create_player(cursor, club_id, position)
        for _ in range(squad_size - sum(min_positions.values())): create_player(cursor, club_id, random.choice(list(min_positions.keys())))
    conn.commit()
    print(f"Clubes e {len(club_ids) * squad_size} jogadores gerados com planteis equilibrados.", file=sys.stderr)
    
    cursor.execute("INSERT INTO competitions (name, country, type) VALUES (?, ?, ?)", ('Campeonato Brasileiro', 'Brasil', 'league'))
    competition_id = cursor.lastrowid
    for club_id in club_ids: cursor.execute("INSERT INTO league_tables (competition_id, club_id) VALUES (?, ?)", (competition_id, club_id))
    
    if len(club_ids) % 2 != 0: club_ids.append(None)
    num_rounds = len(club_ids) - 1
    fixtures = []
    for round_num in range(num_rounds):
        round_fixtures = []
        for i in range(len(club_ids) // 2):
            home, away = club_ids[i], club_ids[len(club_ids) - 1 - i]
            if home is not None and away is not None: round_fixtures.append((home, away))
        fixtures.append(round_fixtures)
        club_ids.insert(1, club_ids.pop())
    
    all_fixtures = fixtures + [list(map(lambda x: (x[1],x[0]), rd)) for rd in fixtures]
    for i, round_list in enumerate(all_fixtures):
        for home_id, away_id in round_list:
            cursor.execute("INSERT INTO fixtures (competition_id, round, home_club_id, away_club_id) VALUES (?, ?, ?, ?)", (competition_id, i + 1, home_id, away_id))

    cursor.execute("INSERT INTO game_state (id, current_date) VALUES (1, ?)", ("2025-01-20",))
    conn.commit()
    print("Temporada e calendário gerados.", file=sys.stderr)
    
    conn.close()
    print("--- GERAÇÃO DO MUNDO CONCLUÍDA COM SUCESSO ---", file=sys.stderr)

if __name__ == "__main__":
    main()