import ILogger from './ILogger.ts';

const levels = ['trace', 'debug', 'info', 'warn', 'error'];
const levelValues = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4
}

export default class ConsoleLogger implements ILogger   {
    private level = 'trace';
    withLevel(level: string): ILogger {
        this.level = level;
        return new Proxy(this, {
            get: (target, property) => {
                if(property === 'withLevel') {
                    return (level) => target.withLevel(level);
                }
                if (levelValues[property] >= levelValues[this.level]) {
                    return (...args) => target[property](...args);
                }
                return () => {};
            }
        })
    }

    trace(message: string, ...args: any[]): void {
        console.trace(message, ...args);
    }
    debug(message: string, ...args: any[]): void {
        console.debug(message, ...args);
    }
    info(message: string, ...args: any[]): void {
        console.info(message, ...args);
    }
    warn(message: string, ...args: any[]): void {
        console.warn(message, ...args);
    }
    error(message: string, ...args: any[]): void {
        console.error(message, ...args);
    }
    fatal(message: string, ...args: any[]): void {
        console.error(message, ...args);
    }
}

