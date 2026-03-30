class LoggerService {
  private static instance: LoggerService;

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public initialize() {}

  public logError(error: unknown, context?: Record<string, string>) {
    console.error(error, context);
  }

  public logWarning(message: string, context?: Record<string, string>) {
    console.warn(message, context);
  }

  public logInfo(message: string, context?: Record<string, string>) {
    console.info(message, context);
  }

  public setUser(_id: string, _email?: string, _username?: string) {}

  public setExtra(_key: string, _value: string | number) {}

  public setTag(_key: string, _value: string) {}
}

export const logger = LoggerService.getInstance();
