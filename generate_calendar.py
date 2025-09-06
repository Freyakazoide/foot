import sqlite3
import os
import random

def generate_season():
    """Prepara o banco de dados para uma nova temporada."""

    # Constrói o caminho para o banco de dados
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, 'foot.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Conectado ao banco de dados. Preparando para gerar a temporada...")

    # 1. Limpa dados de temporadas anteriores para começar do zero
    print("Limpando dados da temporada anterior...")
    cursor.execute("DELETE FROM league_tables;")
    cursor.execute("DELETE FROM fixtures;")
    cursor.execute("DELETE FROM competitions;")
    conn.commit()

    # 2. Cria a competição
    print("Criando a competição 'Campeonato Brasileiro'...")
    cursor.execute("INSERT INTO competitions (name, country, type) VALUES (?, ?, ?)", 
                   ('Campeonato Brasileiro', 'Brasil', 'league'))
    competition_id = cursor.lastrowid
    conn.commit()

    # 3. Pega todos os clubes e os insere na tabela de classificação
    cursor.execute("SELECT id FROM clubs")
    club_ids = [row[0] for row in cursor.fetchall()]

    if len(club_ids) < 2:
        print("Erro: Precisa de pelo menos 2 clubes para criar uma competição.")
        return

    print(f"Inicializando a tabela de classificação com {len(club_ids)} times...")
    for club_id in club_ids:
        cursor.execute("""
        INSERT INTO league_tables (competition_id, club_id) VALUES (?, ?)
        """, (competition_id, club_id))
    conn.commit()

    # 4. Gera os confrontos (fixtures)
    print("Gerando o calendário de jogos...")
    
    random.shuffle(club_ids)
    
    if len(club_ids) % 2 != 0:
        club_ids.append(None)
    
    num_teams = len(club_ids)
    num_rounds = num_teams - 1
    
    fixtures = []
    for round_num in range(num_rounds):
        round_fixtures = []
        for i in range(num_teams // 2):
            home = club_ids[i]
            away = club_ids[num_teams - 1 - i]
            if home is not None and away is not None:
                round_fixtures.append((home, away))
        
        fixtures.append(round_fixtures)
        club_ids.insert(1, club_ids.pop())

    return_fixtures = []
    for round_list in fixtures:
        return_round = [(away, home) for home, away in round_list]
        return_fixtures.append(return_round)
    
    all_fixtures = fixtures + return_fixtures

    # 5. Insere os jogos no banco de dados
    print(f"Inserindo {len(all_fixtures) * len(all_fixtures[0])} jogos no banco de dados...")
    round_counter = 1
    for round_list in all_fixtures:
        for home_id, away_id in round_list:
            cursor.execute("""
            INSERT INTO fixtures (competition_id, round, home_club_id, away_club_id)
            VALUES (?, ?, ?, ?)
            """, (competition_id, round_counter, home_id, away_id))
        round_counter += 1

    # 6. Define a data inicial do jogo (CORRIGIDO: DENTRO DA FUNÇÃO)
    print("Definindo a data inicial da temporada...")
    start_date = "2025-01-20" # Uma segunda-feira
    cursor.execute("DELETE FROM game_state;")
    cursor.execute("INSERT INTO game_state (id, current_date) VALUES (1, ?)", (start_date,))

    # FINAL DA FUNÇÃO (CORRIGIDO: DENTRO DA FUNÇÃO)
    conn.commit()
    conn.close()
    
    print("\nTemporada gerada com sucesso!")

# Roda a função principal
if __name__ == "__main__":
    generate_season()