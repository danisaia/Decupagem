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
    
    // Esconder player de intervalo
    const rangePlayer = document.getElementById('range-player');
    if (rangePlayer) {
        rangePlayer.style.display = 'none';
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
        
        // Configurar seleção para o player de áudio
        selectionStartTime = parseFloat(startWord.getAttribute('data-start')) + selectionPrecisionOffset; // Add small offset to avoid leading audio
        selectionEndTime = parseFloat(endWord.getAttribute('data-end')) - selectionPrecisionOffset; // Subtract small offset to avoid trailing audio
        
        // Armazenar seleção ativa
        activeSelection = {
            text: getSelectedRangeText(),
            startTime: selectionStartTime,
            endTime: selectionEndTime
        };
        
        console.log("Intervalo selecionado:", startWord.textContent, "até", endWord.textContent);
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
    
    // Atualizar informações de tempo
    document.getElementById('range-time-info').textContent = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    
    // Exibir o player
    document.getElementById('range-player').style.display = 'block';
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
    
    initPrecisionControl();
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
