import sqlite3
import random
import argparse
import os
import json # Importa a biblioteca JSON

# A função get_team_ratings continua a mesma
def get_team_ratings(club_id, cursor):
    cursor.execute("""
    SELECT AVG(finishing), AVG(passing), AVG(tackling), AVG(strength) 
    FROM (
        SELECT * FROM players WHERE club_id = ? ORDER BY (finishing + passing + tackling + strength) DESC LIMIT 11
    )
    """, (club_id,))
    ratings = cursor.fetchone()
    if not ratings or ratings[0] is None: return {'attack': 0, 'midfield': 0, 'defense': 0}
    return {
        'attack': (ratings[0] + ratings[3]) / 2,
        'midfield': ratings[1],
        'defense': (ratings[2] + ratings[3]) / 2
    }

# A função de simulação agora retorna um dicionário, não imprime nada
def simulate_match(home_id, away_id):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, 'foot.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    home_ratings = get_team_ratings(home_id, cursor)
    away_ratings = get_team_ratings(away_id, cursor)

    home_ratings['attack'] *= 1.05
    home_ratings['midfield'] *= 1.05

    home_goals = 0
    away_goals = 0

    for _ in range(20):
        midfield_contest = home_ratings['midfield'] - away_ratings['midfield'] + random.uniform(-5, 5)
        if midfield_contest > 0:
            if home_ratings['attack'] * random.uniform(0.8, 1.2) > away_ratings['defense'] * random.uniform(0.8, 1.2):
                home_goals += 1
        else:
            if away_ratings['attack'] * random.uniform(0.8, 1.2) > home_ratings['defense'] * random.uniform(0.8, 1.2):
                away_goals += 1

    conn.close()

    # Retorna um dicionário com o resultado
    return {
        "home_goals": home_goals,
        "away_goals": away_goals
    }

# O script principal agora imprime o resultado como uma string JSON
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulador de Partidas do 'foot'")
    parser.add_argument("--home", type=int, required=True, help="ID do time da casa")
    parser.add_argument("--away", type=int, required=True, help="ID do time visitante")
    args = parser.parse_args()

    # Chama a simulação e pega o resultado
    result_dict = simulate_match(args.home, args.away)

    # Imprime o dicionário como uma string JSON no final
    print(json.dumps(result_dict))