const { EmbedBuilder } = require('discord.js');

class EmbedUtil {
    static musicEmbed(title, color) {
        return new EmbedBuilder()
            .setColor(color || '#FF0000')
            .setTitle(title)
            .setTimestamp()
            .setFooter({ text: 'Music Bot' });
    }

    static premiumEmbed(title, color) {
        return new EmbedBuilder()
            .setColor(color || '#FF0000')
            .setTitle(`⭐ ${title}`)
            .setTimestamp()
            .setFooter({ text: 'Premium Feature' });
    }

    static errorEmbed(title, color) {
        return new EmbedBuilder()
            .setColor(color || '#FF0000')
            .setTitle(`❌ ${title}`)
            .setTimestamp();
    }

    static successEmbed(title, color) {
        return new EmbedBuilder()
            .setColor(color || '#FF0000')
            .setTitle(`✅ ${title}`)
            .setTimestamp();
    }

    static infoEmbed(title, color) {
        return new EmbedBuilder()
            .setColor(color || '#FF0000')
            .setTitle(`ℹ️ ${title}`)
            .setTimestamp();
    }
}

module.exports = EmbedUtil;
