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

// Enviar arquivo e iniciar transcrição
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
    showProgress(10); // Iniciar com 10%
    
    try {
        // 1. Fazer upload do arquivo
        showStatus('Enviando arquivo...', 'info');
        const uploadData = new FormData();
        uploadData.append('file', file);
        
        const uploadResponse = await fetch(API_UPLOAD, {
            method: 'POST',
            body: uploadData
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Falha no upload do arquivo');
        }
        
        const uploadResult = await uploadResponse.json();
        console.log("Resposta do servidor:", uploadResult);
        showProgress(30); // Arquivo enviado - 30%
        
        // 2. Iniciar a transcrição
        showStatus('Iniciando transcrição...', 'info');
        const transcribeResponse = await fetch(API_TRANSCRIBE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_path: uploadResult.file_path
            })
        });
        
        if (!transcribeResponse.ok) {
            const errorData = await transcribeResponse.json();
            throw new Error(errorData.error || 'Falha na transcrição');
        }
        
        // 3. Processar resultado da transcrição
        showProgress(90); // Processamento quase completo
        const result = await transcribeResponse.json();
        
        // Exibir resultado
        loading.style.display = 'none';
        document.getElementById('progress-container').style.display = 'none';
        
        showStatus('Transcrição concluída com sucesso!', 'success');
        document.getElementById('download-btn').style.display = 'inline-block';
        
        return result;
        
    } catch (error) {
        console.error('Erro:', error);
        loading.style.display = 'none';
        document.getElementById('progress-container').style.display = 'none';
        showStatus(`Erro: ${error.message}`, 'error');
        return null;
    }
}
