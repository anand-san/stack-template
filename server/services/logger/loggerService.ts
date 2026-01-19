/**
 * Logger Service with Lazy-Loaded Sentry
 * Only imports @sentry/bun when SENTRY_ENABLED=true to save ~30-50MB memory
 */
import env from '../../env';

// Lazy-loaded Sentry module
let Sentry: typeof import('@sentry/bun') | null = null;

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

  public async initialize() {
    if (this.initialized) {
      return;
    }

    this.sentryEnabled = env.SENTRY_ENABLED === 'true';

    // Only load Sentry if enabled - saves ~30-50MB when disabled
    if (this.sentryEnabled) {
      Sentry = await import('@sentry/bun');
      Sentry.init({
        enabled: true,
        dsn: env.SENTRY_DSN,
        tracesSampleRate: 1.0,
      });
    }

    this.initialized = true;
  }

  public logInfo(event: string, context?: Record<string, string>) {
    if (!this.sentryEnabled || !Sentry) {
      // eslint-disable-next-line no-console -- error debugging
      console.info(event, context);
      return;
    }
    Sentry.withScope(scope => {
      scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
      Sentry!.captureMessage(event, 'info');
    });
  }

  public logWarning(event: string, context?: Record<string, string>) {
    if (!this.sentryEnabled || !Sentry) {
      // eslint-disable-next-line no-console -- error debugging
      console.warn(event, context);
      return;
    }
    Sentry.withScope(scope => {
      scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
      Sentry!.captureMessage(event, 'warning');
    });
  }

  public logUserEvent(
    event: string,
    userId: string,
    context?: Record<string, string>,
  ) {
    if (!this.sentryEnabled || !Sentry) {
      // eslint-disable-next-line no-console -- error debugging
      console.log(event, context);
      return;
    }

    Sentry.withScope(scope => {
      Sentry!.setUser({ id: userId });
      scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
      Sentry!.captureEvent({ message: event, user: { id: userId } });
    });
  }

  public logError(error: unknown, context?: Record<string, string>) {
    if (!this.sentryEnabled || !Sentry) {
      // eslint-disable-next-line no-console -- error debugging
      console.error(error, context);
      return;
    }
    if (error instanceof Error) {
      Sentry.withScope(scope => {
        scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
        Sentry!.captureException(error);
      });
    } else {
      const errorMessage = String(error);
      Sentry.withScope(scope => {
        scope.setExtras({ ...context, environment: env.SENTRY_ENVIRONMENT });
        Sentry!.captureMessage(errorMessage, 'error');
      });
    }
  }

  public setUser(id: string, email?: string, username?: string) {
    if (!this.sentryEnabled || !Sentry) return;
    Sentry.setUser({
      id,
      email,
      username,
    });
  }

  public setExtra(key: string, value: string | number) {
    if (!this.sentryEnabled || !Sentry) return;
    Sentry.setExtra(key, value);
  }

  public setTag(key: string, value: string) {
    if (!this.sentryEnabled || !Sentry) return;
    Sentry.setTag(key, value);
  }
}

export const loggerService = LoggerService.getInstance();

// Initialize asynchronously - the first await will complete the initialization
void loggerService.initialize();
