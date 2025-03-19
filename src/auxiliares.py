import os

def save_transcript(transcript, output_file):
    """Salva a transcrição em um arquivo de texto na pasta decupagens_salvas/."""
    try:
        # Criar o diretório "decupagens_salvas/" se não existir
        save_dir = "decupagens_salvas/"
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
        
        # Garantir que o arquivo tenha a extensão ".txt"
        if not output_file.lower().endswith('.txt'):
            output_file = f"{output_file}.txt"
        
        # Combinar o caminho do diretório com o nome do arquivo
        full_path = os.path.join(save_dir, output_file)
        
        with open(full_path, 'w', encoding='utf-8') as file:
            file.write(transcript)
        return full_path
    except Exception as e:
        print(f"Erro ao salvar o arquivo: {e}")
        return False

def list_audio_files():
    """Lista os arquivos de áudio disponíveis na pasta audio_raw/ e permite seleção pelo usuário."""
    audio_dir = "audio_raw/"
    
    # Verificar se a pasta existe
    if not os.path.exists(audio_dir):
        print(f"A pasta {audio_dir} não foi encontrada.")
        return None
    
    # Listar apenas arquivos com extensões suportadas
    supported_formats = ['.wav', '.aiff', '.aif', '.flac', '.mp3']
    audio_files = []
    
    for file in os.listdir(audio_dir):
        _, ext = os.path.splitext(file)
        if ext.lower() in supported_formats:
            audio_files.append(file)
    
    if not audio_files:
        print(f"Nenhum arquivo de áudio suportado encontrado em {audio_dir}")
        return None
    
    # Exibir os arquivos disponíveis
    print("\nArquivos de áudio disponíveis:")
    for i, file in enumerate(audio_files, 1):
        print(f"{i}. {file}")
    
    # Solicitar seleção ao usuário
    while True:
        try:
            choice = input("\nSelecione o número do arquivo ou digite 'c' para caminho personalizado: ")
            if choice.lower() == 'c':
                custom_path = input("Digite o caminho completo do arquivo: ")
                return custom_path
            
            choice = int(choice)
            if 1 <= choice <= len(audio_files):
                selected_file = os.path.join(audio_dir, audio_files[choice-1])
                print(f"Arquivo selecionado: {selected_file}")
                return selected_file
            else:
                print("Escolha inválida. Tente novamente.")
        except ValueError:
            print("Entrada inválida. Digite um número ou 'c'.")
