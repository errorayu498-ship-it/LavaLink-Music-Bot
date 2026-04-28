const chalk = require('chalk');
const moment = require('moment');

class Logger {
    static info(message) {
        console.log(chalk.blue(`[${this.getTimestamp()}] [INFO]`), message);
    }

    static success(message) {
        console.log(chalk.green(`[${this.getTimestamp()}] [SUCCESS]`), message);
    }

    static warning(message) {
        console.log(chalk.yellow(`[${this.getTimestamp()}] [WARNING]`), message);
    }

    static error(message) {
        console.log(chalk.red(`[${this.getTimestamp()}] [ERROR]`), message);
    }

    static music(message) {
        console.log(chalk.magenta(`[${this.getTimestamp()}] [MUSIC]`), message);
    }

    static command(message) {
        console.log(chalk.cyan(`[${this.getTimestamp()}] [COMMAND]`), message);
    }

    static getTimestamp() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    }
}

module.exports = Logger;
