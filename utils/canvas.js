const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

class CanvasUtil {
    static async createNowPlayingCard(track, requester) {
        const canvas = createCanvas(800, 250);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gradient overlay
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        try {
            // Album Art
            const thumbnail = await loadImage(track.displayThumbnail('maxresdefault'));
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(30, 25, 200, 200, 10);
            ctx.clip();
            ctx.drawImage(thumbnail, 30, 25, 200, 200);
            ctx.restore();

            // Border for album art
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(30, 25, 200, 200, 10);
            ctx.stroke();
        } catch (error) {
            // Default music icon
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.roundRect(30, 25, 200, 200, 10);
            ctx.fill();
        }

        // Track Title
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        const title = track.title.length > 30 ? track.title.substring(0, 30) + '...' : track.title;
        ctx.fillText(title, 260, 60);

        // Artist
        ctx.font = '18px Arial';
        ctx.fillStyle = '#FF0000';
        ctx.fillText(`by ${track.author}`, 260, 95);

        // Progress Bar Background
        ctx.fillStyle = '#333';
        ctx.fillRect(260, 130, 500, 8);
        
        // Progress Bar
        const progress = track.position / track.duration;
        const progressGradient = ctx.createLinearGradient(260, 0, 760, 0);
        progressGradient.addColorStop(0, '#FF0000');
        progressGradient.addColorStop(1, '#FF4444');
        ctx.fillStyle = progressGradient;
        ctx.fillRect(260, 130, 500 * progress, 8);

        // Time
        ctx.font = '14px Arial';
        ctx.fillStyle = '#AAA';
        ctx.fillText(this.formatTime(track.position), 260, 160);
        ctx.fillText(this.formatTime(track.duration), 710, 160);

        // Info badges
        let xPos = 260;
        
        // Volume badge
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.roundRect(xPos, 180, 80, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.fillText('🔊 VOL', xPos + 10, 200);
        xPos += 95;

        // Source badge
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(xPos, 180, 100, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.fillText(track.sourceName || 'Unknown', xPos + 10, 200);
        xPos += 115;

        // Requester
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(xPos, 180, 150, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        const requesterName = requester.username.length > 15 ? 
            requester.username.substring(0, 15) + '...' : requester.username;
        ctx.fillText(`👤 ${requesterName}`, xPos + 10, 200);

        // Footer
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Developed by SUBHAN', 30, canvas.height - 10);

        return canvas.toBuffer();
    }

    static formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
}

module.exports = CanvasUtil;
