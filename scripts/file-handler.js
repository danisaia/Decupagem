/**
 * Funcionalidades para manipulação de arquivos
 */

// Variáveis para armazenar informações sobre o arquivo
let originalAudioFile = null;
let processedAudioFilePath = null;

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

// Limpar todos os dados do arquivo
function clearFile() {
    const fileInput = document.getElementById('audio-file');
    const fileName = document.getElementById('file-name');
    const transcript = document.getElementById('transcript');
    const status = document.getElementById('status');
    const selectionControls = document.getElementById('selection-controls');
    
    fileInput.value = '';
    fileName.textContent = 'Nenhum arquivo selecionado';
    transcript.textContent = '';
    status.className = 'status';
    status.textContent = '';
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

// Atualizar a função de setup do player de áudio para usar o arquivo processado quando disponível
function setupAudioPlayer() {
    // ...existing code...
    
    // Adicionar código para armazenar o arquivo original
    if (fileInput.files.length > 0) {
        originalAudioFile = fileInput.files[0];
        console.log(`Arquivo original armazenado: ${originalAudioFile.name}`);
    }
}

// Função para obter o caminho do arquivo processado
function getCurrentAudioFilePath() {
    if (!processedAudioFilePath) return null;
    
    // Extrair apenas o nome do arquivo
    const fileName = processedAudioFilePath.split(/[/\\]/).pop();
    
    // Usar o caminho correto para a pasta uploads
    return `/uploads/${fileName}`;
}

// Atualizar com o caminho do arquivo processado quando receber a resposta da API
function updateProcessedAudioPath(path) {
    processedAudioFilePath = path;
    console.log(`Caminho do arquivo processado atualizado: ${processedAudioFilePath}`);
    
    // Configurar o player imediatamente após atualizar o caminho
    setupAudioPlayerWithProcessedFile();
}

// Configurar o player de áudio para usar o arquivo processado
function setupAudioPlayerWithProcessedFile() {
    if (!processedAudioFilePath) {
        console.error("Caminho do arquivo processado não disponível");
        return;
    }
    
    console.log("Configurando player para arquivo processado:", processedAudioFilePath);
    
    // Obter o elemento de áudio
    const audioPlayer = document.getElementById('audio-player');
    if (!audioPlayer) {
        console.error("Elemento de áudio não encontrado");
        return;
    }
    
    // Construir URL adequada para o navegador acessar o arquivo
    const fileName = processedAudioFilePath.split(/[/\\]/).pop();
    const audioUrl = `/uploads/${fileName}`;
    console.log("URL final do áudio:", audioUrl);
    
    // Definir a fonte do áudio para a URL construída
    audioPlayer.src = audioUrl;
    
    // Recarregar o áudio para aplicar a nova fonte
    audioPlayer.load();
    
    // Garantir que os controles estejam habilitados
    const playPauseBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const restartBtn = document.getElementById('restart-btn');
    const playbackSpeed = document.getElementById('playback-speed');
    const timeline = document.getElementById('timeline');
    
    if (playPauseBtn) playPauseBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;
    if (restartBtn) restartBtn.disabled = false;
    if (playbackSpeed) playbackSpeed.disabled = false;
    if (timeline) timeline.disabled = false;
    
    // Garantir que o player esteja visível
    if (document.getElementById('audio-player-container')) {
        document.getElementById('audio-player-container').style.display = 'block';
    }
    
    console.log("Player de áudio configurado com arquivo processado");
}
