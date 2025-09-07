import sqlite3
import random
import os
import sys
from faker import Faker
from datetime import date, timedelta

def generate_attributes(position):
    # Base aleatória para todos
    attrs = {
        'crossing': random.randint(1, 15), 'dribbling': random.randint(1, 15), 'finishing': random.randint(1, 15),
        'free_kicks': random.randint(1, 15), 'heading': random.randint(1, 15), 'long_shots': random.randint(1, 15),
        'marking': random.randint(1, 15), 'tackling': random.randint(1, 15), 'passing': random.randint(1, 15),
        'penalties': random.randint(1, 15), 'aggression': random.randint(1, 15), 'anticipation': random.randint(1, 15),
        'composure': random.randint(1, 15), 'concentration': random.randint(1, 15), 'decisions': random.randint(1, 15),
        'determination': random.randint(1, 15), 'leadership': random.randint(1, 15), 'positioning': random.randint(1, 15),
        'vision': random.randint(1, 15), 'work_rate': random.randint(1, 15), 'acceleration': random.randint(1, 15),
        'agility': random.randint(1, 15), 'balance': random.randint(1, 15), 'stamina': random.randint(1, 15),
        'strength': random.randint(1, 15), 'pace': random.randint(1, 15)
    }
    # Bónus por posição
    if position == 'Goleiro':
        attrs.update({'anticipation': random.randint(10, 20), 'concentration': random.randint(10, 20), 'decisions': random.randint(10, 20), 'positioning': random.randint(10, 20), 'agility': random.randint(10, 20), 'balance': random.randint(10, 20)})
    elif position == 'Zagueiro':
        attrs.update({'heading': random.randint(13, 20), 'marking': random.randint(14, 20), 'tackling': random.randint(14, 20), 'strength': random.randint(14, 20)})
    elif position == 'Meio-campo':
        attrs.update({'passing': random.randint(14, 20), 'vision': random.randint(14, 20), 'decisions': random.randint(13, 20), 'work_rate': random.randint(13, 20)})
    elif position == 'Atacante':
        attrs.update({'finishing': random.randint(14, 20), 'dribbling': random.randint(13, 20), 'composure': random.randint(12, 20), 'acceleration': random.randint(14, 20), 'pace': random.randint(14, 20)})
    return attrs

def create_player(cursor, club_id, position):
    fake = Faker('pt_BR')
    nationalities = ['Brasileiro', 'Argentino', 'Uruguaio', 'Chileno', 'Paraguaio', 'Colombiano']
    name = fake.name()
    age = random.randint(17, 35)
    nationality = random.choice(nationalities)
    wage = random.randint(500, 25000) * (age / 10)
    contract_years = random.randint(1, 5)
    start_date = date(2025, 1, 20)
    contract_expires = start_date + timedelta(days=365 * contract_years)
    potential = random.randint(8, 20)
    attrs = generate_attributes(position)
    
    cursor.execute("""
    INSERT INTO players
        (name, age, nationality, position, club_id, wage, contract_expires, potential,
        crossing, dribbling, finishing, free_kicks, heading, long_shots, marking, tackling, passing, penalties,
        aggression, anticipation, composure, concentration, decisions, determination, leadership, positioning, vision, work_rate,
        acceleration, agility, balance, stamina, strength, pace)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (name, age, nationality, position, club_id, wage, contract_expires.strftime('%Y-%m-%d'), potential, *attrs.values()))

def generate_world():
    fake = Faker('pt_BR')
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, 'foot.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS players;")
    cursor.execute("DROP TABLE IF EXISTS clubs;")
    cursor.execute("CREATE TABLE clubs (id INTEGER PRIMARY KEY, name TEXT, country TEXT, reputation INTEGER, finance_transfer_budget REAL, finance_wage_budget REAL, balance REAL );""")
    cursor.execute("CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT, age INTEGER, nationality TEXT, position TEXT, club_id INTEGER, wage REAL, contract_expires TEXT, potential INTEGER, crossing INTEGER, dribbling INTEGER, finishing INTEGER, free_kicks INTEGER, heading INTEGER, long_shots INTEGER, marking INTEGER, tackling INTEGER, passing INTEGER, penalties INTEGER, aggression INTEGER, anticipation INTEGER, composure INTEGER, concentration INTEGER, decisions INTEGER, determination INTEGER, leadership INTEGER, positioning INTEGER, vision INTEGER, work_rate INTEGER, acceleration INTEGER, agility INTEGER, balance INTEGER, stamina INTEGER, strength INTEGER, pace INTEGER, FOREIGN KEY (club_id) REFERENCES clubs (id) );""")
    
    clubs_data = [('Águias da Serra', 'Brasil'), ('Tubarões da Costa', 'Brasil'), ('Lobos do Deserto', 'Argentina'), ('Fantasmas do Sul', 'Argentina'), ('Leões da Montanha', 'Chile'), ('Serpentes do Vale', 'Chile'), ('Reis da Capital', 'Uruguai'), ('Corsários do Rio', 'Uruguai')] + [(fake.city() + " FC", fake.country()) for _ in range(12)]
    for name, country in clubs_data:
        balance = random.uniform(2000000, 50000000)
        cursor.execute("INSERT INTO clubs (name, country, balance, reputation, finance_transfer_budget, finance_wage_budget) VALUES (?, ?, ?, ?, ?, ?)", (name, country, balance, random.randint(500, 8000), balance / 10, balance / 50))
    conn.commit()

    cursor.execute("SELECT id FROM clubs")
    club_ids = [row[0] for row in cursor.fetchall()]
    
    squad_size = 23
    min_positions = {'Goleiro': 3, 'Zagueiro': 6, 'Meio-campo': 7, 'Atacante': 5}
    
    print(f"Gerando planteis equilibrados para {len(club_ids)} clubes...", file=sys.stderr)

    for club_id in club_ids:
        player_count = 0
        for position, count in min_positions.items():
            for _ in range(count):
                create_player(cursor, club_id, position)
                player_count += 1
        
        positions = ['Goleiro', 'Zagueiro', 'Meio-campo', 'Atacante']
        while player_count < squad_size:
            create_player(cursor, club_id, random.choice(positions))
            player_count += 1
            
    conn.commit()
    conn.close()
    
    print("\nClubes e jogadores gerados com sucesso!", file=sys.stderr)

if __name__ == "__main__":
    generate_world()