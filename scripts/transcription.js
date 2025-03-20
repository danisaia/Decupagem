/**
 * Funcionalidades relacionadas à transcrição
 */

// Variáveis para armazenar dados de transcrição
let transcriptionData = null;
let wordTimestamps = [];

// Mapear texto selecionado para intervalo de tempo no áudio
function mapSelectionToAudio(selectedText) {
    if (!audioPlayer.duration || !transcript.textContent) return false;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    const range = selection.getRangeAt(0);
    
    // Identificar pontos de início e fim da seleção baseados em elementos com timestamps
    let startTime = null;
    let endTime = null;
    
    // Encontrar os elementos dentro da seleção com timestamps
    const selectedNodes = getNodesInSelection(range);
    const timestampedElements = selectedNodes.filter(node => 
        node.nodeType === 1 && 
        (node.hasAttribute('data-start') || (node.parentNode && node.parentNode.hasAttribute && node.parentNode.hasAttribute('data-start')))
    );
    
    if (timestampedElements.length > 0) {
        // Encontrar o elemento mais próximo do início da seleção
        const firstElement = timestampedElements[0];
        startTime = parseFloat(firstElement.getAttribute('data-start') || 
                             (firstElement.parentNode && firstElement.parentNode.getAttribute('data-start')));
        
        // Encontrar o elemento mais próximo do fim da seleção
        const lastElement = timestampedElements[timestampedElements.length - 1];
        endTime = parseFloat(lastElement.getAttribute('data-end') || 
                           (lastElement.parentNode && lastElement.parentNode.getAttribute('data-end')));
    }
    
    // Se não encontramos elementos com timestamps, tentar buscar na lista wordTimestamps
    if (startTime === null || endTime === null) {
        const normalizedSelectedText = selectedText.toLowerCase().trim();
        
        // Buscar na lista de palavras armazenadas com timestamps
        for (let i = 0; i < wordTimestamps.length; i++) {
            const wordData = wordTimestamps[i];
            if (normalizedSelectedText.includes(wordData.word.toLowerCase())) {
                if (startTime === null || wordData.start < startTime) {
                    startTime = wordData.start;
                }
                if (endTime === null || wordData.end > endTime) {
                    endTime = wordData.end;
                }
            }
        }
    }
    
    // Se ainda não encontramos timestamps, usar o método de proporção como fallback
    if (startTime === null || endTime === null) {
        console.log("Usando método de proporção como fallback");
        const fullText = transcript.textContent;
        const startIndex = fullText.indexOf(selectedText);
        
        if (startIndex === -1) return false;
        
        const endIndex = startIndex + selectedText.length;
        const textStartRatio = startIndex / fullText.length;
        const textEndRatio = endIndex / fullText.length;
        
        startTime = audioPlayer.duration * textStartRatio;
        endTime = audioPlayer.duration * textEndRatio;
    }
    
    // Ajustar para não exceder a duração do áudio
    endTime = Math.min(endTime, audioPlayer.duration);
    
    // Adicionar pequena margem para contexto
    startTime = Math.max(0, startTime - 0.2);
    endTime = Math.min(audioPlayer.duration, endTime + 0.2);
    
    // Definir os tempos de seleção
    selectionStartTime = startTime;
    selectionEndTime = endTime;
    
    // Armazenar seleção ativa
    activeSelection = {
        text: selectedText,
        startTime: selectionStartTime,
        endTime: selectionEndTime
    };
    
    // Atualizar o texto do botão com o intervalo de tempo
    document.getElementById('play-selection-btn').innerHTML = `<span class="play-icon">▶</span> Reproduzir (${formatTime(selectionStartTime)} - ${formatTime(selectionEndTime)})`;
    
    return true;
}

// Obter todos os nós dentro de uma seleção
function getNodesInSelection(range) {
    const nodes = [];
    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        { acceptNode: node => NodeFilter.FILTER_ACCEPT }
    );
    
    let node;
    while (node = walker.nextNode()) {
        if (range.intersectsNode(node)) {
            nodes.push(node);
        }
    }
    
    return nodes;
}

// Lidar com a seleção de texto
function handleTextSelection() {
    const selection = window.getSelection();
    
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed || !transcript.contains(range.commonAncestorContainer)) {
        document.getElementById('selection-controls').style.display = 'none';
        return;
    }
    
    const selectedText = selection.toString().trim();
    
    if (selectedText && audioPlayer.duration) {
        positionSelectionControls(range);
        if (mapSelectionToAudio(selectedText)) {
            document.getElementById('selection-controls').style.display = 'block';
        }
    } else {
        document.getElementById('selection-controls').style.display = 'none';
    }
}

// Posicionar o botão de controle próximo à seleção
function positionSelectionControls(range) {
    const rect = range.getBoundingClientRect();
    const containerRect = transcript.getBoundingClientRect();
    const selectionControls = document.getElementById('selection-controls');
    
    // Posicionar acima da seleção
    const top = rect.top - containerRect.top - selectionControls.offsetHeight - 10;
    const left = rect.left - containerRect.left + (rect.width / 2) - (selectionControls.offsetWidth / 2);
    
    selectionControls.style.top = Math.max(0, top) + 'px';
    selectionControls.style.left = Math.max(0, left) + 'px';
}

// Esconder controles de seleção
function hideSelectionControls() {
    document.getElementById('selection-controls').style.display = 'none';
}

// Exibir a transcrição com timestamps
function displayTranscriptionWithTimestamps(data) {
    // Limpar dados anteriores
    wordTimestamps = [];
    transcript.innerHTML = '';
    
    if (!data || !data.segments || !data.segments.length) {
        transcript.textContent = data.text || "Nenhum texto transcrito";
        return;
    }
    
    // Processar os segmentos e palavras com seus timestamps
    data.segments.forEach(segment => {
        const segmentElement = document.createElement('span');
        segmentElement.className = 'transcript-segment';
        segmentElement.setAttribute('data-start', segment.start);
        segmentElement.setAttribute('data-end', segment.end);
        
        // Se temos timestamps de palavras, exibi-las individualmente
        if (segment.words && segment.words.length) {
            segment.words.forEach(word => {
                if (typeof word === 'object' && word.word) {
                    const wordElement = document.createElement('span');
                    wordElement.className = 'transcript-word';
                    wordElement.setAttribute('data-start', word.start);
                    wordElement.setAttribute('data-end', word.end);
                    wordElement.textContent = word.word;
                    
                    // Adicionar event listener para reproduzir ao clicar
                    wordElement.addEventListener('click', function(event) {
                        // Verificar se estamos no modo de seleção de intervalo
                        if (window.rangeSelectionMode) {
                            // Se estiver no modo de seleção, chamar a função de handleWordClick
                            if (typeof handleWordClick === 'function') {
                                handleWordClick(this);
                            }
                        } else {
                            // Se não estiver no modo de seleção, reproduzir a palavra normalmente
                            playSingleWord(this);
                        }
                    });
                    
                    // Armazenar timestamps para busca rápida
                    wordTimestamps.push({
                        word: word.word,
                        start: word.start,
                        end: word.end,
                        element: wordElement
                    });
                    
                    segmentElement.appendChild(wordElement);
                    
                    // Adicionar espaço após cada palavra
                    segmentElement.appendChild(document.createTextNode(' '));
                }
            });
        } else {
            // Se não há timestamps por palavra, usar o segmento inteiro
            segmentElement.textContent = segment.text + ' ';
        }
        
        transcript.appendChild(segmentElement);
    });
}
