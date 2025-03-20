/**
 * Arquivo principal que inicializa todos os componentes
 */

// Verificar recursos essenciais do navegador
function checkBrowserFeatures() {
    const checks = {
        'Blob API': typeof Blob !== 'undefined',
        'URL.createObjectURL': typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function',
        'Audio API': typeof Audio !== 'undefined',
        'fetch API': typeof fetch !== 'undefined'
    };
    
    const missing = Object.entries(checks)
        .filter(([_, supported]) => !supported)
        .map(([feature]) => feature);
    
    if (missing.length > 0) {
        alert(`Seu navegador não suporta os seguintes recursos: ${missing.join(', ')}. A aplicação pode não funcionar corretamente.`);
        console.error('Recursos não suportados:', missing);
    }
    
    return missing.length === 0;
}

// Variáveis globais
const transcript = document.getElementById('transcript');
const transcribeBtn = document.getElementById('transcribe-btn');
const clearBtn = document.getElementById('clear-btn');
const downloadBtn = document.getElementById('download-btn');

// Consolidate initialization code into a single function
function initializeApp() {
    console.log("Inicializando aplicação...");
    
    // Verificar compatibilidade do navegador
    if (!checkBrowserFeatures()) {
        showStatus('Este navegador pode não suportar todos os recursos necessários.', 'warning');
    }
    
    // Inicializar o módulo de upload de arquivos
    initFileUpload();
    
    // Inicializar o player de áudio
    initAudioPlayer();
    
    // Configurar eventos de botão
    setupButtonEvents();
    
    // Adicionar listener para seleção de texto
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', function() {
        // Em alguns navegadores, pode ser necessário usar evento selectionchange
        // para detectar seleções feitas com o teclado
        setTimeout(handleTextSelection, 10);
    });
    
    // Esconder controles de seleção quando clicar fora
    document.addEventListener('mousedown', function(e) {
        const selectionControls = document.getElementById('selection-controls');
        if (selectionControls && !selectionControls.contains(e.target) && e.target !== selectionControls) {
            if (!transcript.contains(e.target)) {
                selectionControls.style.display = 'none';
            }
        }
    });
    
    // Setup event listeners and other initialization code
    document.getElementById('start-range-selection').addEventListener('click', startRangeSelectionMode);
    document.getElementById('cancel-selection').addEventListener('click', cancelRangeSelection);
    document.getElementById('clear-range').addEventListener('click', clearRangeSelection);
    document.getElementById('play-range').addEventListener('click', function() {
        if (startWord && endWord) {
            const startTime = parseFloat(startWord.getAttribute('data-start'));
            const endTime = parseFloat(endWord.getAttribute('data-end'));
            playAudioInterval(startTime, endTime);
        }
    });

    // Any other initialization code
    initRangeSelection();
    
    console.log("Aplicação inicializada com sucesso!");
}

// Call the initialization function on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Configurar eventos dos botões principais
function setupButtonEvents() {
    // Botão de transcrição
    transcribeBtn.addEventListener('click', async function() {
        if (!document.getElementById('audio-file').files.length) {
            showStatus('Por favor, selecione um arquivo de áudio.', 'error');
            return;
        }
        
        const file = document.getElementById('audio-file').files[0];
        
        // Processar a transcrição
        const result = await processTranscription(file);
        
        // Se tiver resultado, exibir a transcrição
        if (result) {
            // Armazenar dados completos para uso posterior
            transcriptionData = result;
            
            // Exibir a transcrição com timestamps
            displayTranscriptionWithTimestamps(result);
            
            // Inicializar a funcionalidade de seleção de intervalo após renderizar a transcrição
            initRangeSelection();
        }
    });
    
    // Botão de download
    downloadBtn.addEventListener('click', downloadTranscription);
    
    // Botão de limpar
    clearBtn.addEventListener('click', function() {
        clearFile();
        
        if (typeof clearRangeSelection === 'function') {
            // Limpar seleções de intervalo
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
    });
    
    // Botão de reproduzir seleção
    const playSelectionBtn = document.getElementById('play-selection-btn');
    if (playSelectionBtn) {
        playSelectionBtn.addEventListener('click', function() {
            if (!audioPlayer.duration) return;
            
            if (isSelectionPlaying) {
                stopSelectionPlayback();
            } else {
                playSelection();
            }
        });
    }
}
