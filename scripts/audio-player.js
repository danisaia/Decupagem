/**
 * Funcionalidades do player de áudio
 */

// Variáveis para o player
let audioPlayer;
let playBtn;
let pauseBtn;
let stopBtn;
let restartBtn;
let playbackSpeed;
let timeline;
let currentTimeElement;
let durationElement;
let audioDuration = 0;
let audioObjectURL = null;

// Variáveis para seleção de texto
let selectionStartTime = 0;
let selectionEndTime = 0;
let isSelectionPlaying = false;
let selectionTimeout = null;
let activeSelection = null;

// Inicializar o player de áudio
function initAudioPlayer() {
    audioPlayer = document.getElementById('audio-player');
    
    if (!audioPlayer) {
        console.error("Elemento de áudio não encontrado! ID 'audio-player' não existe no DOM");
        return;
    }
    
    console.log("Elemento de áudio encontrado:", audioPlayer);
    
    playBtn = document.getElementById('play-btn');
    pauseBtn = document.getElementById('pause-btn');
    stopBtn = document.getElementById('stop-btn');
    restartBtn = document.getElementById('restart-btn');
    playbackSpeed = document.getElementById('playback-speed');
    timeline = document.getElementById('timeline');
    currentTimeElement = document.querySelector('.current-time');
    durationElement = document.querySelector('.duration');
    
    // Configurar eventos para botões do player
    playBtn.addEventListener('click', function() {
        if (activeSelection && !isSelectionPlaying) {
            playSelection();
        } else {
            audioPlayer.play();
        }
    });
    
    pauseBtn.addEventListener('click', function() {
        audioPlayer.pause();
        if (isSelectionPlaying) {
            isSelectionPlaying = false;
        }
    });
    
    stopBtn.addEventListener('click', function() {
        if (isSelectionPlaying) {
            stopSelectionPlayback();
            audioPlayer.currentTime = selectionStartTime;
        } else {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        updateTimeline();
    });
    
    restartBtn.addEventListener('click', function() {
        audioPlayer.currentTime = 0;
        updateTimeline();
    });
    
    playbackSpeed.addEventListener('change', function() {
        audioPlayer.playbackRate = parseFloat(this.value);
    });
    
    timeline.addEventListener('input', function() {
        const seekTime = audioPlayer.duration * (this.value / 100);
        audioPlayer.currentTime = seekTime;
        updateCurrentTime();
    });
    
    // Atualizar timeline durante a reprodução
    audioPlayer.addEventListener('timeupdate', updateTimeline);
}

// Configurar o player de áudio para um arquivo
function setupAudioPlayer() {
    console.log("Configurando player de áudio...");
    
    if (audioObjectURL) {
        console.log("Revogando URL de objeto anterior");
        URL.revokeObjectURL(audioObjectURL);
        audioObjectURL = null;
    }
    
    const fileInput = document.getElementById('audio-file');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        console.log(`Processando arquivo: ${file.name}, tipo: ${file.type}`);
        
        // Improved file type check - also check the file extension
        const isAudioFile = file.type.startsWith('audio/') || 
                           /\.(mp3|wav|ogg|flac|aac|m4a|aiff)$/i.test(file.name);
        
        if (isAudioFile) {
            console.log("Criando URL para o arquivo de áudio");
            try {
                audioObjectURL = URL.createObjectURL(file);
                if (!audioObjectURL) {
                    throw new Error("Não foi possível criar URL para o arquivo");
                }
                
                audioPlayer.src = audioObjectURL;
                console.log("URL de áudio definida:", audioPlayer.src);
                
                // Verificar se o áudio está acessível
                audioPlayer.onerror = function() {
                    console.error("Erro ao carregar áudio:", audioPlayer.error);
                    alert(`Erro ao carregar o arquivo de áudio: ${audioPlayer.error.message || "Erro desconhecido"}`);
                };
                
                // Make sure event listeners are properly attached
                if (!audioPlayer._metadataListenerAttached) {
                    audioPlayer.addEventListener('loadedmetadata', function() {
                        console.log("Metadados do áudio carregados, duração:", audioPlayer.duration);
                        enablePlayerControls();
                        updateDuration();
                        audioDuration = audioPlayer.duration;
                    });
                    audioPlayer._metadataListenerAttached = true;
                }
                
                if (!audioPlayer._errorListenerAttached) {
                    audioPlayer.addEventListener('error', function(e) {
                        console.error("Erro ao carregar áudio:", audioPlayer.error);
                        alert("Erro ao carregar o arquivo de áudio. Verifique se o formato é suportado.");
                    });
                    audioPlayer._errorListenerAttached = true;
                }
                
                // Force loading the audio
                audioPlayer.load();
                
                // Garantir que o player esteja visível
                document.getElementById('audio-player-container').style.display = 'block';
                
            } catch (error) {
                console.error("Erro ao criar URL do objeto:", error);
                alert("Ocorreu um erro ao processar o arquivo de áudio.");
            }
        } else {
            console.error(`Tipo de arquivo não suportado: ${file.type}`);
            alert("Formato de arquivo não suportado. Por favor, selecione um arquivo de áudio válido.");
        }
    } else {
        console.log("Nenhum arquivo selecionado, desabilitando controles");
        disablePlayerControls();
        audioPlayer.removeAttribute('src');
    }
}

// Funções de atualização do player
function updateTimeline() {
    if (!isNaN(audioPlayer.duration)) {
        const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        timeline.value = percentage;
        updateCurrentTime();
    }
}

function updateCurrentTime() {
    currentTimeElement.textContent = formatTime(audioPlayer.currentTime);
}

function updateDuration() {
    durationElement.textContent = formatTime(audioPlayer.duration);
    timeline.value = 0;
}

// Habilitar/desabilitar controles do player
function enablePlayerControls() {
    playBtn.disabled = false;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    restartBtn.disabled = false;
    playbackSpeed.disabled = false;
    timeline.disabled = false;
}

function disablePlayerControls() {
    playBtn.disabled = true;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    restartBtn.disabled = true;
    playbackSpeed.disabled = true;
    timeline.disabled = true;
    currentTimeElement.textContent = '0:00';
    durationElement.textContent = '0:00';
    timeline.value = 0;
}

// Reprodução de seleção de texto
function playSelection() {
    // Parar qualquer reprodução atual
    audioPlayer.pause();
    
    // Definir tempo inicial
    audioPlayer.currentTime = selectionStartTime;
    
    // Iniciar reprodução
    audioPlayer.play();
    isSelectionPlaying = true;
    
    // Mudar aparência do botão
    const playSelectionBtn = document.getElementById('play-selection-btn');
    playSelectionBtn.innerHTML = `<span class="play-icon">■</span> Parar`;
    playSelectionBtn.classList.add('playing');
    
    // Configurar temporizador para parar no final da seleção
    const duration = selectionEndTime - selectionStartTime;
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(stopSelectionPlayback, duration * 1000);
    
    // Monitorar a posição atual
    audioPlayer.addEventListener('timeupdate', checkSelectionBoundary);
}

function checkSelectionBoundary() {
    if (isSelectionPlaying && audioPlayer.currentTime >= selectionEndTime) {
        stopSelectionPlayback();
    }
}

function stopSelectionPlayback() {
    audioPlayer.pause();
    clearTimeout(selectionTimeout);
    audioPlayer.removeEventListener('timeupdate', checkSelectionBoundary);
    
    isSelectionPlaying = false;
    
    // Restaurar aparência do botão
    const playSelectionBtn = document.getElementById('play-selection-btn');
    playSelectionBtn.innerHTML = `<span class="play-icon">▶</span> Reproduzir (${formatTime(selectionStartTime)} - ${formatTime(selectionEndTime)})`;
    playSelectionBtn.classList.remove('playing');
}

// Reproduzir um intervalo específico do áudio
function playAudioInterval(startTime, endTime) {
    if (!audioPlayer) {
        console.error("Player de áudio não inicializado");
        return;
    }
    
    // Validar valores de tempo
    if (isNaN(startTime) || isNaN(endTime)) {
        console.error("Tempos inválidos:", startTime, endTime);
        return;
    }
    
    // Parar qualquer reprodução atual
    audioPlayer.pause();
    
    // Definir tempo inicial
    audioPlayer.currentTime = startTime;
    
    // Iniciar reprodução
    audioPlayer.play();
    
    // Destacar o player
    document.getElementById('audio-player-container').classList.add('selection-playing');
    
    // Monitorar quando parar a reprodução
    const timeUpdateHandler = function() {
        if (audioPlayer.currentTime >= endTime) {
            audioPlayer.pause();
            audioPlayer.removeEventListener('timeupdate', timeUpdateHandler);
            document.getElementById('audio-player-container').classList.remove('selection-playing');
        }
    };
    
    audioPlayer.addEventListener('timeupdate', timeUpdateHandler);
    console.log(`Reproduzindo intervalo: ${formatTime(startTime)} - ${formatTime(endTime)}`);
}

// Limpar recursos do player de áudio
function cleanupAudioPlayer() {
    audioPlayer.removeAttribute('src');
    disablePlayerControls();
    
    activeSelection = null;
    isSelectionPlaying = false;
    clearTimeout(selectionTimeout);
}

// Reproduzir uma única palavra
function playSingleWord(wordElement) {
    const start = parseFloat(wordElement.getAttribute('data-start'));
    const end = parseFloat(wordElement.getAttribute('data-end'));
    
    // Destacar a palavra que está sendo reproduzida
    const previousPlayingWords = document.querySelectorAll('.transcript-word.playing');
    previousPlayingWords.forEach(word => word.classList.remove('playing'));
    wordElement.classList.add('playing');
    
    // Reproduzir o intervalo
    playAudioInterval(Math.max(0, start - 0.1), Math.min(audioPlayer.duration, end + 0.1));
    
    // Remover o destaque após a reprodução
    setTimeout(() => {
        wordElement.classList.remove('playing');
    }, (end - start + 0.2) * 1000);
}
