import sqlite3
import random
import argparse
import json
import sys
from ha_calculator import calculate_current_ability, ALL_ATTRIBUTES # IMPORT UNIFICADO

PHYSICAL_ATTRIBUTES = ['acceleration', 'agility', 'balance', 'stamina', 'strength', 'pace']

TRAINING_FOCUS_MAP = {
    'fisico': ['acceleration', 'agility', 'balance', 'stamina', 'strength', 'pace'],
    'tecnico_def': ['marking', 'tackling', 'heading', 'positioning'],
    'tecnico_ata': ['crossing', 'dribbling', 'finishing', 'long_shots', 'passing'],
    'tatico': ['anticipation', 'decisions', 'vision', 'work_rate', 'composure']
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db_path", required=True, help="Caminho para o banco de dados.")
    args = parser.parse_args()
    
    conn = sqlite3.connect(args.db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM training")
    training_focuses = {row['club_id']: row['focus'] for row in cursor.fetchall()}

    cursor.execute("SELECT * FROM players")
    players = cursor.fetchall()

    # --- NOVO: Rastreamento de Mudanças ---
    training_report = []

    for player_row in players:
        player = dict(player_row)
        original_player_data = player.copy() # Guarda o estado original
        
        age = player['age']
        ha = player['current_ability']
        pa = player['potential_ability']
        
        club_focus = training_focuses.get(player['club_id'], 'geral')
        focused_attributes = TRAINING_FOCUS_MAP.get(club_focus, [])

        # Lógica de progressão com chances ajustadas
        if age < 23 and ha < pa:
            if random.random() < 0.65:
                for _ in range(random.randint(1, 3)):
                    attr_to_improve = random.choice(focused_attributes) if focused_attributes and random.random() < 0.6 else random.choice(ALL_ATTRIBUTES)
                    player[attr_to_improve] = min(20, player[attr_to_improve] + 1)
        
        elif 23 <= age < 30 and ha < pa:
             if random.random() < 0.35:
                attr_to_improve = random.choice(focused_attributes) if focused_attributes and random.random() < 0.6 else random.choice(ALL_ATTRIBUTES)
                player[attr_to_improve] = min(20, player[attr_to_improve] + 1)

        elif age >= 30:
            if random.random() < 0.4:
                for _ in range(random.randint(1, 2)):
                    attr_to_decline = random.choice(PHYSICAL_ATTRIBUTES) if random.random() < 0.7 else random.choice(ALL_ATTRIBUTES)
                    player[attr_to_decline] = max(1, player[attr_to_decline] - 1)

        new_ha = calculate_current_ability(player)
        
        # --- NOVO: Compara e Registra Mudanças ---
        changed_attributes = []
        for attr in ALL_ATTRIBUTES:
            if player[attr] != original_player_data[attr]:
                changed_attributes.append({
                    "attribute": attr,
                    "old_value": original_player_data[attr],
                    "new_value": player[attr]
                })

        if new_ha != original_player_data['current_ability'] or changed_attributes:
             training_report.append({
                 "player_id": player['id'],
                 "player_name": player['name'],
                 "club_id": player['club_id'],
                 "old_ha": original_player_data['current_ability'],
                 "new_ha": new_ha,
                 "changes": changed_attributes
             })
        
        # Atualiza o banco de dados
        update_query = f"UPDATE players SET current_ability = ?, {', '.join([f'{attr} = ?' for attr in ALL_ATTRIBUTES])} WHERE id = ?"
        update_values = [new_ha] + [player[attr] for attr in ALL_ATTRIBUTES] + [player['id']]
        cursor.execute(update_query, tuple(update_values))

    conn.commit()
    conn.close()
    
    # Imprime o relatório final como JSON para o stdout
    print(json.dumps(training_report))

if __name__ == "__main__":
    main()