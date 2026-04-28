module.exports = {
    formatDuration(ms) {
        if (!ms || isNaN(ms)) return '00:00';
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },

    createProgressBar(player, track, size = 15) {
        if (!track || !track.duration || track.duration === 0) return '▬'.repeat(size);
        const progress = Math.round((size * player.position) / track.duration);
        const progressText = '▬'.repeat(Math.max(0, progress - 1));
        const emptyProgressText = '▬'.repeat(Math.max(0, size - progress - 1));
        
        if (progress === 0) return '🔘' + '▬'.repeat(size - 1);
        if (progress >= size) return '▬'.repeat(size - 1) + '🔘';
        return progressText + '🔘' + emptyProgressText;
    }
};
