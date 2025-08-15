import * as Sentry from '@sentry/react';

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
      enabled: import.meta.env.VITE_SENTRY_ENABLED === 'true',
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.replayIntegration(),
        // Sentry.feedbackIntegration({
        //   colorScheme: 'system',
        // }),
        Sentry.browserTracingIntegration(),
        Sentry.browserProfilingIntegration(),
      ],
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });

    this.initialized = true;
  }

  public logError(error: unknown, context?: Record<string, string>) {
    if (import.meta.env.VITE_SENTRY_ENABLED !== 'true') {
      console.error(error, context);
      return;
    }

    if (error instanceof Error) {
      Sentry.withScope(scope => {
        scope.setExtras({
          ...context,
          environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
        });
        Sentry.captureException(error);
      });
    } else {
      const errorMessage = String(error);
      Sentry.withScope(scope => {
        scope.setExtras({
          ...context,
          environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
        });
        Sentry.captureMessage(errorMessage, 'error');
      });
    }
  }

  public logWarning(message: string, context?: Record<string, string>) {
    if (import.meta.env.VITE_SENTRY_ENABLED !== 'true') {
      console.warn(message, context);
      return;
    }

    Sentry.withScope(scope => {
      scope.setExtras({
        ...context,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
      });
      Sentry.captureMessage(message, 'warning');
    });
  }

  public logInfo(message: string, context?: Record<string, string>) {
    if (import.meta.env.VITE_SENTRY_ENABLED !== 'true') {
      console.info(message, context);
      return;
    }

    Sentry.withScope(scope => {
      scope.setExtras({
        ...context,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
      });
      Sentry.captureMessage(message, 'info');
    });
  }

  public setUser(id: string, email?: string, username?: string) {
    Sentry.setUser({
      id,
      email: email ?? 'NA',
      username: username ?? 'NA',
    });
  }

  public setExtra(key: string, value: string | number) {
    Sentry.setExtra(key, value);
  }

  public setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }
}

// Export a singleton instance
export const logger = LoggerService.getInstance();
