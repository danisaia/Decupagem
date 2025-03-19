import os
import uuid
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Importar funções existentes
from src.transcricao import transcribe_with_whisper
from src.processa_texto import improve_transcript

app = Flask(__name__, static_folder='.')
CORS(app)  # Permitir requisições cross-origin

# Configurações para upload de arquivos
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # Limitar uploads a 100MB

# Servir o arquivo HTML
@app.route('/')
def index():
    return send_from_directory('.', 'decupagem.html')

# Servir arquivos estáticos (CSS, JS)
@app.route('/estilos/<path:filename>')
def serve_static(filename):
    return send_from_directory('estilos', filename)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    # Gerar nome de arquivo único para evitar conflitos
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    
    file.save(file_path)
    return jsonify({'file_path': file_path, 'original_name': filename}), 200

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    data = request.json
    file_path = data.get('file_path')
    language = data.get('language', 'pt-BR')
    model = data.get('model', 'small')
    enhance = data.get('enhance', True)
    
    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'Arquivo não encontrado'}), 404
    
    try:
        # Realizar a transcrição usando a função existente
        transcript = transcribe_with_whisper(file_path, language, model)
        
        # Aplicar aprimoramento se solicitado
        if enhance and transcript and not transcript.startswith("Erro:"):
            transcript = improve_transcript(transcript)
        
        # Limpar arquivo temporário
        try:
            os.remove(file_path)
        except:
            pass
        
        return jsonify({'transcript': transcript}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    from src.config import setup_whisper_environment, check_dependencies
    from src.utilidades_ffmpeg import check_ffmpeg
    
    # Configurar ambiente
    setup_whisper_environment()
    check_ffmpeg()
    check_dependencies()
    
    # Executar o servidor Flask
    app.run(debug=True, port=5000)
