/**
 * Funcionalidades para seleção de intervalo na transcrição
 */

// Variáveis para seleção de intervalo
window.rangeSelectionMode = false;
let startWord = null;
let endWord = null;
let highlightedWords = [];
let selectionPrecisionOffset = 0.05; // Definir valor fixo para opção Média

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
    
    // Update selection info with fine adjustment controls
    const selectionInfo = document.createElement('div');
    selectionInfo.id = 'selection-info';
    selectionInfo.className = 'selection-info';
    
    // Create start time adjustment controls
    const startControls = document.createElement('div');
    startControls.className = 'time-adjust-controls start-controls';
    startControls.innerHTML = `
        <button class="time-adjust-btn" data-action="start-back">-0.1s</button>
        <button class="time-adjust-btn fine" data-action="start-back-fine">-0.01s</button>
        <button class="time-adjust-btn ultra-fine" data-action="start-back-ultra-fine">-0.001s</button>
        <button class="time-adjust-btn ultra-fine" data-action="start-forward-ultra-fine">+0.001s</button>
        <button class="time-adjust-btn fine" data-action="start-forward-fine">+0.01s</button>
        <button class="time-adjust-btn" data-action="start-forward">+0.1s</button>
    `;

    // Create the time display element
    const timeDisplay = document.createElement('span');
    timeDisplay.className = 'selection-time-display';
    timeDisplay.textContent = `Seleção: ${formatTime(selectionStartTime)} - ${formatTime(selectionEndTime)}`;
    
    // Create end time adjustment controls
    const endControls = document.createElement('div');
    endControls.className = 'time-adjust-controls end-controls';
    endControls.innerHTML = `
        <button class="time-adjust-btn" data-action="end-back">-0.1s</button>
        <button class="time-adjust-btn fine" data-action="end-back-fine">-0.01s</button>
        <button class="time-adjust-btn ultra-fine" data-action="end-back-ultra-fine">-0.001s</button>
        <button class="time-adjust-btn ultra-fine" data-action="end-forward-ultra-fine">+0.001s</button>
        <button class="time-adjust-btn fine" data-action="end-forward-fine">+0.01s</button>
        <button class="time-adjust-btn" data-action="end-forward">+0.1s</button>
    `;
    
    // Assemble all elements
    selectionInfo.appendChild(startControls);
    selectionInfo.appendChild(timeDisplay);
    selectionInfo.appendChild(endControls);
    
    // Add event listeners for time adjustment buttons
    selectionInfo.querySelectorAll('.time-adjust-btn').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            let timeAdjustment = 0.1; // Default adjustment
            
            // Determine the precision level
            if (action.includes('-ultra-fine')) {
                timeAdjustment = 0.001; // Finest adjustment (milésimos)
            } else if (action.includes('-fine')) {
                timeAdjustment = 0.01; // Fine adjustment (centésimos)
            }
            
            switch(action) {
                case 'start-back':
                case 'start-back-fine':
                case 'start-back-ultra-fine':
                    selectionStartTime = Math.max(0, selectionStartTime - timeAdjustment);
                    break;
                case 'start-forward':
                case 'start-forward-fine':
                case 'start-forward-ultra-fine':
                    selectionStartTime = Math.min(selectionEndTime - timeAdjustment, selectionStartTime + timeAdjustment);
                    break;
                case 'end-back':
                case 'end-back-fine':
                case 'end-back-ultra-fine':
                    selectionEndTime = Math.max(selectionStartTime + timeAdjustment, selectionEndTime - timeAdjustment);
                    break;
                case 'end-forward':
                case 'end-forward-fine':
                case 'end-forward-ultra-fine':
                    selectionEndTime = Math.min(audioPlayer.duration, selectionEndTime + timeAdjustment);
                    break;
            }
            
            // Update the time display
            timeDisplay.textContent = `Seleção: ${formatTime(selectionStartTime)} - ${formatTime(selectionEndTime)}`;
            
            // Update the active selection
            activeSelection.startTime = selectionStartTime;
            activeSelection.endTime = selectionEndTime;
        });
    });
    
    // Remove any existing selection info
    const existingInfo = document.getElementById('selection-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Add the selection info to the audio player container
    document.getElementById('audio-player-container').appendChild(selectionInfo);
    
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
}

// Add a handler function for the clear selection button
function clearSelectionHandler() {
    clearRangeSelection();
    document.getElementById('clear-selection-btn').style.display = 'none';
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
    const baseOffset = 0.05; // Usar valor fixo para precisão média
    
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
