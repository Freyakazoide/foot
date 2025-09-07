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
TEXTS = {
    'passe_sucesso': ["{p1} toca para {p2}.", "{p1} encontra {p2} livre.", "{p1} faz o passe para {p2}."],
    'passe_falha': ["{d1} intercepta o passe de {p1}.", "{d1} lê a jogada e corta a bola.", "Passe errado de {p1}, {d1} recupera."],
    'drible_sucesso': ["QUE JOGADA! {p1} passa por {d1}!", "{p1} deixa {d1} para trás com um belo drible.", "Um, dois, passou! {p1} avança!"],
    'drible_falha': ["Belo desarme de {d1}!", "{d1} chega firme e rouba a bola de {p1}.", "{p1} tenta o drible mas {d1} leva a melhor."],
    'chute_gol': ["GOL! GOL! GOL! {p1} abre o placar!", "{p1} chuta com categoria e marca!", "No fundo da rede! Gol de {p1}!"],
    'chute_fora': ["PARA FORA! {p1} isolou a bola.", "{p1} chuta forte, mas sem direção.", "Tira tinta da trave! Quase o gol de {p1}."],
    'desarme': ["{d1} dá um bote certeiro e recupera a posse.", "{p1} se enrola e {d1} rouba a bola."],
    'lancamento': ["LANÇAMENTO! {p1} encontra {p2} em profundidade!", "{p1} vê a passagem de {p2} e lança!"]
}

# --- FUNÇÕES AUXILIARES ---
def decrease_stamina(player, amount):
    base_stamina = player.get('stamina', 1)
    if base_stamina == 0: base_stamina = 1
    reduction = amount * (20 / base_stamina)
    player['current_stamina'] = max(6.0, player['current_stamina'] - reduction)

def get_player_by_position(squad, position):
    players_in_position = [p for p in squad if p['position'] == position]
    return random.choice(players_in_position) if players_in_position else random.choice(squad)

def aplicar_penalidade_resistencia(jogador):
    stamina = jogador.get('current_stamina', 100)
    if stamina > 70: return 1.0
    elif stamina > 40: return 0.9
    elif stamina > 10: return 0.75
    else: return 0.6

# --- FUNÇÕES DE RESOLUÇÃO DE JOGADAS ---
def resolver_passe(passador, receptor, defensor, is_long_ball=False):
    decrease_stamina(passador, 1.5 if not is_long_ball else 2.5)
    penalidade = aplicar_penalidade_resistencia(passador)
    
    pass_power = (passador['passing'] * 0.5 + passador['vision'] * 0.5) * penalidade
    interception_power = (defensor['anticipation'] * 0.6 + defensor['positioning'] * 0.4)

    if pass_power > interception_power * random.uniform(0.8, 1.5):
        text_key = 'lancamento' if is_long_ball else 'passe_sucesso'
        text = random.choice(TEXTS[text_key]).format(p1=passador['name'], p2=receptor['name'])
        return {"outcome": "success", "new_player": receptor, "text": text, "gera_chance": is_long_ball}
    else:
        text = random.choice(TEXTS['passe_falha']).format(p1=passador['name'], d1=defensor['name'])
        return {"outcome": "failure", "text": text}

def resolve_drible(driblador, defensor):
    decrease_stamina(driblador, 3)
    penalidade = aplicar_penalidade_resistencia(driblador)
    
    drible_power = (driblador['dribbling'] * 0.6 + driblador['agility'] * 0.4) * penalidade
    tackle_power = (defensor['tackling'] * 0.5 + defensor['decisions'] * 0.3)

    if drible_power > tackle_power * random.uniform(0.7, 1.4):
        text = random.choice(TEXTS['drible_sucesso']).format(p1=driblador['name'], d1=defensor['name'])
        return {"outcome": "success", "new_player": driblador, "text": text, "gera_chance": True}
    else:
        text = random.choice(TEXTS['drible_falha']).format(p1=driblador['name'], d1=defensor['name'])
        return {"outcome": "failure", "text": text}

def resolve_chute(atacante, possession_holder, is_clear_chance=False):
    decrease_stamina(atacante, 4)
    penalidade = aplicar_penalidade_resistencia(atacante)
    
    chance_modifier = 1.5 if is_clear_chance else 1.0
    goal_chance = ((atacante['finishing'] * 0.7 + atacante['composure'] * 0.3) * penalidade * chance_modifier) / 25.0
    
    if random.random() < goal_chance:
        text = random.choice(TEXTS['chute_gol']).format(p1=atacante['name'])
        return {"outcome": "goal", "team": possession_holder, "scorer_id": atacante['id'], "text": text}
    else:
        text = random.choice(TEXTS['chute_fora']).format(p1=atacante['name'])
        return {"outcome": "failure", "text": text}

# --- MOTOR DA PARTIDA ---
def get_squad_for_match(full_squad_data, formation):
    for player in full_squad_data: player['current_stamina'] = 100
    squad, available_players = [], list(full_squad_data)
    random.shuffle(available_players)
    formation_plan = FORMATIONS.get(formation, FORMATIONS.get('442'))
    for position, count in formation_plan.items():
        found_players = [p for p in available_players if p['position'] == position][:count]
        squad.extend(found_players)
        for p in found_players: available_players.remove(p)
    if len(squad) < 11: squad.extend(available_players[:11 - len(squad)])
    return squad

def simulate_event_based_match(home_squad_data, away_squad_data, formation, lineup_ids=None, player_team=None):
    if lineup_ids and player_team == 'home':
        home_squad = [p for p in home_squad_data if p['id'] in lineup_ids]
        away_squad = get_squad_for_match(away_squad_data, formation)
    elif lineup_ids and player_team == 'away':
        away_squad = [p for p in away_squad_data if p['id'] in lineup_ids]
        home_squad = get_squad_for_match(home_squad_data, formation)
    else:
        home_squad = get_squad_for_match(home_squad_data, formation)
        away_squad = get_squad_for_match(away_squad_data, formation)

    for player in home_squad: player['current_stamina'] = 100
    for player in away_squad: player['current_stamina'] = 100
    
    events = []
    if len(home_squad) < 11 or len(away_squad) < 11:
        return {"home_goals": 0, "away_goals": 0, "events": [{"minute": 1, "text": "Partida não pôde ser realizada (escalação incompleta)."}]}

    home_goals, away_goals = 0, 0
    possession_holder, chance_criada = "home", False

    for minute in range(1, 91):
        for player in home_squad + away_squad: decrease_stamina(player, 0.2)
        
        if random.random() > 0.65: # Aumenta a frequência de eventos
            attacking_squad = home_squad if possession_holder == "home" else away_squad
            defending_squad = away_squad if possession_holder == "home" else home_squad
            
            result = None
            action = random.choice(['passe', 'drible', 'lancamento', 'desarme'])

            if action == 'desarme' and not chance_criada:
                p1 = get_player_by_position(attacking_squad, random.choice(['Meio-campo', 'Zagueiro']))
                d1 = get_player_by_position(defending_squad, random.choice(['Meio-campo', 'Atacante']))
                result = {"outcome": "failure", "text": random.choice(TEXTS['desarme']).format(p1=p1['name'], d1=d1['name'])}
            elif action == 'passe':
                p1 = get_player_by_position(attacking_squad, random.choice(['Zagueiro', 'Meio-campo']))
                p2 = get_player_by_position(attacking_squad, random.choice(['Meio-campo', 'Atacante']))
                d1 = get_player_by_position(defending_squad, 'Meio-campo')
                result = resolver_passe(p1, p2, d1)
            elif action == 'lancamento':
                p1 = get_player_by_position(attacking_squad, 'Meio-campo')
                p2 = get_player_by_position(attacking_squad, 'Atacante')
                d1 = get_player_by_position(defending_squad, 'Zagueiro')
                result = resolver_passe(p1, p2, d1, is_long_ball=True)
            elif action == 'drible':
                p1 = get_player_by_position(attacking_squad, random.choice(['Meio-campo', 'Atacante']))
                d1 = get_player_by_position(defending_squad, random.choice(['Zagueiro', 'Meio-campo']))
                result = resolve_drible(p1, d1)

            if result:
                chance_criada = result.get('gera_chance', False)
                if random.random() < 0.35 and chance_criada:
                    atacante = get_player_by_position(attacking_squad, 'Atacante')
                    result = resolve_chute(atacante, possession_holder, is_clear_chance=chance_criada)

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
                    chance_criada = False

    events.append({"minute": 90, "text": f"FIM DE JOGO! Placar Final: {home_goals} x {away_goals}"})
    return {"home_goals": home_goals, "away_goals": away_goals, "events": events, "home_lineup": [{k: v for k, v in p.items()} for p in home_squad], "away_lineup": [{k: v for k, v in p.items()} for p in away_squad]}

if __name__ == "__main__":
    input_data = json.load(sys.stdin)
    result_dict = simulate_event_based_match(
        input_data['home_squad'], input_data['away_squad'], 
        input_data.get('formation', '442'), input_data.get('lineup'), 
        input_data.get('player_team')
    )
    print(json.dumps(result_dict))