/**
 * Serviços de API para transcrição
 */

// API endpoints
const API_UPLOAD = '/api/upload';
const API_TRANSCRIBE = '/api/transcribe';

// Em api-service.js, adicionar uma função de teste
async function testServerConnection() {
    try {
        const response = await fetch('/', { method: 'HEAD' });
        if (response.ok) {
            console.log("Conexão com o servidor verificada com sucesso");
            return true;
        } else {
            console.error("Servidor respondeu com status:", response.status);
            return false;
        }
    } catch (error) {
        console.error("Erro ao conectar com o servidor:", error);
        return false;
    }
}

// Chamar no início da aplicação
document.addEventListener('DOMContentLoaded', async function() {
    if (!await testServerConnection()) {
        showStatus('Não foi possível conectar ao servidor. Verifique se o backend está rodando.', 'error');
    }
    // Resto da inicialização
});

// Modificar a função processTranscription

async function processTranscription(file) {
    console.log("Enviando requisição para:", API_UPLOAD);
    console.log("Dados enviados:", file.name, file.size, file.type);
    
    if (!file) {
        showStatus('Por favor, selecione um arquivo de áudio.', 'error');
        return null;
    }
    
    // Mostrar carregamento
    const loading = document.getElementById('loading');
    const transcript = document.getElementById('transcript');
    const status = document.getElementById('status');
    
    loading.style.display = 'block';
    transcript.textContent = '';
    status.className = 'status';
    status.textContent = '';
    showProgress(5); // Iniciar com 5%
    
    try {
        // 1. Preparando arquivo
        showStatus('Preparando arquivo para upload...', 'info');
        const uploadData = new FormData();
        uploadData.append('file', file);
        showProgress(10);
        
        // 2. Enviando arquivo
        showStatus('Enviando arquivo para o servidor...', 'info');
        const uploadResponse = await fetch(API_UPLOAD, {
            method: 'POST',
            body: uploadData
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Falha no upload do arquivo');
        }
        
        const uploadResult = await uploadResponse.json();
        console.log("Resposta do servidor (upload):", uploadResult);
        showProgress(25); // Arquivo enviado
        showStatus('Upload concluído com sucesso!', 'info');
        
        // 3. Processamento do áudio
        if (uploadResult.file_path) {
            updateProcessedAudioPath(uploadResult.file_path);
            showStatus('Normalizando níveis de áudio...', 'info');
            showProgress(30);
            
            setTimeout(() => {
                showStatus('Aplicando filtros para melhorar a qualidade...', 'info');
                showProgress(35);
            }, 500);
            
            setTimeout(() => {
                showStatus('Preparando áudio para transcrição...', 'info');
                showProgress(40);
            }, 1000);
        } else {
            console.error("Servidor não retornou o caminho do arquivo");
            throw new Error("Erro no processamento do arquivo");
        }
        
        // 4. Iniciando transcrição
        showStatus('Iniciando análise de voz...', 'info');
        showProgress(45);
        
        const transcribeResponse = await fetch(API_TRANSCRIBE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_path: uploadResult.file_path
            })
        });
        
        // 5. Processos intermediários de transcrição
        showStatus('Convertendo fala em texto...', 'info');
        showProgress(55);
        
        setTimeout(() => {
            showStatus('Identificando falantes...', 'info');
            showProgress(65);
        }, 800);
        
        setTimeout(() => {
            showStatus('Aplicando pontuação e formatação...', 'info');
            showProgress(75);
        }, 1600);
        
        if (!transcribeResponse.ok) {
            const errorData = await transcribeResponse.json();
            throw new Error(errorData.error || 'Falha na transcrição');
        }
        
        // 6. Finalizando
        showStatus('Gerando timestamps para palavras...', 'info');
        showProgress(85);
        
        setTimeout(() => {
            showStatus('Finalizando e preparando visualização...', 'info');
            showProgress(95);
        }, 700);
        
        // 7. Resultado completo
        const result = await transcribeResponse.json();
        
        // Exibir resultado
        loading.style.display = 'none';
        document.getElementById('progress-container').style.display = 'none';
        
        showStatus('Transcrição concluída com sucesso!', 'success');
        
        // Mostrar seção de transcrição e esconder seção de arquivo
        document.getElementById('transcription-section').style.display = 'block';
        document.getElementById('file-selection-section').style.display = 'none';
        
        return result;
        
    } catch (error) {
        console.error('Erro:', error);
        loading.style.display = 'none';
        document.getElementById('progress-container').style.display = 'none';
        showStatus(`Erro: ${error.message}`, 'error');
        return null;
    }
}
