import json
import random
import sys

# --- CONFIGURAÇÕES ---
FORMATIONS = {
    '4-4-2': {'Goleiro': 1, 'Zagueiro': 4, 'Meio-campo': 4, 'Atacante': 2}
}
ZONES = ['Defesa', 'Meio-campo', 'Ataque']

# --- FUNÇÕES DE RESOLUÇÃO DE LANCES ---

def resolve_passe(passador, receptor, defensor, events):
    pass_power = (passador['passing'] * 0.5 + passador['vision'] * 0.4 + passador['decisions'] * 0.3) + random.uniform(-2, 2)
    interception_power = (defensor['anticipation'] * 0.6 + defensor['positioning'] * 0.4) + random.uniform(-3, 3)

    if pass_power > interception_power:
        events.append(f"PASSE! {passador['name']} encontra {receptor['name']} com um belo passe.")
        return {"outcome": "success", "new_player": receptor}
    else:
        events.append(f"INTERCEPTADO! {defensor['name']} lê a jogada e corta o passe de {passador['name']}.")
        return {"outcome": "failure"}

def resolve_drible(driblador, defensor, events):
    drible_power = (driblador['dribbling'] * 0.6 + driblador['agility'] * 0.4) + random.uniform(-3, 3)
    tackle_power = (defensor['tackling'] * 0.5 + defensor['decisions'] * 0.3) + random.uniform(-3, 3)

    if drible_power > tackle_power:
        events.append(f"QUE JOGADA! {driblador['name']} passa por {defensor['name']} com um drible fantástico!")
        return {"outcome": "success", "new_player": driblador}
    else:
        events.append(f"BOM DESARME! {defensor['name']} chega junto e rouba a bola de {driblador['name']}.")
        return {"outcome": "failure"}

# --- ALTERAÇÃO AQUI ---
def resolve_chute(atacante, events, possession_holder):
    goal_chance = (atacante['finishing'] * 0.7 + atacante['composure'] * 0.4 + atacante['long_shots'] * 0.2) / 25.0
    roll = random.random()

    if roll < goal_chance:
        # Adicionamos 'team': possession_holder ao resultado do gol
        events.append(f"CHUTE... E É GOL! GOL! GOL! {atacante['name']} marca um golaço!")
        return {"outcome": "goal", "team": possession_holder}
    else:
        events.append(f"CHUTOU... PARA FORA! {atacante['name']} perde uma grande oportunidade.")
        return {"outcome": "failure"}

# --- FUNÇÕES AUXILIARES ---

def get_player_by_position(squad, position):
    players_in_position = [p for p in squad if p['position'] == position]
    return random.choice(players_in_position) if players_in_position else None

def get_squad_for_match(full_squad_data, formation):
    squad = []
    available_players = list(full_squad_data)
    random.shuffle(available_players)
    formation_plan = FORMATIONS.get(formation, FORMATIONS['4-4-2'])

    for position, count in formation_plan.items():
        found_players = [p for p in available_players if p['position'] == position][:count]
        squad.extend(found_players)
        for p in found_players:
            available_players.remove(p)

    if len(squad) < 11:
        squad.extend(available_players[:11 - len(squad)])
        
    return squad

# --- MOTOR PRINCIPAL DA PARTIDA ---

def simulate_event_based_match(home_squad_data, away_squad_data):
    home_squad = get_squad_for_match(home_squad_data, '4-4-2')
    away_squad = get_squad_for_match(away_squad_data, '4-4-2')
    
    events = [] 

    if len(home_squad) < 11 or len(away_squad) < 11:
        events.append("Partida não pôde ser realizada por falta de jogadores.")
        return {"home_goals": 0, "away_goals": 0, "events": events}

    home_goals, away_goals = 0, 0
    possession_holder = "home"
    
    for minute in range(1, 91):
        if random.random() > 0.7:
            attacking_squad = home_squad if possession_holder == "home" else away_squad
            defending_squad = away_squad if possession_holder == "home" else home_squad
            
            zone = random.choice(ZONES)
            
            # ... (Lógica de defesa e meio-campo sem alteração) ...
            if zone == 'Defesa':
                player = get_player_by_position(attacking_squad, 'Zagueiro')
                if not player: continue
                events.append(f"({minute}') {player['name']} começa a armar o jogo.")
                receptor = get_player_by_position(attacking_squad, 'Meio-campo')
                defensor = get_player_by_position(defending_squad, 'Atacante')
                if receptor and defensor:
                    result = resolve_passe(player, receptor, defensor, events)
                    if result['outcome'] == 'failure':
                        possession_holder = "away" if possession_holder == "home" else "home"
            
            elif zone == 'Meio-campo':
                player = get_player_by_position(attacking_squad, 'Meio-campo')
                if not player: continue
                events.append(f"({minute}') {player['name']} domina no círculo central.")
                if random.random() > 0.4:
                    receptor = get_player_by_position(attacking_squad, 'Atacante')
                    defensor = get_player_by_position(defending_squad, 'Meio-campo')
                    if receptor and defensor:
                        result = resolve_passe(player, receptor, defensor, events)
                        if result['outcome'] == 'failure':
                            possession_holder = "away" if possession_holder == "home" else "home"
                else:
                    defensor = get_player_by_position(defending_squad, 'Meio-campo')
                    if defensor:
                        result = resolve_drible(player, defensor, events)
                        if result['outcome'] == 'failure':
                            possession_holder = "away" if possession_holder == "home" else "home"

            elif zone == 'Ataque':
                player = get_player_by_position(attacking_squad, 'Atacante')
                if not player: continue
                
                events.append(f"({minute}') PERIGO! {player['name']} recebe na entrada da área!")
                # --- ALTERAÇÃO AQUI ---
                # Passamos o 'possession_holder' para a função de chute
                result = resolve_chute(player, events, possession_holder)
                
                if result.get('team') == 'home': home_goals += 1
                elif result.get('team') == 'away': away_goals += 1
                
                possession_holder = "away" if possession_holder == "home" else "home"

    events.append(f"FIM DE JOGO! Placar Final: Casa {home_goals} x {away_goals} Visitante")
    return {"home_goals": home_goals, "away_goals": away_goals, "events": events}

if __name__ == "__main__":
    input_data = json.load(sys.stdin)
    home_squad_from_js = input_data['home_squad']
    away_squad_from_js = input_data['away_squad']
    result_dict = simulate_event_based_match(home_squad_from_js, away_squad_from_js)
    print(json.dumps(result_dict))