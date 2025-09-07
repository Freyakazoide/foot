import json
import random
import sys

# --- CONFIGURAÇÕES ---
FORMATIONS = {
    '442': {'Goleiro': 1, 'Zagueiro': 4, 'Meio-campo': 4, 'Atacante': 2},
    '433': {'Goleiro': 1, 'Zagueiro': 4, 'Meio-campo': 3, 'Atacante': 3},
    '352': {'Goleiro': 1, 'Zagueiro': 3, 'Meio-campo': 5, 'Atacante': 2}
}
ZONES = ['Defesa', 'Meio-campo', 'Ataque']

# --- FUNÇÕES DE RESOLUÇÃO (COM NOVA LÓGICA DE RESISTÊNCIA) ---

def aplicar_penalidade_resistencia(jogador):
    stamina = jogador.get('current_stamina', 100)
    if stamina > 70: return 1.0
    elif stamina > 40: return 0.9
    elif stamina > 10: return 0.75
    else: return 0.6

def resolver_passe(passador, receptor, defensor):
    penalidade = aplicar_penalidade_resistencia(passador)
    passador['current_stamina'] -= 1.5 * (20 / passador['stamina'])
    pass_power = (passador['passing'] * 0.5 + passador['vision'] * 0.4 + passador['decisions'] * 0.3) * penalidade + random.uniform(-2, 2)
    interception_power = (defensor['anticipation'] * 0.6 + defensor['positioning'] * 0.4) + random.uniform(-3, 3)
    if pass_power > interception_power:
        return {"outcome": "success", "new_player": receptor, "text": f"PASSE! {passador['name']} encontra {receptor['name']}."}
    else:
        return {"outcome": "failure", "text": f"INTERCEPTADO! {defensor['name']} corta o passe de {passador['name']}."}

def resolve_drible(driblador, defensor):
    penalidade = aplicar_penalidade_resistencia(driblador)
    driblador['current_stamina'] -= 3 * (20 / driblador['stamina'])
    drible_power = (driblador['dribbling'] * 0.6 + driblador['agility'] * 0.4) * penalidade + random.uniform(-3, 3)
    tackle_power = (defensor['tackling'] * 0.5 + defensor['decisions'] * 0.3) + random.uniform(-3, 3)
    if drible_power > tackle_power:
        return {"outcome": "success", "new_player": driblador, "text": f"QUE JOGADA! {driblador['name']} passa por {defensor['name']}!"}
    else:
        return {"outcome": "failure", "text": f"BOM DESARME! {defensor['name']} rouba a bola de {driblador['name']}."}

def resolve_chute(atacante, possession_holder):
    penalidade = aplicar_penalidade_resistencia(atacante)
    atacante['current_stamina'] -= 4 * (20 / atacante['stamina'])
    goal_chance = (atacante['finishing'] * 0.7 + atacante['composure'] * 0.4 + atacante['long_shots'] * 0.2) * penalidade / 25.0
    if random.random() < goal_chance:
        return {"outcome": "goal", "team": possession_holder, "scorer_id": atacante['id'], "text": f"CHUTE... E É GOL! GOL! GOL! {atacante['name']} marca!"}
    else:
        return {"outcome": "failure", "text": f"CHUTOU... PARA FORA! {atacante['name']} perde a oportunidade."}

# --- FUNÇÕES AUXILIARES ---

def get_player_by_position(squad, position):
    players_in_position = [p for p in squad if p['position'] == position]
    return random.choice(players_in_position) if players_in_position else None

def get_squad_for_match(full_squad_data, formation):
    for player in full_squad_data:
        player['current_stamina'] = 100
    squad = []
    available_players = list(full_squad_data)
    random.shuffle(available_players)
    formation_plan = FORMATIONS.get(formation, FORMATIONS.get('442'))
    for position, count in formation_plan.items():
        found_players = [p for p in available_players if p['position'] == position][:count]
        squad.extend(found_players)
        for p in found_players:
            available_players.remove(p)
    if len(squad) < 11:
        squad.extend(available_players[:11 - len(squad)])
    return squad

# --- MOTOR PRINCIPAL DA PARTIDA ---

def simulate_event_based_match(home_squad_data, away_squad_data, formation):
    home_squad = get_squad_for_match(home_squad_data, formation)
    away_squad = get_squad_for_match(away_squad_data, formation)
    
    events = []
    if len(home_squad) < 11 or len(away_squad) < 11:
        return {"home_goals": 0, "away_goals": 0, "events": [{"minute": 1, "text": "Partida não pôde ser realizada."}], "home_lineup": [], "away_lineup": []}

    home_goals, away_goals = 0, 0
    possession_holder = "home"
    
    for minute in range(1, 91):
        for player in home_squad + away_squad:
            player['current_stamina'] -= 0.2 * (20 / player['stamina'])
        
        if random.random() > 0.7:
            attacking_squad = home_squad if possession_holder == "home" else away_squad
            defending_squad = away_squad if possession_holder == "home" else home_squad
            zone = random.choice(ZONES)
            
            result = None
            if zone == 'Defesa':
                player = get_player_by_position(attacking_squad, 'Zagueiro')
                if not player: continue
                receptor = get_player_by_position(attacking_squad, 'Meio-campo')
                defensor = get_player_by_position(defending_squad, 'Atacante')
                if receptor and defensor: result = resolver_passe(player, receptor, defensor)
            elif zone == 'Meio-campo':
                player = get_player_by_position(attacking_squad, 'Meio-campo')
                if not player: continue
                if random.random() > 0.4:
                    receptor = get_player_by_position(attacking_squad, 'Atacante')
                    defensor = get_player_by_position(defending_squad, 'Meio-campo')
                    if receptor and defensor: result = resolver_passe(player, receptor, defensor)
                else:
                    defensor = get_player_by_position(defending_squad, 'Meio-campo')
                    if defensor: result = resolve_drible(player, defensor)
            elif zone == 'Ataque':
                player = get_player_by_position(attacking_squad, 'Atacante')
                if not player: continue
                result = resolve_chute(player, possession_holder)

            if result:
                event_log = {"minute": minute, "text": result['text']}
                if result.get('outcome') == 'goal':
                    if result.get('team') == 'home': home_goals += 1
                    else: away_goals += 1
                    event_log['scorer_id'] = result.get('scorer_id')
                    event_log['team'] = result.get('team')
                
                event_log['player_states'] = {p['id']: p['current_stamina'] for p in home_squad + away_squad}
                events.append(event_log)

                if result['outcome'] == 'failure' or result['outcome'] == 'goal':
                    possession_holder = "away" if possession_holder == "home" else "home"

    events.append({"minute": 90, "text": f"FIM DE JOGO! Placar Final: {home_goals} x {away_goals}"})
    return {
        "home_goals": home_goals, 
        "away_goals": away_goals, 
        "events": events,
        "home_lineup": [{k: v for k, v in p.items() if k != 'current_stamina'} for p in home_squad],
        "away_lineup": [{k: v for k, v in p.items() if k != 'current_stamina'} for p in away_squad]
    }

if __name__ == "__main__":
    input_data = json.load(sys.stdin)
    home_squad_from_js = input_data['home_squad']
    away_squad_from_js = input_data['away_squad']
    formation_from_js = input_data.get('formation', '442')
    result_dict = simulate_event_based_match(home_squad_from_js, away_squad_from_js, formation_from_js)
    print(json.dumps(result_dict))