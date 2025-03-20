import os
import uuid
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Importar funções existentes
from src.transcricao import transcribe_with_whisper
from src.processa_texto import improve_transcript

# Função para limpar a pasta de uploads
def clean_uploads_folder(folder_path):
    """Remove todos os arquivos da pasta de uploads."""
    if os.path.exists(folder_path):
        file_count = 0
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                    file_count += 1
                except Exception as e:
                    print(f"Erro ao remover arquivo {filename}: {e}")
        if file_count > 0:
            print(f"Limpeza da pasta uploads concluída: {file_count} arquivo(s) removido(s).")
        else:
            print("Pasta uploads verificada: nenhum arquivo para remover.")
    else:
        print("Pasta uploads não existe.")

app = Flask(__name__, static_folder='.')
CORS(app)  # Permitir requisições cross-origin

# Configurações para upload de arquivos
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
else:
    # Limpar a pasta de uploads na inicialização
    clean_uploads_folder(UPLOAD_FOLDER)

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

# Adicione esta função para servir arquivos JavaScript
@app.route('/scripts/<path:filename>')
def serve_scripts(filename):
    return send_from_directory('scripts', filename)

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
    
    # Valores fixos para idioma e modelo
    language = 'pt-BR'
    model = 'small'
    enhance = True
    
    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'Arquivo não encontrado'}), 404
    
    try:
        # Realizar a transcrição usando a função existente
        result = transcribe_with_whisper(file_path, language, model)
        
        # Obter o texto completo
        transcript_text = result["text"]
        
        # Aplicar aprimoramento ao texto completo se solicitado
        if enhance and transcript_text and not transcript_text.startswith("Erro:"):
            enhanced_text = improve_transcript(transcript_text)
            # Atualizar o texto completo mantendo os segmentos com timestamps
            result["text"] = enhanced_text
        
        # Limpar arquivo temporário
        try:
            os.remove(file_path)
        except:
            pass
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    from src.config import setup_whisper_environment, check_dependencies
    
    # Configurar ambiente
    setup_whisper_environment()
    check_dependencies()  # This already calls check_ffmpeg()
    
    # Executar o servidor Flask
    app.run(debug=True, port=5000)
