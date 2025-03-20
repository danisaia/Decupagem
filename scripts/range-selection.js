/**
 * Funcionalidades para seleção de intervalo na transcrição
 */

// Variáveis para seleção de intervalo
window.rangeSelectionMode = false;
let startWord = null;
let endWord = null;
let highlightedWords = [];
let selectionPrecisionOffset = 0.05; // Default precision offset

// Iniciar modo de seleção de intervalo
function startRangeSelectionMode() {
    // Ativar modo de seleção
    window.rangeSelectionMode = true;
    
    // Resetar qualquer seleção anterior
    clearRangeSelection();
    
    // Atualizar a UI para mostrar que estamos no modo de seleção
    document.querySelector('.instructions-text').style.display = 'block';
    document.getElementById('start-range-selection').style.display = 'none';
    
    // Adicionar classe ao container de transcrição para indicar modo de seleção
    transcript.classList.add('range-selection-active');
    
    console.log("Modo de seleção de intervalo ativado");
}

// Cancelar seleção de intervalo
function cancelRangeSelection() {
    // Desativar modo de seleção
    window.rangeSelectionMode = false;
    
    // Limpar seleções
    clearRangeSelection();
    
    // Atualizar UI
    document.querySelector('.instructions-text').style.display = 'none';
    document.getElementById('start-range-selection').style.display = 'block';
    transcript.classList.remove('range-selection-active');
    
    console.log("Seleção de intervalo cancelada");
}

// Limpar a seleção atual
function clearRangeSelection() {
    // Limpar palavras destacadas
    highlightedWords.forEach(word => {
        word.classList.remove('word-start', 'word-end', 'word-between');
    });
    highlightedWords = [];
    
    // Resetar seleção
    startWord = null;
    endWord = null;
    
    // Reset the main player
    document.getElementById('audio-player-container').classList.remove('has-selection');
    
    // Remove selection info
    const selectionInfo = document.getElementById('selection-info');
    if (selectionInfo) {
        selectionInfo.remove();
    }
    
    // Hide selection controls
    document.getElementById('selection-controls').style.display = 'none';
    
    // Reset active selection
    activeSelection = null;
    
    // Show clear selection button
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
}

// Manipular clique em uma palavra durante a seleção de intervalo
function handleWordClick(wordElement) {
    // Se não há palavra inicial selecionada
    if (!startWord) {
        startWord = wordElement;
        wordElement.classList.add('word-start');
        highlightedWords.push(wordElement);
        console.log("Palavra inicial selecionada:", wordElement.textContent);
    } 
    // Se já temos uma palavra inicial, mas não uma final
    else if (!endWord) {
        const startIndex = getWordIndex(startWord);
        const clickedIndex = getWordIndex(wordElement);
        
        // Se clicou na mesma palavra, não faz nada
        if (startIndex === clickedIndex) {
            return;
        }
        
        // Determinar qual é o início e qual é o fim
        let actualStart, actualEnd;
        if (startIndex < clickedIndex) {
            actualStart = startIndex;
            actualEnd = clickedIndex;
            endWord = wordElement;
        } else {
            actualStart = clickedIndex;
            actualEnd = startIndex;
            endWord = startWord;
            startWord = wordElement;
        }
        
        // Destacar a palavra final
        wordElement.classList.add(startIndex < clickedIndex ? 'word-end' : 'word-start');
        startWord.classList.add(startIndex < clickedIndex ? 'word-start' : 'word-end');
        highlightedWords.push(wordElement);
        
        // Destacar palavras entre início e fim
        highlightWordsBetween(actualStart, actualEnd);
        
        // Exibir os controles de reprodução do intervalo
        showRangePlayer();
        
        // Sair do modo de seleção
        window.rangeSelectionMode = false;
        document.querySelector('.instructions-text').style.display = 'none';
        document.getElementById('start-range-selection').style.display = 'block';
        transcript.classList.remove('range-selection-active');
        
        // Configurar seleção para o player de áudio com offsets adaptativos
        const { startOffset, endOffset } = calculateAdaptiveOffsets();

        selectionStartTime = Math.max(0, parseFloat(startWord.getAttribute('data-start')) - startOffset);
        selectionEndTime = Math.min(audioPlayer.duration, parseFloat(endWord.getAttribute('data-end')) + endOffset);
        
        // Armazenar seleção ativa
        activeSelection = {
            text: getSelectedRangeText(),
            startTime: selectionStartTime,
            endTime: selectionEndTime
        };
        
        console.log("Intervalo selecionado:", startWord.textContent, "até", endWord.textContent);
    }
    
    // Show the clear selection button
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    if (clearSelectionBtn) {
        clearSelectionBtn.style.display = 'inline-block';
    }
}

// Obter texto do intervalo selecionado
function getSelectedRangeText() {
    if (!startWord || !endWord) return "";
    
    const startIndex = getWordIndex(startWord);
    const endIndex = getWordIndex(endWord);
    
    const actualStart = Math.min(startIndex, endIndex);
    const actualEnd = Math.max(startIndex, endIndex);
    
    let text = "";
    for (let i = actualStart; i <= actualEnd; i++) {
        text += wordTimestamps[i].word + " ";
    }
    
    return text.trim();
}

// Obter o índice de uma palavra no array wordTimestamps
function getWordIndex(wordElement) {
    for (let i = 0; i < wordTimestamps.length; i++) {
        if (wordTimestamps[i].element === wordElement) {
            return i;
        }
    }
    return -1;
}

// Destacar todas as palavras entre início e fim
function highlightWordsBetween(startIndex, endIndex) {
    for (let i = startIndex + 1; i < endIndex; i++) {
        const wordElement = wordTimestamps[i].element;
        wordElement.classList.add('word-between');
        highlightedWords.push(wordElement);
    }
}

// Mostrar o player de intervalo com informações sobre o trecho selecionado
function showRangePlayer() {
    if (!startWord || !endWord) return;
    
    const startTime = parseFloat(startWord.getAttribute('data-start'));
    const endTime = parseFloat(endWord.getAttribute('data-end'));
    
    // Calculate adaptive offsets
    const { startOffset, endOffset } = calculateAdaptiveOffsets();
    
    // Set the selection times with offsets
    selectionStartTime = Math.max(0, parseFloat(startWord.getAttribute('data-start')) - startOffset);
    selectionEndTime = Math.min(audioPlayer.duration, parseFloat(endWord.getAttribute('data-end')) + endOffset);
    
    // Update the main player to show it's in selection mode
    document.getElementById('audio-player-container').classList.add('has-selection');
    
    // Update selection info
    const selectionInfo = document.createElement('div');
    selectionInfo.id = 'selection-info';
    selectionInfo.className = 'selection-info';
    selectionInfo.textContent = `Seleção: ${formatTime(selectionStartTime)} - ${formatTime(selectionEndTime)}`;
    
    // Remove any existing selection info
    const existingInfo = document.getElementById('selection-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Add the selection info to the audio player container
    document.getElementById('audio-player-container').appendChild(selectionInfo);
    
    // Make selection controls visible
    // document.getElementById('selection-controls').style.display = 'block'; // Commented out to hide the floating button
    
    // Store active selection
    activeSelection = {
        text: getSelectedRangeText(),
        startTime: selectionStartTime,
        endTime: selectionEndTime
    };
    
    console.log("Intervalo selecionado:", startWord.textContent, "até", endWord.textContent);
}

// Inicializar eventos de seleção de intervalo
function initRangeSelection() {
    // Verificar se os elementos existem antes de adicionar listeners
    const rangePlayer = document.getElementById('range-player');
    if (!rangePlayer) {
        console.error("Elemento range-player não encontrado");
        // Criar elemento dinamicamente se não existir
        const rangePlayerElement = document.createElement('div');
        rangePlayerElement.id = 'range-player';
        rangePlayerElement.className = 'range-player';
        rangePlayerElement.style.display = 'none';
        rangePlayerElement.innerHTML = `
            <div class="range-info" id="range-time-info"></div>
            <div class="range-controls">
                <button id="play-range"><span class="play-icon">▶</span> Reproduzir trecho</button>
                <button id="clear-range">Limpar seleção</button>
            </div>
        `;
        document.querySelector('.transcript-container').insertAdjacentElement('afterend', rangePlayerElement);
    }
    
    // Estes eventos são adicionados após a criação dos elementos no DOM
    document.addEventListener('click', function(e) {
        const startRangeBtn = document.getElementById('start-range-selection');
        const cancelBtn = document.getElementById('cancel-selection');
        const clearRangeBtn = document.getElementById('clear-range');
        const playRangeBtn = document.getElementById('play-range');
        
        if (e.target === startRangeBtn) {
            startRangeSelectionMode();
        } else if (e.target === cancelBtn) {
            cancelRangeSelection();
        } else if (e.target === clearRangeBtn) {
            clearRangeSelection();
        } else if (e.target === playRangeBtn && startWord && endWord) {
            const startTime = parseFloat(startWord.getAttribute('data-start'));
            const endTime = parseFloat(endWord.getAttribute('data-end'));
            playAudioInterval(startTime, endTime);
        }
    });
    
    // Add event listener to the clear selection button that's already in the HTML
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    if (clearSelectionBtn) {
        // Remove any existing listeners to avoid duplicates
        clearSelectionBtn.removeEventListener('click', clearSelectionHandler);
        // Add the event listener
        clearSelectionBtn.addEventListener('click', clearSelectionHandler);
    }
    
    // Initialize precision control
    initPrecisionControl();
}

// Add a handler function for the clear selection button
function clearSelectionHandler() {
    clearRangeSelection();
    document.getElementById('clear-selection-btn').style.display = 'none';
}

// Add this function to your script
function initPrecisionControl() {
    const precisionSelect = document.getElementById('selection-precision');
    if (precisionSelect) {
        precisionSelect.addEventListener('change', function() {
            selectionPrecisionOffset = parseFloat(this.value);
            console.log(`Precisão da seleção ajustada para: ${selectionPrecisionOffset}`);
            
            // Update current selection if it exists
            if (startWord && endWord) {
                selectionStartTime = parseFloat(startWord.getAttribute('data-start')) + selectionPrecisionOffset;
                selectionEndTime = parseFloat(endWord.getAttribute('data-end')) - selectionPrecisionOffset;
            }
        });
    }
}

// Configurar seleção para o player de áudio com offsets adaptativos
function calculateAdaptiveOffsets() {
    // Obter índices das palavras inicial e final
    const startIndex = getWordIndex(startWord);
    const endIndex = getWordIndex(endWord);
    
    // Calcular duração das palavras selecionadas
    const startWordDuration = parseFloat(startWord.getAttribute('data-end')) - parseFloat(startWord.getAttribute('data-start'));
    const endWordDuration = parseFloat(endWord.getAttribute('data-end')) - parseFloat(endWord.getAttribute('data-end'));
    
    // Obter o valor base do offset da seleção do usuário
    const baseOffset = parseFloat(document.getElementById('selection-precision').value);
    
    // Ajustar offsets dinâmicos baseados no contexto
    let startOffset = baseOffset;
    let endOffset = baseOffset;
    
    // 1. Ajustar com base na duração da palavra (palavras mais curtas precisam de offsets menores)
    if (startWordDuration < 0.2) {
        startOffset = baseOffset * 0.5; // Reduzir offset para palavras curtas
    }
    
    if (endWordDuration < 0.2) {
        endOffset = baseOffset * 0.5;
    }
    
    // 2. Considerar contexto: verificar se há palavras adjacentes
    if (startIndex > 0) {
        // Se há uma palavra antes, podemos ajustar para não cortar junções
        const prevWord = wordTimestamps[startIndex - 1];
        const gapBetweenWords = parseFloat(startWord.getAttribute('data-start')) - parseFloat(prevWord.element.getAttribute('data-end'));
        
        // Se as palavras estão muito próximas, reduzir o offset para não cortar a palavra anterior
        if (gapBetweenWords < 0.1) {
            startOffset = Math.min(startOffset, gapBetweenWords / 2);
        }
    }
    
    if (endIndex < wordTimestamps.length - 1) {
        // Se há uma palavra depois, ajustar para não incluir parte dela
        const nextWord = wordTimestamps[endIndex + 1];
        const gapAfterWord = parseFloat(nextWord.element.getAttribute('data-start')) - parseFloat(endWord.getAttribute('data-end'));
        
        // Se as palavras estão próximas, reduzir o offset
        if (gapAfterWord < 0.1) {
            endOffset = Math.min(endOffset, gapAfterWord / 2);
        }
    }
    
    return { startOffset, endOffset };
}
