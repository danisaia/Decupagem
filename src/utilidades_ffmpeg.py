import os
import shutil
import urllib.request
import zipfile

def check_ffmpeg():
    """Verifica se o FFmpeg está disponível e, se não, tenta obter uma versão portátil."""
    # Primeiro, verificar se existe o FFmpeg na pasta portable
    ffmpeg_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffmpeg_portable")
    portable_ffmpeg_path = os.path.join(ffmpeg_dir, "bin", "ffmpeg.exe")
    
    # Se já existe o FFmpeg portable, usá-lo diretamente
    if (os.path.exists(portable_ffmpeg_path)):
        bin_path = os.path.join(ffmpeg_dir, "bin")
        if (bin_path not in os.environ["PATH"]):
            os.environ["PATH"] += os.pathsep + bin_path
        print(f"Usando FFmpeg portátil: {portable_ffmpeg_path}")
        return True
    
    # Verificar se o FFmpeg está no PATH do sistema
    ffmpeg_path = shutil.which('ffmpeg')
    if (ffmpeg_path):
        print(f"FFmpeg encontrado no sistema: {ffmpeg_path}")
        return True
    
    print("FFmpeg não encontrado. Tentando obter uma versão portátil...")
    
    # Tentar baixar automaticamente sem perguntar ao usuário
    if download_portable_ffmpeg():
        return True
    
    # Se não conseguiu baixar automaticamente, mostrar opções manuais
    print("\nOpções para usar FFmpeg sem instalação administrativa:")
    
    print("\n1. Tentar baixar FFmpeg portátil novamente (para Windows)")
    print("2. Instalar via conda (se você usa Anaconda/Miniconda)")
    print("3. Tentar usar versão fornecida pelo imageio-ffmpeg")
    print("4. Informar caminho para executável do FFmpeg manualmente")
    
    choice = input("\nEscolha uma opção (1-4) ou pressione Enter para cancelar: ")
    
    if not choice:
        return False
    
    if choice == "1":
        return download_portable_ffmpeg()
    elif choice == "2":
        print("\nExecute o seguinte comando no terminal:")
        print("conda install -c conda-forge ffmpeg")
        return False
    elif choice == "3":
        # Importação condicional para evitar erros de linter
        imageio_ffmpeg = None
        try:
            # Tentativa de importar o módulo apenas quando necessário
            import importlib
            imageio_ffmpeg = importlib.import_module('imageio_ffmpeg')
            
            ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
            os.environ["PATH"] += os.pathsep + os.path.dirname(ffmpeg_path)
            print(f"Usando FFmpeg do pacote imageio_ffmpeg: {ffmpeg_path}")
            return True
        except ImportError:
            print("O pacote imageio_ffmpeg não está instalado.")
            print("Você pode instalá-lo com: pip install imageio-ffmpeg")
            return False
    elif choice == "4":
        custom_path = input("\nInforme o caminho completo para o executável do FFmpeg: ")
        if os.path.exists(custom_path) and os.path.isfile(custom_path):
            os.environ["PATH"] += os.pathsep + os.path.dirname(custom_path)
            print(f"FFmpeg adicionado ao PATH: {custom_path}")
            return True
        else:
            print("Caminho inválido ou arquivo não encontrado.")
            return False
    else:
        print("Opção inválida.")
        return False

def download_portable_ffmpeg():
    """Baixa e configura uma versão portátil do FFmpeg."""
    ffmpeg_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffmpeg_portable")
    ffmpeg_exe = os.path.join(ffmpeg_dir, "bin", "ffmpeg.exe")
    
    # Verificar se já existe
    if os.path.exists(ffmpeg_exe):
        os.environ["PATH"] += os.pathsep + os.path.join(ffmpeg_dir, "bin")
        print(f"FFmpeg portátil encontrado e adicionado ao PATH: {ffmpeg_exe}")
        return True
    
    try:
        # URL para a versão portátil do FFmpeg (Windows)
        url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
        
        print(f"Baixando FFmpeg portátil de {url}...")
        if not os.path.exists(ffmpeg_dir):
            os.makedirs(ffmpeg_dir)
        
        # Baixar o arquivo
        zip_path = os.path.join(ffmpeg_dir, "ffmpeg.zip")
        urllib.request.urlretrieve(url, zip_path)
        
        # Extrair o arquivo
        print("Extraindo arquivo...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(ffmpeg_dir)
        
        # Encontrar o diretório extraído (pode variar conforme a versão)
        extracted_dirs = [d for d in os.listdir(ffmpeg_dir) if os.path.isdir(os.path.join(ffmpeg_dir, d)) and "ffmpeg" in d.lower()]
        if not extracted_dirs:
            print("Não foi possível encontrar a pasta do FFmpeg após a extração.")
            return False
        
        # Mover os arquivos para o diretório correto
        src_dir = os.path.join(ffmpeg_dir, extracted_dirs[0])
        for item in os.listdir(src_dir):
            s = os.path.join(src_dir, item)
            d = os.path.join(ffmpeg_dir, item)
            shutil.move(s, d)
        
        # Limpar arquivos temporários
        shutil.rmtree(src_dir, ignore_errors=True)
        os.remove(zip_path)
        
        # Adicionar ao PATH
        if os.path.exists(ffmpeg_exe):
            os.environ["PATH"] += os.pathsep + os.path.join(ffmpeg_dir, "bin")
            print(f"FFmpeg portátil instalado e adicionado ao PATH: {ffmpeg_exe}")
            return True
        else:
            print("Não foi possível encontrar o executável do FFmpeg após a instalação.")
            return False
            
    except Exception as e:
        print(f"Erro ao baixar FFmpeg: {e}")
        return False
