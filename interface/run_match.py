import json
import random
import sys

# --- CONFIGURAÇÕES ---
FORMATIONS = {
    '442': {'Goleiro': 1, 'Zagueiro': 4, 'Meio-campo': 4, 'Atacante': 2},
    '433': {'Goleiro': 1, 'Zagueiro': 4, 'Meio-campo': 3, 'Atacante': 3},
    '352': {'Goleiro': 1, 'Zagueiro': 3, 'Meio-campo': 5, 'Atacante': 2}
}

INJURY_TYPES = {
    'Leve': [
        {"name": "Tornozelo torcido", "days": (7, 14)},
        {"name": "Contusão muscular", "days": (5, 10)},
        {"name": "Pancada na coxa", "days": (7, 12)},
        {"name": "Corte profundo", "days": (3, 7)},
        {"name": "Estiramento leve", "days": (10, 15)},
        {"name": "Luxação no dedo", "days": (7, 21)}
    ],
    'Mediana': [
        {"name": "Lesão no ligamento do joelho", "days": (28, 56)},
        {"name": "Fratura no pulso", "days": (30, 60)},
        {"name": "Lesão muscular na coxa", "days": (21, 45)},
        {"name": "Hérnia", "days": (45, 70)},
        {"name": "Fratura por estresse", "days": (40, 65)},
        {"name": "Lesão no ombro", "days": (30, 50)}
    ],
    'Grave': [
        {"name": "Ruptura de ligamento cruzado", "days": (180, 240)},
        {"name": "Fratura na perna", "days": (120, 180)},
        {"name": "Lesão grave no tendão de Aquiles", "days": (200, 270)},
        {"name": "Fratura craniana", "days": (90, 150)},
        {"name": "Lesão na coluna", "days": (150, 210)},
        {"name": "Ruptura muscular grave", "days": (90, 120)}
    ]
}

TEXTS = {
    'inicio_posse': ["{time} começa a trabalhar a bola no campo de defesa.", "{time} recupera a posse e tenta organizar o jogo."],
    'passe_curto_sucesso': ["{p1} toca de lado para {p2}.", "{p2} recebe o passe curto de {p1}."],
    'passe_longo_sucesso': ["QUE LANÇAMENTO! {p1} vira o jogo e encontra {p2}!", "{p1} acha {p2} com um passe longo preciso."],
    'cruzamento_sucesso': ["{p1} vai à linha de fundo e cruza na área!", "{p1} levanta a bola na cabeça do atacante!"],
    'passe_falha': ["{d1} intercepta o passe de {p1}.", "{d1} lê a jogada e corta a bola.", "Passe errado de {p1}, {d1} recupera."],
    'drible_sucesso': ["QUE JOGADA! {p1} passa por {d1}!", "{p1} deixa {d1} para trás com um belo drible."],
    'drible_falha': ["Belo desarme de {d1}!", "{d1} chega firme e rouba a bola de {p1}."],
    'chute_gol': ["GOL! GOL! GOL! {p1} abre o placar!", "{p1} chuta com categoria e marca!", "No fundo da rede! Gol de {p1}!"],
    'chute_cabeca_gol': ["GOL DE CABEÇA! {p1} sobe mais que todo mundo e marca!", "Após o cruzamento, {p1} testa firme para o fundo do gol!"],
    'chute_longe_gol': ["UM FOGUETE! GOLAÇO de {p1} de fora da área!", "{p1} arrisca de longe e acerta o ângulo!"],
    'chute_fora': ["PARA FORA! {p1} isola a bola.", "{p1} chuta forte, mas sem direção.", "Tira tinta da trave! Quase o gol de {p1}."],
    'desarme': ["{d1} dá um bote certeiro e recupera a posse.", "{p1} se enrola e {d1} rouba a bola."],
    'disputa_fisica': ["{p1} usa o corpo e ganha a disputa contra {d2}.", "{d2} tenta proteger, mas {p1} é mais forte e fica com a bola."],
    'falta': ["FALTA! {d1} chega atrasado e derruba {p1}.", "{d1} para o contra-ataque de {p1} com falta."],
    'cartao_amarelo': ["CARTÃO AMARELO para {p1} pela falta dura.", "{p1} exagerou na força e foi advertido."],
    'cartao_vermelho': ["É VERMELHO! {p1} faz falta criminosa e está expulso!", "{p1} já tinha amarelo e agora recebe o segundo! Rua!"],
    'lesao': ["PREOCUPAÇÃO NO AR! {p1} cai no gramado e parece ter se machucado: {injury_name}.", "{p1} sente uma fisgada e pede substituição."],
    'atmosfera': ["A torcida canta alto, empurrando o time da casa.", "O jogo é estudado, com as duas equipes se marcando muito."]
}

def decrease_stamina(player, amount):
    base_stamina = player.get('stamina', 10)
    if base_stamina <= 0: base_stamina = 1
    fatigue_factor = 1.5 - (base_stamina / 20)
    reduction = amount * fatigue_factor
    player['current_stamina'] = max(0.0, player['current_stamina'] - reduction)

def get_player_by_position(squad, position):
    players_in_position = [p for p in squad if p['position'] == position and p.get('expulso', False) == False]
    return random.choice(players_in_position) if players_in_position else random.choice([p for p in squad if p.get('expulso', False) == False])

def aplicar_penalidade_resistencia(jogador):
    stamina = jogador.get('current_stamina', 100)
    if stamina > 70: return 1.0
    elif stamina > 40: return 0.9
    elif stamina > 10: return 0.75
    else: return 0.6

def resolver_falta(defensor, atacante, cartoes_amarelos):
    text = random.choice(TEXTS['falta']).format(d1=defensor['name'], p1=atacante['name'])
    # --- MUDANÇA: AUMENTANDO A CHANCE BASE DE CARTÃO ---
    chance_cartao = (defensor.get('aggression', 10) / 20) * 0.7 # Aumentado de 0.4 para 0.7
    
    if random.random() < chance_cartao:
        if defensor['id'] in cartoes_amarelos:
            cartoes_amarelos.remove(defensor['id'])
            text += " " + random.choice(TEXTS['cartao_vermelho']).format(p1=defensor['name'])
            return {"outcome": "red_card", "player_id": defensor['id'], "text": text}
        else:
            cartoes_amarelos.add(defensor['id'])
            text += " " + random.choice(TEXTS['cartao_amarelo']).format(p1=defensor['name'])
            return {"outcome": "yellow_card", "player_id": defensor['id'], "text": text}
    
    return {"outcome": "foul", "text": text}

def resolver_disputa_fisica(p1, p2):
    decrease_stamina(p1, 2)
    decrease_stamina(p2, 2)
    p1_power = p1['strength'] * aplicar_penalidade_resistencia(p1)
    p2_power = p2['strength'] * aplicar_penalidade_resistencia(p2)
    if p1_power * random.uniform(0.8, 1.2) > p2_power:
        return {"outcome": "success", "new_player": p1, "text": random.choice(TEXTS['disputa_fisica']).format(p1=p1['name'], d2=p2['name'])}
    else:
        return {"outcome": "failure", "text": random.choice(TEXTS['desarme']).format(p1=p1['name'], d1=p2['name'])}

def resolver_passe(passador, receptor, defensor, tipo_passe):
    acao_custo = {'curto': 1.5, 'longo': 2.5, 'cruzamento': 2.2}
    decrease_stamina(passador, acao_custo.get(tipo_passe, 1.5))
    penalidade = aplicar_penalidade_resistencia(passador)
    if tipo_passe == 'cruzamento':
        pass_power = (passador['crossing'] * 0.7 + passador['vision'] * 0.3) * penalidade
    else:
        pass_power = (passador['passing'] * 0.5 + passador['vision'] * 0.5) * penalidade
    interception_power = (defensor['anticipation'] * 0.6 + defensor['positioning'] * 0.4)
    if pass_power > interception_power * random.uniform(0.8, 1.5):
        text_key = f'passe_{tipo_passe}_sucesso' if tipo_passe != 'cruzamento' else 'cruzamento_sucesso'
        text = random.choice(TEXTS[text_key]).format(p1=passador['name'], p2=receptor['name'])
        return {"outcome": "success", "new_player": receptor, "text": text, "gera_chance": tipo_passe != 'curto'}
    else:
        text = random.choice(TEXTS['passe_falha']).format(p1=passador['name'], d1=defensor['name'])
        return {"outcome": "failure", "text": text}

def resolve_drible(driblador, defensor):
    decrease_stamina(driblador, 3)
    penalidade = aplicar_penalidade_resistencia(driblador)
    drible_power = (driblador['dribbling'] * 0.6 + driblador['agility'] * 0.4) * penalidade
    tackle_power = (defensor['tackling'] * 0.5 + defensor['decisions'] * 0.3)
    if drible_power > tackle_power * random.uniform(0.7, 1.4):
        return {"outcome": "success", "new_player": driblador, "text": random.choice(TEXTS['drible_sucesso']).format(p1=driblador['name'], d1=defensor['name']), "gera_chance": True}
    else:
        return {"outcome": "failure", "text": random.choice(TEXTS['drible_falha']).format(p1=driblador['name'], d1=defensor['name'])}

def resolve_chute(atacante, posse, is_clear_chance, tipo_chute):
    acao_custo = {'normal': 4, 'longe': 4.5, 'cabeca': 3.5}
    decrease_stamina(atacante, acao_custo.get(tipo_chute, 4))
    penalidade = aplicar_penalidade_resistencia(atacante)
    chance_modifier = 1.5 if is_clear_chance else 1.0
    if tipo_chute == 'longe':
        goal_chance = ((atacante['long_shots'] * 0.6 + atacante['strength'] * 0.4) * penalidade * chance_modifier) / 28.0
    elif tipo_chute == 'cabeca':
        goal_chance = ((atacante['heading'] * 0.8 + atacante['strength'] * 0.2) * penalidade * chance_modifier) / 25.0
    else:
        goal_chance = ((atacante['finishing'] * 0.7 + atacante['composure'] * 0.3) * penalidade * chance_modifier) / 25.0
    if random.random() < goal_chance:
        text_key = f'chute_{tipo_chute}_gol' if tipo_chute != 'normal' else 'chute_gol'
        text = random.choice(TEXTS.get(text_key, TEXTS['chute_gol'])).format(p1=atacante['name'])
        return {"outcome": "goal", "team": posse, "scorer_id": atacante['id'], "text": text}
    else:
        return {"outcome": "failure", "text": random.choice(TEXTS['chute_fora']).format(p1=atacante['name'])}

def get_squad_for_match(full_squad_data, formation):
    for player in full_squad_data: 
        player['current_stamina'] = 100
        player['expulso'] = False
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

    for player in home_squad: player.update({'current_stamina': 100, 'expulso': False})
    for player in away_squad: player.update({'current_stamina': 100, 'expulso': False})
    
    events, home_goals, away_goals = [], 0, 0
    lesionados, cartoes_amarelos, cartoes_vermelhos = [], set(), set()
    posse_bola, zona_campo, chance_clara = "home", 'Defesa', False

    if len(home_squad) < 11 or len(away_squad) < 11:
        return {"home_goals": 0, "away_goals": 0, "events": [{"minute": 1, "text": "Escalação incompleta."}]}

    events.append({"minute": 0, "text": random.choice(TEXTS['inicio_posse']).format(time="Time da Casa")})

    for minute in range(1, 91):
        for player in home_squad + away_squad: 
            if not player['expulso']: decrease_stamina(player, 0.3)
        
        if random.random() > 0.60:
            attacking_squad = home_squad if posse_bola == "home" else away_squad
            defending_squad = away_squad if posse_bola == "home" else home_squad
            result = None
            
            if zona_campo == 'Ataque':
                # --- MUDANÇA: AUMENTANDO A CHANCE DE SOFRER FALTA ---
                acao = random.choices(['chute', 'drible', 'cruzamento', 'falta_sofrida'], weights=[0.35, 0.15, 0.2, 0.3], k=1)[0]
            elif zona_campo == 'Meio-campo':
                acao = random.choices(['passe_longo', 'drible', 'passe_curto', 'disputa_fisica', 'falta_sofrida'], weights=[0.3, 0.25, 0.2, 0.1, 0.15], k=1)[0]
            else:
                acao = random.choices(['passe_curto', 'passe_longo', 'desarme'], weights=[0.6, 0.3, 0.1], k=1)[0]

            if acao == 'falta_sofrida':
                atacante = get_player_by_position(attacking_squad, 'Atacante' if zona_campo == 'Ataque' else 'Meio-campo')
                defensor = get_player_by_position(defending_squad, 'Zagueiro' if zona_campo == 'Ataque' else 'Meio-campo')
                result = resolver_falta(defensor, atacante, cartoes_amarelos)
            elif acao == 'passe_curto':
                p1 = get_player_by_position(attacking_squad, 'Meio-campo' if zona_campo != 'Defesa' else 'Zagueiro')
                p2 = get_player_by_position(attacking_squad, 'Meio-campo' if zona_campo != 'Ataque' else 'Atacante')
                d1 = get_player_by_position(defending_squad, 'Meio-campo')
                result = resolver_passe(p1, p2, d1, 'curto')
                if result['outcome'] == 'success': zona_campo = 'Meio-campo' if zona_campo == 'Defesa' else 'Ataque'
            elif acao == 'passe_longo':
                p1 = get_player_by_position(attacking_squad, 'Zagueiro' if zona_campo == 'Defesa' else 'Meio-campo')
                p2 = get_player_by_position(attacking_squad, 'Atacante')
                d1 = get_player_by_position(defending_squad, 'Zagueiro')
                result = resolver_passe(p1, p2, d1, 'longo')
                if result['outcome'] == 'success': zona_campo = 'Ataque'
            elif acao == 'drible':
                p1 = get_player_by_position(attacking_squad, 'Meio-campo' if zona_campo != 'Ataque' else 'Atacante')
                d1 = get_player_by_position(defending_squad, 'Zagueiro' if zona_campo == 'Ataque' else 'Meio-campo')
                result = resolve_drible(p1, d1)
                if result['outcome'] == 'success': zona_campo = 'Ataque'
            elif acao == 'disputa_fisica':
                p1 = get_player_by_position(attacking_squad, 'Meio-campo')
                p2 = get_player_by_position(defending_squad, 'Meio-campo')
                result = resolver_disputa_fisica(p1, p2)
            elif acao == 'cruzamento':
                p1 = get_player_by_position(attacking_squad, 'Meio-campo')
                p2 = get_player_by_position(attacking_squad, 'Atacante')
                d1 = get_player_by_position(defending_squad, 'Zagueiro')
                result = resolver_passe(p1, p2, d1, 'cruzamento')
                if result['outcome'] == 'success':
                    atacante = get_player_by_position(attacking_squad, 'Atacante')
                    result = resolve_chute(atacante, posse_bola, True, 'cabeca')
            elif acao == 'chute':
                atacante = get_player_by_position(attacking_squad, 'Atacante')
                tipo_chute = 'longe' if random.random() < 0.3 else 'normal'
                result = resolve_chute(atacante, posse_bola, chance_clara, tipo_chute)

            if result:
                chance_clara = result.get('gera_chance', False)
                
                if acao in ['drible', 'disputa_fisica', 'falta_sofrida'] and random.random() < 0.02:
                    p1 = locals().get('p1')
                    atacante = locals().get('atacante')
                    jogador_afetado = result.get('new_player', atacante if atacante else p1)
                    if jogador_afetado:
                        severity = random.choices(['Leve', 'Mediana', 'Grave'], weights=[0.7, 0.25, 0.05], k=1)[0]
                        injury_info = random.choice(INJURY_TYPES[severity])
                        min_d, max_d = injury_info['days']
                        injury_duration = random.randint(min_d, max_d)
                        
                        # --- MUDANÇA: ADICIONA DADOS DA LESÃO AO EVENTO ---
                        lesionados.append({"player_id": jogador_afetado['id'], "days": injury_duration})
                        result['text'] += " " + random.choice(TEXTS['lesao']).format(p1=jogador_afetado['name'], injury_name=injury_info['name'])
                        result['injury'] = True
                        
                event_log = {"minute": minute, "text": result['text']}
                if result.get('outcome') in ['yellow_card', 'red_card']:
                    event_log['card'] = result['outcome'].split('_')[0]
                    event_log['card_player_id'] = result.get('player_id')
                    if result['outcome'] == 'yellow_card':
                        cartoes_amarelos.add(result.get('player_id'))
                    if result['outcome'] == 'red_card':
                        cartoes_vermelhos.add(result.get('player_id'))
                        for p in home_squad + away_squad:
                            if p['id'] == result['player_id']:
                                p['expulso'] = True
                                break
                
                # --- MUDANÇA: INFORMA A UI SOBRE A LESÃO ---
                if result.get('injury'):
                    event_log['injury'] = True

                if result.get('outcome') == 'goal':
                    if result.get('team') == 'home': home_goals += 1
                    else: away_goals += 1
                    event_log['scorer_id'] = result.get('scorer_id')
                
                event_log['player_states'] = {p['id']: p['current_stamina'] for p in home_squad + away_squad if not p['expulso']}
                events.append(event_log)

                if result['outcome'] != 'success':
                    posse_bola = "away" if posse_bola == "home" else "home"
                    zona_campo = 'Defesa'
                    chance_clara = False
        
        elif random.random() < 0.05:
             events.append({"minute": minute, "text": random.choice(TEXTS['atmosfera'])})

    events.append({"minute": 90, "text": f"FIM DE JOGO! Placar Final: {home_goals} x {away_goals}"})
    
    return {
        "home_goals": home_goals, 
        "away_goals": away_goals, 
        "events": events, 
        "home_lineup": [{k: v for k, v in p.items()} for p in home_squad], 
        "away_lineup": [{k: v for k, v in p.items()} for p in away_squad],
        "injuries": lesionados,
        "yellow_cards": list(cartoes_amarelos),
        "red_cards": list(cartoes_vermelhos)
    }

if __name__ == "__main__":
    input_data = json.load(sys.stdin)
    result_dict = simulate_event_based_match(
        input_data['home_squad'], input_data['away_squad'], 
        input_data.get('formation', '442'), input_data.get('lineup'), 
        input_data.get('player_team')
    )
    print(json.dumps(result_dict))