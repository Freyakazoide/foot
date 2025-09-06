import sqlite3
import random
import os
from faker import Faker
from datetime import date, timedelta

def generate_attributes(position):
    attributes = {}
    if position == 'Goleiro':
        attributes['tackling'] = random.randint(3, 8)
        attributes['finishing'] = random.randint(1, 5)
        attributes['passing'] = random.randint(5, 12)
        attributes['positioning'] = random.randint(12, 18)
    elif position == 'Zagueiro':
        attributes['tackling'] = random.randint(13, 19)
        attributes['finishing'] = random.randint(2, 7)
        attributes['passing'] = random.randint(7, 13)
        attributes['strength'] = random.randint(14, 20)
    elif position == 'Meio-campo':
        attributes['tackling'] = random.randint(8, 14)
        attributes['finishing'] = random.randint(7, 14)
        attributes['passing'] = random.randint(14, 20)
        attributes['vision'] = random.randint(14, 20)
    elif position == 'Atacante':
        attributes['tackling'] = random.randint(4, 9)
        attributes['finishing'] = random.randint(14, 20)
        attributes['passing'] = random.randint(8, 15)
        attributes['pace'] = random.randint(13, 19)
    
    for attr in ['finishing', 'passing', 'tackling', 'vision', 'positioning', 'determination', 'pace', 'stamina', 'strength']:
        if attr not in attributes:
            attributes[attr] = random.randint(5, 15)
    
    return attributes

def generate_world():
    fake = Faker('pt_BR')
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, 'foot.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Iniciando a geração de um novo mundo com potencial de jogador...")
    
    cursor.execute("DELETE FROM players;")
    cursor.execute("DELETE FROM clubs;")
    cursor.execute("DELETE FROM league_tables;")
    cursor.execute("DELETE FROM fixtures;")
    cursor.execute("DELETE FROM competitions;")
    cursor.execute("DELETE FROM game_state;")
    conn.commit()
    print("Tabelas antigas limpas.")

    clubs_data = [
        ('Águias da Serra', 'Brasil'), ('Tubarões da Costa', 'Brasil'), ('Lobos do Deserto', 'Argentina'),
        ('Fantasmas do Sul', 'Argentina'), ('Leões da Montanha', 'Chile'), ('Serpentes do Vale', 'Chile'),
        ('Reis da Capital', 'Uruguai'), ('Corsários do Rio', 'Uruguai')
    ]
    for _ in range(12):
        clubs_data.append((fake.city() + " FC", fake.country()))

    for name, country in clubs_data:
        balance = random.uniform(2000000, 50000000)
        reputation = random.randint(500, 8000)
        transfer_budget = balance / 10
        wage_budget = balance / 50
        cursor.execute("INSERT INTO clubs (name, country, balance, reputation, finance_transfer_budget, finance_wage_budget) VALUES (?, ?, ?, ?, ?, ?)",
                       (name, country, balance, reputation, transfer_budget, wage_budget))
    conn.commit()
    print(f"{len(clubs_data)} clubes criados com saldos financeiros.")

    cursor.execute("SELECT id FROM clubs")
    club_ids = [row[0] for row in cursor.fetchall()]
    
    total_clubs = len(club_ids)
    total_players = total_clubs * 22
    print(f"Gerando {total_players} jogadores com salários, contratos e potencial...")

    positions = ['Goleiro', 'Zagueiro', 'Meio-campo', 'Atacante']
    nationalities = ['Brasileiro', 'Argentino', 'Uruguaio', 'Chileno', 'Paraguaio', 'Colombiano']

    for i in range(total_players):
        name = fake.name()
        age = random.randint(17, 35)
        nationality = random.choice(nationalities)
        position = random.choice(positions)
        club_id = random.choice(club_ids)
        
        wage = random.randint(500, 25000) * (age / 10)
        contract_years = random.randint(1, 5)
        start_date = date(2025, 1, 20)
        contract_expires = start_date + timedelta(days=365 * contract_years)
        potential = random.randint(8, 20)
        
        attrs = generate_attributes(position)

        cursor.execute("""
        INSERT INTO players 
            (name, age, nationality, position, club_id, wage, contract_expires, potential,
             finishing, passing, tackling, vision, positioning, determination, pace, stamina, strength) 
        VALUES 
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            name, age, nationality, position, club_id, wage, contract_expires.strftime('%Y-%m-%d'), potential,
            attrs['finishing'], attrs['passing'], attrs['tackling'], attrs['vision'], 
            attrs['positioning'], attrs['determination'], attrs['pace'], 
            attrs['stamina'], attrs['strength']
        ))

    print("Definindo a data inicial da temporada...")
    game_start_date = "2025-01-20"
    cursor.execute("INSERT INTO game_state (id, current_date) VALUES (1, ?)", (game_start_date,))
    
    conn.commit()
    conn.close()
    
    print("\nMundo com potencial de jogador gerado com sucesso!")

if __name__ == "__main__":
    generate_world()