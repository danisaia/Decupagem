import os
import tempfile
import shutil
import subprocess
from pydub import AudioSegment
from pydub.effects import normalize, compress_dynamic_range

from src.utilidades_ffmpeg import check_ffmpeg

def convert_mp3_to_wav(mp3_path):
    """Converte um arquivo MP3 para WAV usando pydub."""
    try:
        # Verificar se o FFmpeg está disponível
        if not shutil.which('ffmpeg'):
            if not check_ffmpeg():
                print("FFmpeg é necessário para converter arquivos MP3.")
                return None
        
        import pydub
        from pydub import AudioSegment
        
        sound = AudioSegment.from_mp3(mp3_path)
        
        # Criar um arquivo temporário para o WAV
        fd, temp_wav = tempfile.mkstemp(suffix='.wav')
        os.close(fd)  # Fechamos o descritor de arquivo, pois não precisamos dele
        
        sound.export(temp_wav, format="wav")
        print(f"Arquivo MP3 convertido para WAV temporário: {temp_wav}")
        return temp_wav
    except Exception as e:
        print(f"Erro ao converter MP3 para WAV: {e}")
        return None

def process_audio_for_radio(audio_path):
    """
    Processa o áudio para padrões de transmissão de rádio:
    - Converte para estéreo
    - Ajusta taxa de amostragem para 44100 Hz
    - Aplica compressão dinâmica
    - Normaliza com limite de -6dB
    - Aplica equalização básica para voz

    Returns:
        str: Caminho para o arquivo processado
    """
    try:
        # Verificar se o FFmpeg está disponível
        if not shutil.which('ffmpeg'):
            if not check_ffmpeg():
                print("FFmpeg é necessário para processar o áudio.")
                return audio_path
        
        print(f"Processando áudio para padrões de rádio: {audio_path}")
        
        # Carregar o áudio
        audio = AudioSegment.from_file(audio_path)
        
        # Converter para estéreo se for mono
        if audio.channels == 1:
            audio = audio.set_channels(2)
            print("Áudio convertido para estéreo")
        
        # Ajustar taxa de amostragem para 44100 Hz
        if audio.frame_rate != 44100:
            audio = audio.set_frame_rate(44100)
            print(f"Taxa de amostragem ajustada para 44100 Hz")
        
        # Filtros básicos primeiro
        # Remover frequências baixas (abaixo de 80Hz) que podem causar ruído
        audio = audio.high_pass_filter(80)
        print("Filtro passa-alta aplicado")
        
        # Aplicar compressão dinâmica mais suave
        # Reduzindo a ratio e ajustando threshold
        audio = compress_dynamic_range(audio, 
                                      threshold=-24,  # Threshold mais baixo
                                      ratio=2.5,      # Ratio mais moderada
                                      attack=10.0,    # Attack mais lento
                                      release=100.0)  # Release mais lento
        print("Compressão dinâmica aplicada")
        
        # Criar arquivo temporário para o áudio pré-processado
        fd, temp_audio = tempfile.mkstemp(suffix='.wav')
        os.close(fd)
        audio.export(temp_audio, format="wav")
        
        # Aplicar todos os processamentos finais com FFmpeg em uma única chamada:
        # 1. Equalização leve para voz
        # 2. Compressão suave
        # 3. Limitador rigoroso em -6dB
        file_ext = os.path.splitext(audio_path)[1]
        filename = f"processed_{os.path.basename(audio_path)}"
        processed_path = os.path.join("uploads", filename)
        
        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-i', temp_audio,
            '-af', 'equalizer=f=300:width_type=o:width=1:g=1.5,compand=0|0:1|1:-6/-6:-6/-6:0:0:0.1,alimiter=limit=-6dB:level=true',
            '-acodec', 'libmp3lame' if file_ext.lower() == '.mp3' else 'pcm_s16le',
            processed_path
        ]
        
        try:
            subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            print("Processamento final aplicado via FFmpeg (equalização e limitador)")
        except subprocess.CalledProcessError as e:
            print(f"Aviso: Não foi possível aplicar o processamento final: {e}")
            # Em caso de falha, aplicar apenas normalização básica e exportar
            audio = normalize(audio, headroom=6.0)  # -6dB headroom
            audio.export(processed_path, format="mp3" if file_ext.lower() == '.mp3' else "wav")
        
        # Limpar arquivo temporário
        try:
            os.remove(temp_audio)
        except Exception as e:
            print(f"Aviso: Não foi possível remover arquivo temporário: {e}")
        
        print(f"Áudio processado salvo em: {processed_path}")
        return processed_path
    except Exception as e:
        print(f"Erro ao processar áudio: {e}")
        # Retornar o caminho original em caso de erro
        return audio_path

def detect_silence(audio_segment, min_silence_len=500, silence_thresh=-40, keep_silence=100):
    """Detecta silêncios em um segmento de áudio para ajudar na identificação de frases."""
    from pydub.silence import detect_nonsilent
    
    # Detectar partes não silenciosas
    non_silent_ranges = detect_nonsilent(audio_segment, 
                                        min_silence_len=min_silence_len,
                                        silence_thresh=silence_thresh)
    
    # Converter para timestamps em milissegundos
    if not non_silent_ranges:
        return []
    
    # Adicionar margem de silêncio em torno das partes não silenciosas
    ranges = []
    for start, end in non_silent_ranges:
        start = max(0, start - keep_silence)
        end = min(len(audio_segment), end + keep_silence)
        ranges.append((start, end))
    
    return ranges

def segment_audio(audio_file_path):
    """Segmenta o áudio em frases baseado em pausas."""
    from pydub import AudioSegment
    
    print("Analisando o áudio para detectar pausas entre frases...")
    
    # Carregar o áudio
    audio = AudioSegment.from_file(audio_file_path)
    
    # Detectar pausas significativas (silêncios) no áudio
    non_silent_ranges = detect_silence(audio)
    
    # Se não conseguimos detectar partes não silenciosas, retornar o áudio completo
    if not non_silent_ranges:
        return [audio]
    
    # Fundir segmentos próximos para evitar fragmentação excessiva
    merged_ranges = []
    current_start, current_end = non_silent_ranges[0]
    
    for start, end in non_silent_ranges[1:]:
        # Se o intervalo entre segmentos for pequeno, fundir
        if start - current_end < 1000:  # menos de 1 segundo
            current_end = end
        else:
            merged_ranges.append((current_start, current_end))
            current_start, current_end = start, end
    
    merged_ranges.append((current_start, current_end))
    
    # Extrair os segmentos de áudio
    segments = []
    for start, end in merged_ranges:
        segment = audio[start:end]
        segments.append(segment)
    
    return segments
