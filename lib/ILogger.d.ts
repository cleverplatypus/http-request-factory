/**
 * @public
 * An interface for logger adapters.
 */
export default interface ILogger {
    withLevel(level: string): ILogger;
    trace(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    fatal(message: string, ...args: any[]): void;
}
//# sourceMappingURL=ILogger.d.ts.map