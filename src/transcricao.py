import os
import requests

from src.config import MODELS_DIR
from src.processa_audio import convert_mp3_to_wav

def download_whisper_model(model_size="small", force=False):
    """Baixa explicitamente um modelo Whisper para uso na pasta local do projeto."""
    try:
        import whisper
        
        # Verificar se o modelo é válido
        valid_models = ["tiny", "base", "small", "medium", "large"]
        if model_size not in valid_models:
            print(f"Modelo '{model_size}' inválido. Usando modelo 'small'.")
            model_size = "small"
        
        # Definir caminhos
        model_path = os.path.join(MODELS_DIR, f"{model_size}.pt")
        
        # Verificar se já existe
        if os.path.exists(model_path) and not force:
            print(f"Modelo '{model_size}' já está disponível localmente.")
            file_size_mb = os.path.getsize(model_path) / (1024 * 1024)
            print(f"Localização do modelo: {model_path}")
            print(f"Tamanho do arquivo: {file_size_mb:.1f} MB")
            return True
        
        if force:
            print(f"Forçando download do modelo '{model_size}'...")
        
        # URLs dos modelos
        urls = {
            "tiny": "https://openaipublic.azureedge.net/main/whisper/models/65147644a518d12f04e32d6f3b26facc3f8dd46e5390956a9424a650c0ce22b9/tiny.pt",
            "base": "https://openaipublic.azureedge.net/main/whisper/models/ed3a0b6b1c0edf879ad9b11b1af5a0e6ab5db9205f891f668f8b0e6c6326e34e/base.pt",
            "small": "https://openaipublic.azureedge.net/main/whisper/models/9ecf779972d90ba49c06d968637d720dd632c55bbf19d441fb42bf17a411e794/small.pt",
            "medium": "https://openaipublic.azureedge.net/main/whisper/models/345ae4da62f9b3d59415adc60127b97c714f32e89e936602e85993674d08dcb1/medium.pt",
            "large": "https://openaipublic.azureedge.net/main/whisper/models/e4b87e7e0bf463eb8e6956e646f1e277e901512310def2c24bf0e11bd3c28e9a/large.pt"
        }
        
        if model_size not in urls:
            print(f"URL para modelo '{model_size}' não encontrada.")
            return False
            
        # Baixar o modelo
        print(f"Baixando modelo Whisper '{model_size}' (isso pode levar vários minutos)...")
        print(f"O arquivo será salvo em: {model_path}")
        
        # Criar diretório se não existir
        if not os.path.exists(MODELS_DIR):
            os.makedirs(MODELS_DIR)
        
        # Baixar com progresso
        response = requests.get(urls[model_size], stream=True)
        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024 * 1024  # 1 MB
        
        with open(model_path, 'wb') as file:
            if total_size > 0:
                print(f"Tamanho total do download: {total_size / (1024 * 1024):.1f} MB")
                downloaded = 0
                for data in response.iter_content(block_size):
                    downloaded += len(data)
                    file.write(data)
                    done = int(50 * downloaded / total_size)
                    percent = int(100 * downloaded / total_size)
                    import sys
                    sys.stdout.write(f"\r[{'=' * done}{' ' * (50-done)}] {percent}% ")
                    sys.stdout.flush()
                sys.stdout.write("\n")
            else:
                file.write(response.content)
        
        print(f"Modelo '{model_size}' baixado com sucesso para {model_path}")
        file_size_mb = os.path.getsize(model_path) / (1024 * 1024)
        print(f"Tamanho do arquivo: {file_size_mb:.1f} MB")
        
        return True
        
    except Exception as e:
        print(f"Erro ao baixar modelo Whisper: {e}")
        return False

def transcribe_with_whisper(audio_file_path, language="pt", model_size="small"):
    """Transcreve áudio usando o modelo Whisper da OpenAI com maior precisão."""
    import whisper
    
    # Caminho para o modelo local
    model_path = os.path.join(MODELS_DIR, f"{model_size}.pt")
    
    # Verificar se o modelo existe localmente
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Modelo Whisper '{model_size}' não encontrado em: {model_path}")
    
    # Normalizar e verificar caminho do arquivo
    audio_file_path = os.path.abspath(audio_file_path)
    
    if not os.path.isfile(audio_file_path):
        raise FileNotFoundError(f"Arquivo de áudio não encontrado: {audio_file_path}")
    
    print(f"Verificado o arquivo: {audio_file_path}")
    
    # Mapear códigos de idioma para formato do Whisper
    language_map = {
        "pt-BR": "pt",
        "en-US": "en",
        "es-ES": "es",
        "fr-FR": "fr",
        "it-IT": "it",
        "de-DE": "de",
    }
    
    # Converter código de idioma se necessário
    if language in language_map:
        whisper_language = language_map[language]
    else:
        whisper_language = language.split('-')[0]  # Extrair parte principal do código
    
    # Verificar se o modelo escolhido existe
    valid_models = ["tiny", "base", "small", "medium", "large"]
    if model_size not in valid_models:
        print(f"Modelo '{model_size}' inválido. Usando modelo 'small'.")
        model_size = "small"
    
    print(f"Carregando modelo Whisper {model_size} do local: {model_path}")
    
    # Carregar modelo do caminho local
    model = whisper.load_model(model_path)
    
    print(f"Transcrevendo com modelo Whisper {model_size}...")
    
    try:
        # Primeiro, verificamos se o arquivo é MP3 - Whisper tem problemas com MP3 em alguns sistemas
        _, file_extension = os.path.splitext(audio_file_path)
        temp_wav = None
        
        if (file_extension.lower() == '.mp3'):
            print("Convertendo MP3 para WAV para compatibilidade com Whisper...")
            temp_wav = convert_mp3_to_wav(audio_file_path)
            if temp_wav:
                audio_file_path = temp_wav
            else:
                raise RuntimeError("Falha ao converter MP3 para WAV para uso com Whisper")
            
            print(f"Usando arquivo WAV temporário: {audio_file_path}")
        
        # Transcrever com maior precisão e solicitar timestamps por palavra
        try:
            # Configurar opções para garantir que teremos timestamps de palavras
            # As versões mais recentes do Whisper suportam word_timestamps
            try:
                result = model.transcribe(
                    audio_file_path,
                    language=whisper_language,
                    fp16=False,          # Definir como False para compatibilidade com CPU
                    verbose=True,        # Mais informações de debug
                    beam_size=5,         # Aumentar beam search para maior precisão
                    word_timestamps=True,  # Obter timestamps para cada palavra
                    without_timestamps=False,  # Assegurar que os timestamps serão gerados
                    temperature=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0]  # Usar várias temperaturas para melhores resultados
                )
            except TypeError:
                # Se a versão não suporta word_timestamps, usar a API padrão
                print("Esta versão do Whisper não suporta word_timestamps, usando método padrão")
                result = model.transcribe(
                    audio_file_path,
                    language=whisper_language,
                    fp16=False,
                    verbose=True,
                    temperature=[0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
                )
            
            # Estruturar a saída para incluir segmentos com timestamps
            structured_transcription = {
                "text": result["text"].strip(),
                "segments": []
            }
            
            # Processar os segmentos
            for segment in result["segments"]:
                segment_data = {
                    "id": segment["id"],
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"].strip()
                }
                
                # Adicionar palavras com timestamps se disponíveis
                if "words" in segment and segment["words"]:
                    words = []
                    for word_data in segment["words"]:
                        if isinstance(word_data, dict) and "word" in word_data:
                            words.append({
                                "word": word_data["word"],
                                "start": word_data["start"],
                                "end": word_data["end"],
                            })
                    
                    segment_data["words"] = words
                
                structured_transcription["segments"].append(segment_data)
                
            print(f"Transcrição concluída com {len(structured_transcription['segments'])} segmentos")
            return structured_transcription
            
        finally:
            # Limpar arquivo temporário se foi criado
            if temp_wav and os.path.exists(temp_wav):
                os.remove(temp_wav)
                
    except Exception as e:
        print(f"Erro detalhado ao usar Whisper: {type(e).__name__}: {e}")
        # Tentar usar o método alternativo mais simples
        try:
            import whisper.transcribe
            print("Tentando método alternativo de transcrição...")
            # Carregar o áudio usando o método interno do whisper
            audio = whisper.load_audio(audio_file_path)
            # Transcrever usando método mais direto, ainda solicitando timestamps
            result = whisper.transcribe.transcribe(
                model, 
                audio, 
                language=whisper_language,
                word_timestamps=True,
                without_timestamps=False
            )
            
            # Estruturar a saída para incluir segmentos com timestamps
            structured_transcription = {
                "text": result["text"].strip(),
                "segments": []
            }
            
            # Processar os segmentos
            for segment in result["segments"]:
                structured_transcription["segments"].append({
                    "id": segment["id"],
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"].strip(),
                    "words": segment.get("words", [])
                })
                
            return structured_transcription
            
        except Exception as e2:
            print(f"Erro no método alternativo: {e2}")
            raise

def transcribe_audio(audio_file_path, language="pt-BR"):
    """Transcreve um arquivo de áudio para texto usando Google Speech Recognition."""
    import speech_recognition as sr
    
    # Verificar se o arquivo existe
    if not os.path.exists(audio_file_path):
        return "Erro: O arquivo especificado não foi encontrado."
    
    # Verificar a extensão do arquivo
    _, file_extension = os.path.splitext(audio_file_path)
    supported_formats = ['.wav', '.aiff', '.aif', '.flac', '.mp3']
    
    if file_extension.lower() not in supported_formats:
        return f"Erro: O formato do arquivo não é suportado. Formatos suportados: {', '.join(supported_formats)}"
    
    # Converter MP3 para WAV se necessário
    temp_wav = None
    if file_extension.lower() == '.mp3':
        print("Convertendo MP3 para WAV...")
        temp_wav = convert_mp3_to_wav(audio_file_path)
        if not temp_wav:
            return "Erro: Falha na conversão do arquivo MP3."
        audio_file_path = temp_wav
    
    # Inicializando o recognizer
    recognizer = sr.Recognizer()
    
    try:
        # Abrindo o arquivo de áudio
        with sr.AudioFile(audio_file_path) as source:
            print("Analisando o arquivo de áudio...")
            # Ler os dados do arquivo
            audio_data = recognizer.record(source)
            
            print("Realizando reconhecimento de fala...")
            try:
                # Usando o Google Speech Recognition
                text = recognizer.recognize_google(audio_data, language=language)
                return text
            except sr.UnknownValueError:
                return "Erro: Google Speech Recognition não conseguiu entender o áudio"
            except sr.RequestError as e:
                return f"Erro: Não foi possível solicitar resultados do serviço Google Speech Recognition; {e}"
    except Exception as e:
        return f"Erro ao processar o arquivo de áudio: {e}"
    finally:
        # Remover o arquivo temporário se existir
        if temp_wav and os.path.exists(temp_wav):
            os.remove(temp_wav)
