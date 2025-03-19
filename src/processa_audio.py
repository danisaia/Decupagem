import os
import tempfile
import shutil

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
