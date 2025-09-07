# Mapeia os atributos mais importantes por posição para dar um peso maior no cálculo da HA.
ATTRIBUTE_WEIGHTS = {
    'Goleiro': { 'anticipation': 2, 'decisions': 2, 'positioning': 2, 'agility': 2, 'concentration': 2 },
    'Zagueiro': { 'heading': 2, 'marking': 3, 'tackling': 3, 'strength': 2, 'positioning': 2 },
    'Meio-campo': { 'passing': 3, 'vision': 3, 'decisions': 2, 'work_rate': 2, 'stamina': 2, 'tackling': 1, 'finishing': 1},
    'Atacante': { 'finishing': 3, 'composure': 2, 'dribbling': 2, 'acceleration': 2, 'pace': 2, 'heading': 1 }
}

ALL_ATTRIBUTES = [
    'crossing', 'dribbling', 'finishing', 'free_kicks', 'heading', 'long_shots', 'marking', 'tackling', 'passing', 'penalties',
    'aggression', 'anticipation', 'composure', 'concentration', 'decisions', 'determination', 'leadership', 'positioning', 'vision', 'work_rate',
    'acceleration', 'agility', 'balance', 'stamina', 'strength', 'pace'
]

def calculate_current_ability(player_attributes):
    """
    Calcula a Habilidade Atual (HA) de forma consistente.
    A fórmula agora é uma média ponderada dos atributos, escalada de forma mais suave para o intervalo 1-200.
    """
    position = player_attributes.get('position', 'Geral')
    weights = ATTRIBUTE_WEIGHTS.get(position, {})
    
    total_score = 0
    total_weight = 0
    
    for attr in ALL_ATTRIBUTES:
        weight = weights.get(attr, 1) # Atributos não listados têm peso 1
        value = player_attributes.get(attr, 1)
        total_score += value * weight
        total_weight += weight
        
    if total_weight == 0: return 40 # Valor base mínimo
    
    # A nova fórmula é mais linear: a média ponderada (escala 1-20) é multiplicada por um fator (8)
    # e somada a uma base para evitar HAs muito baixos.
    # Ex: Um jogador com média 10 terá HA ~100. Um jogador com média 15 terá HA ~140.
    ha = 20 + (total_score / total_weight) * 8
    
    # Garante que o HA fique dentro dos limites 1-200
    return int(min(200, max(1, ha)))