import sqlite3
import random
import os
import sys
import argparse
from faker import Faker
from datetime import date, timedelta
from ha_calculator import calculate_current_ability, ALL_ATTRIBUTES

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
    age = random.randint(17, 35)
    
    # O Potencial de Habilidade ainda é gerado aleatoriamente
    potential_ability = random.randint(80, 180)

    # --- MUDANÇA PRINCIPAL ---
    # O HA agora é calculado com base nos atributos iniciais usando a função unificada
    player_initial_attributes = {'position': position, **attrs}
    current_ability = calculate_current_ability(player_initial_attributes)
    
    # Garante que o HA não seja maior que o PA
    current_ability = min(current_ability, potential_ability)

    cursor.execute("""
    INSERT INTO players (name, age, nationality, position, club_id, wage, contract_expires, potential,
    crossing, dribbling, finishing, free_kicks, heading, long_shots, marking, tackling, passing, penalties,
    aggression, anticipation, composure, concentration, decisions, determination, leadership, positioning, vision, work_rate,
    acceleration, agility, balance, stamina, strength, pace, current_ability, potential_ability)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (fake.name(), age, random.choice(nationalities), position, club_id, random.randint(500, 25000) * (random.randint(17,35) / 10), (date(2025, 1, 20) + timedelta(days=365 * random.randint(1, 5))).strftime('%Y-%m-%d'), random.randint(8, 20), *attrs.values(), current_ability, potential_ability))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db_path", required=True, help="Caminho para o ficheiro da base de dados")
    args = parser.parse_args()
    db_path = args.db_path

    # --- A CORREÇÃO REAL E DEFINITIVA ESTÁ AQUI ---
    # Primeiro, deletamos o arquivo antigo para matar qualquer cache ou trava do sistema.
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
            print(f"--- [ETAPA 1] Arquivo DB antigo '{db_path}' REMOVIDO com sucesso. ---", file=sys.stderr)
    except OSError as e:
        print(f"--- [ETAPA 1] ERRO ao remover o DB antigo: {e}. ---", file=sys.stderr)
        # Se não conseguir deletar, o problema é mais sério (ex: permissão de arquivo), mas o erro ficará claro.

    # Agora, e somente agora, conectamos (o que cria um arquivo novo e vazio).
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"--- [ETAPA 2] Conectado e criando NOVA Base de Dados em: {db_path} ---", file=sys.stderr)
    
    cursor.executescript("""
        DROP TABLE IF EXISTS players; 
        DROP TABLE IF EXISTS clubs; 
        DROP TABLE IF EXISTS league_tables;
        DROP TABLE IF EXISTS fixtures; 
        DROP TABLE IF EXISTS competitions; 
        DROP TABLE IF EXISTS game_state;
        DROP TABLE IF EXISTS training;
        CREATE TABLE clubs (id INTEGER PRIMARY KEY, name TEXT, country TEXT, reputation INTEGER, finance_transfer_budget REAL, finance_wage_budget REAL, balance REAL );
CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT, age INTEGER, nationality TEXT, position TEXT, club_id INTEGER, wage REAL, contract_expires TEXT, potential INTEGER, crossing INTEGER, dribbling INTEGER, finishing INTEGER, free_kicks INTEGER, heading INTEGER, long_shots INTEGER, marking INTEGER, tackling INTEGER, passing INTEGER, penalties INTEGER, aggression INTEGER, anticipation INTEGER, composure INTEGER, concentration INTEGER, decisions INTEGER, determination INTEGER, leadership INTEGER, positioning INTEGER, vision INTEGER, work_rate INTEGER, acceleration INTEGER, agility INTEGER, balance INTEGER, stamina INTEGER, strength INTEGER, pace INTEGER, current_ability INTEGER, potential_ability INTEGER, is_injured INTEGER DEFAULT 0, injury_return_date TEXT, yellow_cards INTEGER DEFAULT 0, is_suspended INTEGER DEFAULT 0, FOREIGN KEY (club_id) REFERENCES clubs (id) );
        CREATE TABLE competitions (id INTEGER PRIMARY KEY, name TEXT, country TEXT, type TEXT );
        CREATE TABLE league_tables (competition_id INTEGER, club_id INTEGER, position INTEGER DEFAULT 0, played INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, draws INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, goals_for INTEGER DEFAULT 0, goals_against INTEGER DEFAULT 0, goal_difference INTEGER DEFAULT 0, points INTEGER DEFAULT 0, PRIMARY KEY (competition_id, club_id));
        CREATE TABLE fixtures (id INTEGER PRIMARY KEY, competition_id INTEGER, round INTEGER, date TEXT, home_club_id INTEGER, away_club_id INTEGER, home_goals INTEGER, away_goals INTEGER, is_played INTEGER DEFAULT 0);
        CREATE TABLE game_state (id INTEGER PRIMARY KEY, current_date TEXT, player_club_id INTEGER);
        CREATE TABLE training (club_id INTEGER PRIMARY KEY, focus TEXT DEFAULT 'geral');
    """)
    print("[ETAPA 3] Estrutura da Base de Dados recriada corretamente.", file=sys.stderr)


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
        cursor.execute("INSERT OR IGNORE INTO training (club_id) VALUES (?)", (club_id,))
    conn.commit()
    print(f"[ETAPA 4] Clubes e {len(club_ids) * squad_size} jogadores gerados.", file=sys.stderr)
    
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
    
    current_match_date = date(2025, 2, 1)
    for i, round_list in enumerate(all_fixtures):
        for home_id, away_id in round_list:
            cursor.execute("INSERT INTO fixtures (competition_id, round, date, home_club_id, away_club_id) VALUES (?, ?, ?, ?, ?)", 
                           (competition_id, i + 1, current_match_date.strftime('%Y-%m-%d'), home_id, away_id))
        current_match_date += timedelta(days=7)

    # Inserindo a data inicial correta
    cursor.execute("INSERT INTO game_state (id, current_date) VALUES (1, ?)", ("2025-01-20",))
    conn.commit()
    print("[ETAPA 5] Temporada e calendário gerados. Data inicial: 2025-01-20.", file=sys.stderr)
    
    conn.close()
    print("--- [ETAPA 6] GERAÇÃO DO MUNDO CONCLUÍDA COM SUCESSO ---", file=sys.stderr)

if __name__ == "__main__":
    main()