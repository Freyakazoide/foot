import sqlite3
import random
import argparse
import os
import json
import sys

FORMATIONS = {
    '4-4-2': {'Goleiro': 1, 'Zagueiro': 4, 'Meio-campo': 4, 'Atacante': 2}
}

def get_squad_for_match(club_id, formation, cursor):
    squad = []
    player_ids_used = set()
    formation_plan = FORMATIONS.get(formation, FORMATIONS['4-4-2'])

    for position, count in formation_plan.items():
        cursor.execute(f"""
            SELECT * FROM players 
            WHERE club_id = ? AND position = ? AND id NOT IN ({','.join('?' for _ in player_ids_used) or 'NULL'}) 
            ORDER BY determination DESC, strength DESC 
            LIMIT ?
        """, (club_id, position, *player_ids_used, count))
        
        players = cursor.fetchall()
        for player_row in players:
            player_dict = dict(zip([col[0] for col in cursor.description], player_row))
            squad.append(player_dict)
            player_ids_used.add(player_dict['id'])

    if len(squad) < 11:
        needed = 11 - len(squad)
        cursor.execute(f"""
            SELECT * FROM players 
            WHERE club_id = ? AND id NOT IN ({','.join('?' for _ in player_ids_used) or 'NULL'}) 
            ORDER BY determination DESC, strength DESC 
            LIMIT ?
        """, (club_id, *player_ids_used, needed))
        
        extra_players = cursor.fetchall()
        for player_row in extra_players:
            player_dict = dict(zip([col[0] for col in cursor.description], player_row))
            squad.append(player_dict)

    return squad

def get_player_by_position(squad, position):
    players_in_position = [p for p in squad if p['position'] == position]
    return random.choice(players_in_position) if players_in_position else None

def resolve_pass(passer, receiver, defender):
    pass_power = (passer['passing'] * 0.5 + passer['vision'] * 0.3 + passer['decisions'] * 0.2) + random.uniform(-3, 3)
    interception_power = (defender['anticipation'] * 0.5 + defender['positioning'] * 0.3 + defender['concentration'] * 0.2) + random.uniform(-3, 3)
    print(f"  > PASSE: {passer['name']} ({pass_power:.1f}) vs {defender['name']} ({interception_power:.1f})", file=sys.stderr)
    if pass_power > interception_power: return {"outcome": "success", "new_player": receiver}
    else: return {"outcome": "intercepted"}

def resolve_shot(attacker):
    goal_chance = (attacker['finishing'] * 0.6 + attacker['composure'] * 0.4) / 20.0
    print(f"  > CHUTE: {attacker['name']} (Chance: {goal_chance*100:.0f}%)", file=sys.stderr)
    if random.random() < goal_chance: return {"outcome": "goal"}
    else: return {"outcome": "saved"}

def simulate_event_based_match(home_id, away_id, db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"--- Lendo Base de Dados em: {db_path} ---", file=sys.stderr)

    home_squad = get_squad_for_match(home_id, '4-4-2', cursor)
    away_squad = get_squad_for_match(away_id, '4-4-2', cursor)
    conn.close()

    if len(home_squad) < 11 or len(away_squad) < 11:
        print(f"ERRO CRÍTICO: Equipa da casa ({len(home_squad)}) ou visitante ({len(away_squad)}) não tem jogadores suficientes.", file=sys.stderr)
        return {"home_goals": 0, "away_goals": 0}

    home_goals, away_goals = 0, 0
    possession_holder = "home"
    print("\n--- INÍCIO DA PARTIDA ---", file=sys.stderr)
    for i in range(25):
        print(f"\n--- LANCE {i+1} ---", file=sys.stderr)
        attacking_squad = home_squad if possession_holder == "home" else away_squad
        
        defending_squad = away_squad if possession_holder == "home" else home_squad
        
        current_player = get_player_by_position(attacking_squad, "Zagueiro")
        
        for _ in range(5):
            if not current_player:
                possession_holder = "away" if possession_holder == "home" else "home"; break
            
            print(f"[POSSE] {possession_holder.upper()}: {current_player['name']} ({current_player['position']})", file=sys.stderr)
            
            action_result = None
            if current_player['position'] == 'Zagueiro':
                receiver, defender = get_player_by_position(attacking_squad, 'Meio-campo'), get_player_by_position(defending_squad, 'Atacante')
                if receiver and defender: action_result = resolve_pass(current_player, receiver, defender)
            elif current_player['position'] == 'Meio-campo':
                receiver, defender = get_player_by_position(attacking_squad, 'Atacante'), get_player_by_position(defending_squad, 'Zagueiro')
                if receiver and defender: action_result = resolve_pass(current_player, receiver, defender)
            elif current_player['position'] == 'Atacante':
                action_result = resolve_shot(current_player)

            if not action_result:
                possession_holder = "away" if possession_holder == "home" else "home"; break

            if action_result['outcome'] == 'success':
                current_player = action_result['new_player']
            else:
                if action_result and action_result['outcome'] == 'goal':
                    if possession_holder == 'home': home_goals += 1
                    else: away_goals += 1
                possession_holder = "away" if possession_holder == "home" else "home"; break
                
    print(f"\n--- FIM: {home_goals} x {away_goals} ---", file=sys.stderr)
    return {"home_goals": home_goals, "away_goals": away_goals}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--home", type=int, required=True)
    parser.add_argument("--away", type=int, required=True)
    parser.add_argument("--db_path", required=True, help="Caminho para o ficheiro da base de dados")
    args = parser.parse_args()
    result_dict = simulate_event_based_match(args.home, args.away, args.db_path)
    print(json.dumps(result_dict))