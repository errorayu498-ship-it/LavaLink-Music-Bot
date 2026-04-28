const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    aliases: ['h', 'commands', 'cmds'],
    description: 'Show all available commands',
    async execute(message, args, client) {
        const prefix = client.config.prefix;
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({ 
                name: `${client.user.username} Commands`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setDescription(`**Developed by ${client.config.developer}**\n*Advanced Music Bot with Premium Features*\n`)
            .addFields(
                {
                    name: '🎵 Music Commands',
                    value: [
                        `\`${prefix}play <song/url>\` - Play a song`,
                        `\`${prefix}skip\` - Skip current song`,
                        `\`${prefix}stop\` - Stop music & leave`,
                        `\`${prefix}pause\` - Pause music`,
                        `\`${prefix}resume\` - Resume music`,
                        `\`${prefix}volume <0-100>\` - Adjust volume`,
                        `\`${prefix}queue [page]\` - Show queue`,
                        `\`${prefix}nowplaying\` - Current song info`,
                        `\`${prefix}shuffle\` - Shuffle queue`,
                        `\`${prefix}loop [track/queue/off]\` - Loop mode`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎮 Player Controls',
                    value: [
                        '⏯️ Pause/Resume',
                        '⏭️ Skip Track',
                        '⏹️ Stop Player',
                        '🔀 Shuffle Queue',
                        '🔁 Loop Mode',
                        '🔉/🔊 Volume Control',
                        '📋 View Queue',
                        '🎵 Now Playing'
                    ].join(' | '),
                    inline: false
                },
                {
                    name: '📋 Utility Commands',
                    value: [
                        `\`${prefix}help\` - Show this menu`,
                        `\`${prefix}ping\` - Bot latency`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🌐 Supported Platforms',
                    value: 'YouTube • Spotify • SoundCloud • Direct Links',
                    inline: false
                }
            )
            .setFooter({ 
                text: `Prefix: ${prefix} | ${client.guilds.cache.size} Servers | Developed by ${client.config.developer}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
