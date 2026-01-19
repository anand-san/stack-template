/**
 * Logger Service
 * Uses lightweight custom Sentry client instead of @sentry/bun
 */
import env from '../../env';
import {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  isInitialized,
} from '../../custom-modules/sentry';

class LoggerService {
  private static instance: LoggerService;
  private initialized = false;
  private sentryEnabled = false;

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

    this.sentryEnabled = env.SENTRY_ENABLED === 'true' && !!env.SENTRY_DSN;

    if (this.sentryEnabled && env.SENTRY_DSN) {
      initSentry({
        dsn: env.SENTRY_DSN,
        environment: env.SENTRY_ENVIRONMENT,
      });
    }

    this.initialized = true;
  }

  public logInfo(event: string, context?: Record<string, string>) {
    // eslint-disable-next-line no-console -- logging
    console.info(event, context);

    if (this.sentryEnabled && isInitialized()) {
      void captureMessage(event, 'info', {
        ...context,
        environment: env.SENTRY_ENVIRONMENT,
      });
    }
  }

  public logWarning(event: string, context?: Record<string, string>) {
    // eslint-disable-next-line no-console -- logging
    console.warn(event, context);

    if (this.sentryEnabled && isInitialized()) {
      void captureMessage(event, 'warning', {
        ...context,
        environment: env.SENTRY_ENVIRONMENT,
      });
    }
  }

  public logUserEvent(
    event: string,
    userId: string,
    context?: Record<string, string>,
  ) {
    // eslint-disable-next-line no-console -- logging
    console.log(event, context);

    if (this.sentryEnabled && isInitialized()) {
      setUser({ id: userId });
      void captureMessage(event, 'info', {
        ...context,
        userId,
        environment: env.SENTRY_ENVIRONMENT,
      });
    }
  }

  public logError(error: unknown, context?: Record<string, string>) {
    // eslint-disable-next-line no-console -- logging
    console.error(error, context);

    if (this.sentryEnabled && isInitialized()) {
      if (error instanceof Error) {
        void captureException(error, {
          ...context,
          environment: env.SENTRY_ENVIRONMENT,
        });
      } else {
        void captureMessage(String(error), 'error', {
          ...context,
          environment: env.SENTRY_ENVIRONMENT,
        });
      }
    }
  }

  public setUser(id: string, email?: string, username?: string) {
    if (this.sentryEnabled && isInitialized()) {
      setUser({ id, email, username });
    }
  }

  public setExtra(_key: string, _value: string | number) {
    // Not implemented in lightweight client
    // Could add if needed
  }

  public setTag(_key: string, _value: string) {
    // Not implemented in lightweight client
    // Could add if needed
  }
}

export const loggerService = LoggerService.getInstance();
loggerService.initialize();
