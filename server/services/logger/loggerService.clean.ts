class LoggerService {
  private static instance: LoggerService;
  private initialized = false;

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  public initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
  }

  public logInfo(event: string, context?: Record<string, string>) {
    // eslint-disable-next-line no-console -- logging
    console.info(event, context);
  }

  public logWarning(event: string, context?: Record<string, string>) {
    // eslint-disable-next-line no-console -- logging
    console.warn(event, context);
  }

  public logUserEvent(
    event: string,
    _userId: string,
    context?: Record<string, string>,
  ) {
    // eslint-disable-next-line no-console -- logging
    console.log(event, context);
  }

  public logError(error: unknown, context?: Record<string, string>) {
    // eslint-disable-next-line no-console -- logging
    console.error(error, context);
  }

  public setUser(_id: string, _email?: string, _username?: string) {}

  public setExtra(_key: string, _value: string | number) {}

  public setTag(_key: string, _value: string) {}
}

export const loggerService = LoggerService.getInstance();
loggerService.initialize();
