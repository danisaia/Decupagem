import os
import uuid
import json
from flask import Flask, request, jsonify, send_from_directory, send_file, session
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
app.secret_key = os.urandom(24)  # Adicionar chave secreta para sessões

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
    session['current_file_path'] = file_path
    app.logger.info(f"File path saved to session: {file_path}")
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
        
        # NÃO remover o arquivo neste ponto, já que precisamos dele para a montagem
        # try:
        #     os.remove(file_path)
        # except:
        #     pass
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export-assembly', methods=['POST'])
def export_assembly():
    from pydub import AudioSegment
    import json
    import os
    import tempfile
    
    app.logger.info("Export assembly route called")
    
    try:
        # Obter dados dos clipes
        clips_json = request.form.get('clips')
        if not clips_json:
            app.logger.error("Dados dos clipes não fornecidos")
            return jsonify({"error": "Dados dos clipes não fornecidos"}), 400
            
        clips = json.loads(clips_json)
        app.logger.info(f"Recebido {len(clips)} clipes para exportação")
        
        # Verificar se há clipes
        if not clips:
            return jsonify({"error": "Nenhum clipe para processar"}), 400
        
        # Verificar se temos um arquivo de áudio na sessão
        file_path = session.get('current_file_path') if 'current_file_path' in session else None
        app.logger.info(f"Arquivo encontrado na sessão: {file_path}")
        
        # Se não temos um arquivo na sessão, verificar se foi enviado um caminho de arquivo
        if not file_path or not os.path.exists(file_path):
            app.logger.error(f"Arquivo não encontrado: {file_path}")
            # Procurar arquivos na pasta de uploads
            app.logger.info("Procurando arquivos na pasta uploads...")
            files_in_upload = os.listdir(app.config['UPLOAD_FOLDER'])
            if files_in_upload:
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], files_in_upload[0])
                app.logger.info(f"Usando primeiro arquivo encontrado: {file_path}")
            else:
                return jsonify({"error": "Arquivo de áudio não encontrado. Por favor, faça upload do arquivo novamente."}), 404
            
        # Carregar o áudio original
        app.logger.info(f"Carregando áudio do arquivo: {file_path}")
        original_audio = AudioSegment.from_file(file_path)
        
        # Criar um áudio vazio para montar os clipes
        assembly = AudioSegment.silent(duration=0)
        
        # Adicionar cada clipe
        for i, clip in enumerate(clips):
            start_ms = int(float(clip['startTime']) * 1000)
            end_ms = int(float(clip['endTime']) * 1000)
            
            app.logger.info(f"Processando clipe {i+1}: {start_ms}ms - {end_ms}ms")
            
            # Recortar o trecho
            clip_audio = original_audio[start_ms:end_ms]
            
            # Adicionar à montagem
            assembly += clip_audio
        
        # Criar arquivo temporário para o resultado
        temp_file = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        # Exportar como MP3
        app.logger.info(f"Exportando montagem para: {temp_path}")
        assembly.export(temp_path, format="mp3")
        
        # Enviar o arquivo
        app.logger.info("Enviando arquivo de montagem para download")
        return send_file(temp_path, as_attachment=True, 
                        download_name="montagem_audio.mp3",
                        mimetype="audio/mpeg")
    
    except Exception as e:
        app.logger.error(f"Erro ao exportar montagem: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    from src.config import setup_whisper_environment, check_dependencies
    
    # Configurar ambiente
    setup_whisper_environment()
    check_dependencies()  # This already calls check_ffmpeg()
    
    # Executar o servidor Flask
    app.run(debug=True, port=5000)
