import os
import sys
import argparse
import time

from src.config import setup_whisper_environment, check_dependencies, MODELS_DIR
from src.utilidades_ffmpeg import check_ffmpeg
from src.transcricao import transcribe_with_whisper, download_whisper_model
from src.auxiliares import list_audio_files, save_transcript
from src.processa_texto import improve_transcript

def main():
    # Configurar ambiente para modelos locais
    setup_whisper_environment()
    
    # Chamar check_ffmpeg no início
    check_ffmpeg()
    
    # Configurar o parser de argumentos
    parser = argparse.ArgumentParser(description='Transcrever áudio para texto.')
    parser.add_argument('--file', '-f', help='Caminho para o arquivo de áudio')
    parser.add_argument('--language', '-l', default='pt-BR', help='Idioma do áudio (padrão: pt-BR)')
    parser.add_argument('--output', '-o', help='Arquivo para salvar a transcrição')
    parser.add_argument('--enhance', '-e', action='store_true', default=True,
                       help='Aplicar aprimoramento spaCy à transcrição (ativo por padrão)')
    parser.add_argument('--whisper', '-w', action='store_true', help='Forçar uso do modelo Whisper para transcrição')
    parser.add_argument('--model', '-m', choices=['tiny', 'base', 'small', 'medium', 'large'], default='small',
                       help='Tamanho do modelo Whisper a ser usado (padrão: small)')
    parser.add_argument('--download-model', '-d', action='store_true', help='Baixar modelo Whisper especificado e sair')
    parser.add_argument('--force-download', '-fd', action='store_true', help='Forçar download do modelo mesmo se já existir')
    
    args = parser.parse_args()
    
    print("=== Transcrição de Áudio para Texto ===")
    
    # Se solicitado o download do modelo, baixar e sair
    if args.download_model:
        if download_whisper_model(args.model, args.force_download):
            print(f"Modelo '{args.model}' baixado com sucesso.")
        else:
            print(f"Falha ao baixar modelo '{args.model}'.")
        sys.exit(0)
    
    if not check_dependencies():
        sys.exit(1)
    
    # Verificar se o modelo small está disponível localmente quando iniciado sem argumentos
    if len(sys.argv) == 1:  # Apenas o nome do script
        model_path = os.path.join(MODELS_DIR, "small.pt")
        if not os.path.exists(model_path):
            print("\nO modelo small.pt não foi encontrado na pasta local do projeto.")
            download_choice = input("Deseja baixar o modelo agora? (s/n): ")
            if download_choice.lower() == 's':
                if not download_whisper_model("small"):
                    print("Falha ao baixar o modelo. O programa será encerrado.")
                    sys.exit(1)
            else:
                print("O modelo é necessário para a transcrição. Encerrando o programa.")
                sys.exit(0)
    
    # Obter o arquivo de áudio
    audio_file = args.file
    if not audio_file:
        print("Nenhum arquivo especificado. Buscando arquivos disponíveis...")
        audio_file = list_audio_files()
        # Se o usuário não selecionar um arquivo da lista ou personalizado
        if not audio_file:
            audio_file = input("Digite o caminho para o arquivo de áudio: ")
    
    # Iniciar cronômetro
    start_time = time.time()
    
    # Realizar a transcrição usando o método Whisper
    print(f"Processando arquivo: {audio_file}")
    
    # Verificar existência do arquivo antes de prosseguir
    if not os.path.exists(audio_file):
        print(f"O arquivo não existe no caminho especificado: {audio_file}")
        sys.exit(1)
    
    print(f"Caminho absoluto do arquivo: {os.path.abspath(audio_file)}")
    print(f"Tamanho do arquivo: {os.path.getsize(audio_file)} bytes")
    
    # Usar sempre o método Whisper
    transcript = transcribe_with_whisper(audio_file, args.language, args.model)
    
    # Aplicar aprimoramento avançado se solicitado
    if args.enhance and transcript and not transcript.startswith("Erro:"):
        transcript = improve_transcript(transcript)
    
    # Finalizar cronômetro
    elapsed_time = time.time() - start_time
    
    print("\n=== Transcrição ===")
    print(transcript)
    print(f"\nTempo de processamento: {elapsed_time:.2f} segundos")
    
    # Salvar a transcrição se solicitado
    if args.output:
        saved_path = save_transcript(transcript, args.output)
        if saved_path:
            print(f"\nTranscrição salva com sucesso em: {saved_path}")
    else:
        save_option = input("\nDeseja salvar a transcrição em um arquivo? (s/n): ")
        if save_option.lower() == 's':
            output_file = input("Digite o nome do arquivo de saída: ")
            saved_path = save_transcript(transcript, output_file)
            if saved_path:
                print(f"Transcrição salva com sucesso em: {saved_path}")
    
    print("\nProcesso concluído.")

if __name__ == "__main__":
    main()
