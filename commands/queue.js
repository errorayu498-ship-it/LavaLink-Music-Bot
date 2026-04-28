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

module.exports = {
    name: 'queue',
    aliases: ['q', 'list'],
    description: 'Show the music queue',
    async execute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        
        if (!player) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('No music is currently playing!')
                ]
            });
        }

        const queue = player.queue;
        const current = player.queue.current;

        if (!current) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('📋 Queue')
                    .setDescription('Queue is empty.')
                ]
            });
        }

        let page = parseInt(args[0]) || 1;
        const perPage = 10;
        const totalPages = Math.ceil((queue.length + 1) / perPage) || 1;
        
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        
        const start = (page - 1) * perPage;
        const end = start + perPage;
        
        let description = `**🎵 Now Playing:**\n[${current.title}](${current.uri}) | \`${formatDuration(current.duration)}\` | <@${current.requester.id}>\n\n`;
        
        if (queue.length) {
            const tracks = queue.slice(start, end);
            description += `**📋 Queue (${page}/${totalPages}):**\n`;
            description += tracks.map((track, i) => 
                `**${start + i + 1}.** [${track.title}](${track.uri}) | \`${formatDuration(track.duration)}\` | <@${track.requester.id}>`
            ).join('\n');
        } else {
            description += '**No songs in queue**';
        }

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle('📋 Music Queue')
            .setDescription(description)
            .addFields(
                { name: '📊 Queue Size', value: `${queue.length} songs`, inline: true },
                { name: '⏱️ Total Duration', value: formatDuration(queue.duration || 0), inline: true },
                { name: '🔁 Loop', value: player.trackRepeat ? 'Track' : player.queueRepeat ? 'Queue' : 'None', inline: true }
            )
            .setFooter({ text: `Page ${page}/${totalPages} | Developed by ${client.config.developer}` })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
