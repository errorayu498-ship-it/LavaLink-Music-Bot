const { EmbedBuilder } = require('discord.js');

function formatDuration(ms) {
    if (!ms || isNaN(ms)) return '00:00';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function createProgressBar(player, track, size = 20) {
    if (!track || !track.duration || track.duration === 0) return '▬'.repeat(size);
    const progress = Math.round((size * player.position) / track.duration);
    const emptyProgress = size - progress;
    const progressText = '▬'.repeat(Math.max(0, progress - 1));
    const emptyProgressText = '▬'.repeat(Math.max(0, emptyProgress - 1));
    
    if (progress === 0) return '🔘' + '▬'.repeat(size - 1);
    if (progress >= size) return '▬'.repeat(size - 1) + '🔘';
    return progressText + '🔘' + emptyProgressText;
}

module.exports = {
    name: 'nowplaying',
    aliases: ['np', 'current'],
    description: 'Show currently playing song',
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        
        if (!player || !player.queue.current) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        const track = player.queue.current;
        const progressBar = createProgressBar(player, track);
        const position = formatDuration(player.position);
        const duration = formatDuration(track.duration);

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({ name: '🎵 Now Playing', iconURL: client.user.displayAvatarURL() })
            .setDescription(`**[${track.title}](${track.uri})**`)
            .addFields(
                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: `${position} / ${duration}`, inline: true },
                { name: '📊 Progress', value: progressBar, inline: false },
                { name: '🔊 Volume', value: `${player.volume}%`, inline: true },
                { name: '🔁 Loop Mode', value: player.trackRepeat ? '🔂 Track' : player.queueRepeat ? '🔁 Queue' : '❌ None', inline: true },
                { name: '📻 Requested By', value: `<@${track.requester.id}>`, inline: true },
                { name: '🎵 Source', value: track.sourceName || 'Unknown', inline: true }
            )
            .setThumbnail(track.displayThumbnail ? track.displayThumbnail('maxresdefault') : null)
            .setFooter({ text: `Developed by ${client.config.developer}`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
