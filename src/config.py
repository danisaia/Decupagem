import os
import sys
import subprocess

# Configuração para modelos Whisper locais
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

def setup_whisper_environment():
    """Configura o ambiente para usar modelos Whisper locais no projeto."""
    # Criar diretório models se não existir
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
        print(f"Diretório de modelos criado: {MODELS_DIR}")
    
    # Configurar a variável de ambiente que controla onde o Whisper busca os modelos
    os.environ["WHISPER_MODEL_DIR"] = MODELS_DIR
    return MODELS_DIR

def check_dependencies():
    """Verifica se as bibliotecas necessárias estão instaladas."""
    from src.utilidades_ffmpeg import check_ffmpeg
    
    # Configurar ambiente para modelos locais
    setup_whisper_environment()
    
    # Verificar e configurar FFmpeg imediatamente no início
    check_ffmpeg()
    
    missing_libs = []
    
    try:
        import speech_recognition
    except ImportError:
        missing_libs.append("SpeechRecognition (pip install SpeechRecognition)")
    
    try:
        import pydub
    except ImportError:
        missing_libs.append("pydub (pip install pydub)")
        
    try:
        import numpy
    except ImportError:
        missing_libs.append("numpy (pip install numpy)")
    
    # Verificar se o whisper está disponível
    try:
        import whisper
        try:
            # Verificar se temos a versão mais recente que suporta diferentes tamanhos de modelos
            whisper.load_model("tiny")
        except Exception as e:
            if "is not one of the supported model names" in str(e):
                missing_libs.append("openai-whisper atualizado (pip install -U --force-reinstall openai-whisper)")
    except ImportError:
        missing_libs.append("openai-whisper (pip install -U openai-whisper)")
    
    if missing_libs:
        print("As seguintes bibliotecas não estão instaladas:")
        for lib in missing_libs:
            print(f"- {lib}")
        return False
    
    # Verifica disponibilidade do modelo medium.pt do Whisper
    try:
        print("Verificando disponibilidade do modelo Whisper medium...")
        model_path = os.path.join(MODELS_DIR, "medium.pt")
        
        if os.path.exists(model_path):
            file_size_mb = os.path.getsize(model_path) / (1024 * 1024)
            print(f"Modelo medium.pt encontrado localmente: {file_size_mb:.1f} MB")
        else:
            print("Modelo medium.pt não encontrado na pasta local do projeto.")
    except:
        pass
    
    # Verifica disponibilidade do modelo small.pt do Whisper
    try:
        print("Verificando disponibilidade do modelo Whisper small...")
        model_path = os.path.join(MODELS_DIR, "small.pt")
        
        if os.path.exists(model_path):
            file_size_mb = os.path.getsize(model_path) / (1024 * 1024)
            print(f"Modelo small.pt encontrado localmente: {file_size_mb:.1f} MB")
        else:
            print("Modelo small.pt não encontrado na pasta local do projeto.")
    except:
        pass
    
    return True
