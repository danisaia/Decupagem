/**
 * Funcionalidades para manipulação de arquivos
 */

// Configurar evento de drag-and-drop para upload de arquivos
function initFileUpload() {
    const fileInput = document.getElementById('audio-file');
    const fileName = document.getElementById('file-name');
    const fileUpload = document.querySelector('.file-upload');
    
    console.log("Inicializando upload de arquivos...");
    
    // Adicionar eventos para drag-and-drop com mensagens de depuração
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, function(e) {
            console.log(`Evento ${eventName} detectado`);
            preventDefaults(e);
        }, false);
    });
    
    // Eventos para destacar a área de upload
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUpload.addEventListener(eventName, highlight, false);
    });
    
    // Eventos para remover destaque ao soltar o arquivo
    ['dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, unhighlight, false);
    });
    
    // Lidar com soltura de arquivos com depuração adicional
    fileUpload.addEventListener('drop', function(e) {
        console.log("Arquivo solto na área de upload");
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            console.log(`Arquivo recebido: ${files[0].name}`);
            fileInput.files = files;
            updateFileName();
            setupAudioPlayer();
        } else {
            console.error("Nenhum arquivo encontrado no evento drop");
        }
    }, false);
    
    // Lidar com seleção de arquivo pelo input com depuração adicional
    fileInput.addEventListener('change', function() {
        console.log("Evento change no input de arquivo detectado");
        if (this.files && this.files.length > 0) {
            console.log(`Arquivo selecionado: ${this.files[0].name}`);
            updateFileName();
            setupAudioPlayer();
        } else {
            console.error("Nenhum arquivo selecionado no evento change");
        }
    });
    
    // Atualizar texto com nome do arquivo
    function updateFileName() {
        if (fileInput.files.length > 0) {
            fileName.textContent = `Arquivo selecionado: ${fileInput.files[0].name}`;
            console.log(`Nome do arquivo atualizado: ${fileInput.files[0].name}`);
        } else {
            fileName.textContent = 'Nenhum arquivo selecionado';
        }
    }
    
    console.log("Inicialização de upload concluída");
}

// Baixar a transcrição como arquivo de texto
function downloadTranscription() {
    const transcript = document.getElementById('transcript');
    const text = transcript.textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcricao.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Limpar todos os dados do arquivo
function clearFile() {
    const fileInput = document.getElementById('audio-file');
    const fileName = document.getElementById('file-name');
    const transcript = document.getElementById('transcript');
    const downloadBtn = document.getElementById('download-btn');
    const status = document.getElementById('status');
    const selectionControls = document.getElementById('selection-controls');
    
    fileInput.value = '';
    fileName.textContent = 'Nenhum arquivo selecionado';
    transcript.textContent = '';
    status.className = 'status';
    status.textContent = '';
    downloadBtn.style.display = 'none';
    selectionControls.style.display = 'none';
    
    // Limpar URL do objeto
    if (audioObjectURL) {
        URL.revokeObjectURL(audioObjectURL);
        audioObjectURL = null;
    }
    
    // Limpar player de áudio
    cleanupAudioPlayer();
    
    // Limpar dados de transcrição
    transcriptionData = null;
    wordTimestamps = [];
    
    // Limpar seleção ativa e marcações
    if (typeof clearRangeSelection === 'function') {
        clearRangeSelection();
        rangeSelectionMode = false;
        
        const instructionsText = document.querySelector('.instructions-text');
        if (instructionsText) {
            instructionsText.style.display = 'none';
        }
        
        const startRangeSelection = document.getElementById('start-range-selection');
        if (startRangeSelection) {
            startRangeSelection.style.display = 'block';
        }
        
        transcript.classList.remove('range-selection-active');
    }
}
