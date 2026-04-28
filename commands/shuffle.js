const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'shuffle',
    aliases: ['mix'],
    description: 'Shuffle the music queue',
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

        if (!message.member.voice.channel) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('You need to be in a voice channel!')
                ]
            });
        }

        if (message.member.voice.channel.id !== player.voiceChannel) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('You need to be in the same voice channel as the bot!')
                ]
            });
        }

        if (player.queue.length < 2) {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle('❌ Error')
                    .setDescription('Queue is too short to shuffle! Add more songs.')
                ]
            });
        }

        player.queue.shuffle();

        return message.reply({
            embeds: [new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle('🔀 Queue Shuffled')
                .setDescription(`Successfully shuffled **${player.queue.length}** songs in the queue.`)
                .setFooter({ text: `Requested by ${message.author.tag} | Developed by ${client.config.developer}` })
            ]
        });
    }
};
