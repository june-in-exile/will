const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    log: 4,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

export { LOG_LEVELS, type LogLevel };