/**
 * Utilitários gerais para a aplicação
 */

// Formatar tempo em segundos para formato MM:SS.DD (com centésimos)
function formatTime(timeInSeconds) {
    if (isNaN(timeInSeconds)) return '0:00.00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const centiseconds = Math.floor((timeInSeconds % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

// Prevenir comportamentos padrão em eventos
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Destacar área de upload
function highlight(e) {
    const fileUpload = document.querySelector('.file-upload');
    fileUpload.classList.add('highlight');
}

// Remover destaque de área de upload
function unhighlight(e) {
    const fileUpload = document.querySelector('.file-upload');
    fileUpload.classList.remove('highlight');
}

// Exibir status com diferentes estilos
function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
}

// Atualizar barra de progresso
function showProgress(percentage) {
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    
    progressContainer.style.display = 'block';
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${Math.round(percentage)}%`;
}
