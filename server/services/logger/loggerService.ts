import * as Sentry from '@sentry/bun';
import env from '../../env';

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

    Sentry.init({
      enabled: env.SENTRY_ENABLED === 'true',
      dsn: env.SENTRY_DSN,
      tracesSampleRate: 1.0,
    });

    this.initialized = true;
  }

  public logInfo(event: string, context?: Record<string, string>) {
    if (env.SENTRY_ENABLED !== 'true') {
      // eslint-disable-next-line no-console -- error debugging
      console.info(event, context);
    }
    Sentry.withScope(scope => {
      scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
      Sentry.captureMessage(event, 'info');
    });
  }

  public logWarning(event: string, context?: Record<string, string>) {
    if (env.SENTRY_ENABLED !== 'true') {
      // eslint-disable-next-line no-console -- error debugging
      console.warn(event, context);
    }
    Sentry.withScope(scope => {
      scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
      Sentry.captureMessage(event, 'warning');
    });
  }

  public logUserEvent(
    event: string,
    userId: string,
    context?: Record<string, string>,
  ) {
    if (env.SENTRY_ENABLED !== 'true') {
      // eslint-disable-next-line no-console -- error debugging
      console.log(event, context);
    }

    Sentry.withScope(scope => {
      Sentry.setUser({ id: userId });
      scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
      Sentry.captureEvent({ message: event, user: { id: userId } });
    });
  }

  public logError(error: unknown, context?: Record<string, string>) {
    if (env.SENTRY_ENABLED !== 'true') {
      // eslint-disable-next-line no-console -- error debugging
      console.error(error, context);
    }
    if (error instanceof Error) {
      Sentry.withScope(scope => {
        scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
        Sentry.captureException(error);
      });
    } else {
      const errorMessage = String(error);
      Sentry.withScope(scope => {
        scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
        Sentry.captureMessage(errorMessage, 'error');
      });
    }
  }

  public setUser(id: string, email?: string, username?: string) {
    Sentry.setUser({
      id,
      email,
      username,
    });
  }

  public setExtra(key: string, value: string | number) {
    Sentry.setExtra(key, value);
  }

  public setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }
}

export const loggerService = LoggerService.getInstance();
loggerService.initialize();
