/**
 * Funcionalidades para montagem e gerenciamento de trechos selecionados
 */

// Variáveis globais
let assemblyClips = [];
let clipIdCounter = 0;
let draggedItem = null;

// Inicializar a funcionalidade de montagem
function initAssembly() {
    console.log("Inicializando funcionalidade de montagem...");
    
    // Adicionar o evento de clique para o botão "Adicionar Trecho"
    const addToAssemblyBtn = document.getElementById('add-to-assembly-btn');
    if (addToAssemblyBtn) {
        addToAssemblyBtn.addEventListener('click', addCurrentSelectionToAssembly);
    }
    
    // Adicionar evento para limpar todos os trechos
    const clearAllBtn = document.getElementById('clear-all-clips-btn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllClips);
    }
    
    // Verificar se há trechos salvos no localStorage
    loadClipsFromLocalStorage();
}

// Adicionar a seleção atual à montagem
function addCurrentSelectionToAssembly() {
    if (!activeSelection) {
        console.error("Nenhuma seleção ativa para adicionar");
        return;
    }
    
    console.log("Adicionando seleção à montagem:", activeSelection);
    
    // Criar um ID único para este trecho
    const clipId = `clip-${clipIdCounter++}`;
    
    // Criar um objeto para representar o trecho
    const clip = {
        id: clipId,
        text: activeSelection.text,
        startTime: activeSelection.startTime,
        endTime: activeSelection.endTime,
        originalStartTime: activeSelection.startTime,
        originalEndTime: activeSelection.endTime
    };
    
    // Adicionar à lista de trechos
    assemblyClips.push(clip);
    
    // Salvar no localStorage
    saveClipsToLocalStorage();
    
    // Atualizar a interface
    renderAssemblyClips();
    
    // Exibir a seção de montagem se estiver oculta
    const assemblySection = document.getElementById('assembly-section');
    if (assemblySection.style.display === 'none') {
        assemblySection.style.display = 'block';
    }
    
    // Exibir mensagem de confirmação
    showStatus('Trecho adicionado à montagem com sucesso!', 'success');
}

// Renderizar a lista de trechos
function renderAssemblyClips() {
    const assemblyList = document.getElementById('assembly-list');
    
    // Limpar a lista atual
    assemblyList.innerHTML = '';
    
    if (assemblyClips.length === 0) {
        // Exibir mensagem quando a lista estiver vazia
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-assembly-message';
        emptyMessage.textContent = 'Nenhum trecho adicionado. Selecione um trecho e clique em "Adicionar Trecho".';
        assemblyList.appendChild(emptyMessage);
        return;
    }
    
    // Adicionar cada trecho à lista
    assemblyClips.forEach((clip, index) => {
        const clipElement = createClipElement(clip, index);
        assemblyList.appendChild(clipElement);
    });
    
    // Configurar o recurso de arrastar e soltar
    setupDragAndDrop();
}

// Criar um elemento para um trecho
function createClipElement(clip, index) {
    const clipElement = document.createElement('div');
    clipElement.className = 'assembly-clip';
    clipElement.id = clip.id;
    clipElement.setAttribute('draggable', 'true');
    clipElement.setAttribute('data-index', index);
    
    // Criar o conteúdo do elemento
    clipElement.innerHTML = `
        <div class="clip-header">
            <div class="clip-time-info">
                Trecho ${index + 1}: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}
            </div>
            <div class="clip-controls">
                <button class="player-btn clip-play-btn" data-clip-id="${clip.id}">
                    <i class="play-icon">▶</i> Play
                </button>
                <button class="player-btn clip-stop-btn" data-clip-id="${clip.id}">
                    <i>■</i> Stop
                </button>
                <button class="player-btn clip-restart-btn" data-clip-id="${clip.id}">
                    <i>⟲</i> Início
                </button>
            </div>
        </div>
        
        <div class="clip-text">${clip.text}</div>
        
        <div class="clip-time-adjustments">
            <div class="time-group">
                <span class="time-label">Início:</span>
                <div class="time-adjust-buttons">
                    <button class="time-adjust-btn" data-action="start-back" data-clip-id="${clip.id}">-0.1s</button>
                    <button class="time-adjust-btn fine" data-action="start-back-fine" data-clip-id="${clip.id}">-0.01s</button>
                    <button class="time-adjust-btn fine" data-action="start-forward-fine" data-clip-id="${clip.id}">+0.01s</button>
                    <button class="time-adjust-btn" data-action="start-forward" data-clip-id="${clip.id}">+0.1s</button>
                </div>
            </div>
            
            <div class="time-group">
                <span class="time-label">Fim:</span>
                <div class="time-adjust-buttons">
                    <button class="time-adjust-btn" data-action="end-back" data-clip-id="${clip.id}">-0.1s</button>
                    <button class="time-adjust-btn fine" data-action="end-back-fine" data-clip-id="${clip.id}">-0.01s</button>
                    <button class="time-adjust-btn fine" data-action="end-forward-fine" data-clip-id="${clip.id}">+0.01s</button>
                    <button class="time-adjust-btn" data-action="end-forward" data-clip-id="${clip.id}">+0.1s</button>
                </div>
            </div>
        </div>
        
        <div class="clip-actions">
            <button class="clip-remove-btn" data-clip-id="${clip.id}">Remover Trecho</button>
        </div>
    `;
    
    // Adicionar os event listeners
    addClipEventListeners(clipElement, clip);
    
    return clipElement;
}

// Adicionar os event listeners para um elemento de trecho
function addClipEventListeners(clipElement, clip) {
    // Play button
    const playBtn = clipElement.querySelector('.clip-play-btn');
    playBtn.addEventListener('click', function() {
        playClip(clip);
    });
    
    // Stop button
    const stopBtn = clipElement.querySelector('.clip-stop-btn');
    stopBtn.addEventListener('click', function() {
        stopClip(clip);
    });
    
    // Restart button
    const restartBtn = clipElement.querySelector('.clip-restart-btn');
    restartBtn.addEventListener('click', function() {
        restartClip(clip);
    });
    
    // Remove button
    const removeBtn = clipElement.querySelector('.clip-remove-btn');
    removeBtn.addEventListener('click', function() {
        removeClip(clip.id);
    });
    
    // Time adjustment buttons
    const timeAdjustBtns = clipElement.querySelectorAll('.time-adjust-btn');
    timeAdjustBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const clipId = this.getAttribute('data-clip-id');
            adjustClipTime(clipId, action);
        });
    });
    
    // Drag and drop events
    clipElement.addEventListener('dragstart', handleDragStart);
    clipElement.addEventListener('dragover', handleDragOver);
    clipElement.addEventListener('dragenter', handleDragEnter);
    clipElement.addEventListener('dragleave', handleDragLeave);
    clipElement.addEventListener('drop', handleDrop);
    clipElement.addEventListener('dragend', handleDragEnd);
}

// Funções para controle de reprodução
function playClip(clip) {
    audioPlayer.currentTime = clip.startTime;
    audioPlayer.play();
    
    // Configurar um temporizador para parar no final do trecho
    const duration = clip.endTime - clip.startTime;
    setTimeout(() => {
        if (audioPlayer.currentTime >= clip.endTime) {
            audioPlayer.pause();
        }
    }, duration * 1000);
    
    // Monitorar a posição atual para parar no final do trecho
    const timeUpdateHandler = function() {
        if (audioPlayer.currentTime >= clip.endTime) {
            audioPlayer.pause();
            audioPlayer.removeEventListener('timeupdate', timeUpdateHandler);
        }
    };
    
    audioPlayer.addEventListener('timeupdate', timeUpdateHandler);
}

function stopClip(clip) {
    audioPlayer.pause();
    audioPlayer.currentTime = clip.startTime;
}

function restartClip(clip) {
    audioPlayer.currentTime = clip.startTime;
}

// Ajustar o tempo de um trecho
function adjustClipTime(clipId, action) {
    const clipIndex = assemblyClips.findIndex(clip => clip.id === clipId);
    if (clipIndex === -1) return;
    
    const clip = assemblyClips[clipIndex];
    let timeAdjustment = 0.1; // Default adjustment
    
    // Determine the precision level
    if (action.includes('-fine')) {
        timeAdjustment = 0.01; // Fine adjustment
    }
    
    switch(action) {
        case 'start-back':
        case 'start-back-fine':
            clip.startTime = Math.max(0, clip.startTime - timeAdjustment);
            break;
        case 'start-forward':
        case 'start-forward-fine':
            clip.startTime = Math.min(clip.endTime - timeAdjustment, clip.startTime + timeAdjustment);
            break;
        case 'end-back':
        case 'end-back-fine':
            clip.endTime = Math.max(clip.startTime + timeAdjustment, clip.endTime - timeAdjustment);
            break;
        case 'end-forward':
        case 'end-forward-fine':
            clip.endTime = Math.min(audioPlayer.duration, clip.endTime + timeAdjustment);
            break;
    }
    
    // Atualizar a interface
    updateClipTimeDisplay(clipId, clip);
    
    // Salvar as alterações
    saveClipsToLocalStorage();
}

// Atualizar a exibição de tempo de um trecho
function updateClipTimeDisplay(clipId, clip) {
    const clipElement = document.getElementById(clipId);
    if (!clipElement) return;
    
    const timeInfo = clipElement.querySelector('.clip-time-info');
    const index = parseInt(clipElement.getAttribute('data-index'));
    timeInfo.textContent = `Trecho ${index + 1}: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`;
}

// Remover um trecho
function removeClip(clipId) {
    const clipIndex = assemblyClips.findIndex(clip => clip.id === clipId);
    if (clipIndex === -1) return;
    
    // Confirmar a remoção
    if (confirm('Tem certeza que deseja remover este trecho?')) {
        // Remover da lista
        assemblyClips.splice(clipIndex, 1);
        
        // Salvar alterações
        saveClipsToLocalStorage();
        
        // Atualizar a interface
        renderAssemblyClips();
        
        // Se não houver mais trechos, esconder a seção
        if (assemblyClips.length === 0) {
            document.getElementById('assembly-section').style.display = 'none';
        }
    }
}

// Limpar todos os trechos
function clearAllClips() {
    if (assemblyClips.length === 0) return;
    
    // Confirmar a ação
    if (confirm('Tem certeza que deseja remover todos os trechos?')) {
        assemblyClips = [];
        clipIdCounter = 0;
        
        // Salvar alterações
        saveClipsToLocalStorage();
        
        // Atualizar a interface
        renderAssemblyClips();
        
        // Esconder a seção
        document.getElementById('assembly-section').style.display = 'none';
    }
}

// Persistência de dados
function saveClipsToLocalStorage() {
    try {
        const clipsData = {
            clips: assemblyClips,
            counter: clipIdCounter
        };
        localStorage.setItem('assemblyClips', JSON.stringify(clipsData));
    } catch (e) {
        console.error('Erro ao salvar trechos no localStorage:', e);
    }
}

function loadClipsFromLocalStorage() {
    try {
        const clipsData = localStorage.getItem('assemblyClips');
        if (clipsData) {
            const parsedData = JSON.parse(clipsData);
            assemblyClips = parsedData.clips || [];
            clipIdCounter = parsedData.counter || 0;
            
            if (assemblyClips.length > 0) {
                renderAssemblyClips();
                document.getElementById('assembly-section').style.display = 'block';
            }
        }
    } catch (e) {
        console.error('Erro ao carregar trechos do localStorage:', e);
    }
}

// Funcionalidade de arrastar e soltar
function setupDragAndDrop() {
    const clips = document.querySelectorAll('.assembly-clip');
    clips.forEach(clip => {
        clip.setAttribute('draggable', 'true');
    });
}

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    
    // Necessário para o Firefox
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    
    if (draggedItem !== this) {
        // Obter índices originais
        const draggedIndex = parseInt(draggedItem.getAttribute('data-index'));
        const targetIndex = parseInt(this.getAttribute('data-index'));
        
        // Reordenar a lista
        const draggedClip = assemblyClips[draggedIndex];
        assemblyClips.splice(draggedIndex, 1);
        assemblyClips.splice(targetIndex, 0, draggedClip);
        
        // Atualizar a interface
        renderAssemblyClips();
        
        // Salvar a nova ordem
        saveClipsToLocalStorage();
    }
    
    return false;
}

function handleDragEnd(e) {
    // Remover classe de todos os itens
    const clips = document.querySelectorAll('.assembly-clip');
    clips.forEach(clip => {
        clip.classList.remove('drag-over', 'dragging');
    });
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar montagem
    initAssembly();
});