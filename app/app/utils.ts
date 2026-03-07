export function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(date);
}
