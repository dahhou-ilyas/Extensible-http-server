import type {
  MiddlewareConfiguration
} from "../middleware/types";
import type { Middleware, HttpRequest, HttpResponse, NextFunction } from "../type/type";
import type { MiddlewareDescriptor } from "./MiddlewareRegistry";
import { middlewareRegistry } from "./MiddlewareRegistry";

export class MiddlewareLoader {

  static loadMiddlewares(config: MiddlewareConfiguration): Middleware[] {
    const middlewares: Middleware[] = [];
    const enabledDescriptors: Array<{
      descriptor: MiddlewareDescriptor;
      config: any;
      priority: number;
    }> = [];

    // Extract global config with defaults
    const globalConfig = {
      errorHandling: config.global?.errorHandling || 'continue',
      performanceMonitoring: config.global?.performanceMonitoring || false,
      maxExecutionTimeMs: config.global?.maxExecutionTimeMs || 5000,
    };

    console.log('\n Loading middlewares from registry...');

    // Get all registered middlewares from the registry
    const allDescriptors = middlewareRegistry.getSorted();

    if (allDescriptors.length === 0) {
      console.warn('No middlewares registered in the registry!');
      return middlewares;
    }

    // Filter enabled middlewares from config
    for (const descriptor of allDescriptors) {
      const middlewareConfig = config.middlewares[descriptor.name];

      if (!middlewareConfig || !middlewareConfig.enabled) {
        console.log(`Skipping disabled middleware: ${descriptor.name}`);
        continue;
      }

      // Merge with default config
      const fullConfig = {
        enabled: true,
        ...descriptor.defaultConfig,
        ...middlewareConfig.options,
      };

      // Validate configuration if validator exists
      const validation = middlewareRegistry.validateConfig(descriptor.name, fullConfig);
      if (!validation.valid) {
        console.error(
          `Configuration validation failed for "${descriptor.name}":`,
          validation.errors
        );
        continue;
      }

      // Use custom priority if provided, otherwise use descriptor's priority
      const priority = middlewareConfig.priority ?? descriptor.priority;

      enabledDescriptors.push({
        descriptor,
        config: fullConfig,
        priority,
      });

      console.log(
        `Enabled: ${descriptor.name} (${descriptor.group}, priority: ${priority})`
      );
    }

    // Re-sort by custom priorities if provided
    enabledDescriptors.sort((a, b) => a.priority - b.priority);

    // Create middleware instances with error handling and performance monitoring
    for (const { descriptor, config: mwConfig } of enabledDescriptors) {
      try {
        const middleware = descriptor.factory(mwConfig);

        // Wrap with error handling and monitoring if enabled
        const wrappedMiddleware = this.wrapMiddleware(
          descriptor.name,
          middleware,
          globalConfig
        );

        middlewares.push(wrappedMiddleware);
        console.log(`✅ Loaded: ${descriptor.name}`);
      } catch (error) {
        console.error(
          `Failed to create middleware "${descriptor.name}":`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return middlewares;
  }

  /**
   * Wrap middleware with error handling and performance monitoring
   */
  private static wrapMiddleware(
    name: string,
    middleware: Middleware,
    globalConfig: {
      errorHandling: 'continue' | 'stop';
      performanceMonitoring: boolean;
      maxExecutionTimeMs: number;
    }
  ): Middleware {
    return async (req: HttpRequest, res: HttpResponse, next: NextFunction) => {
      const startTime = globalConfig.performanceMonitoring ? Date.now() : 0;

      try {
        await middleware(req, res, next);

        // Performance monitoring
        if (globalConfig.performanceMonitoring) {
          const duration = Date.now() - startTime;
          if (duration > globalConfig.maxExecutionTimeMs) {
            console.warn(
              ` Middleware "${name}" took ${duration}ms (threshold: ${globalConfig.maxExecutionTimeMs}ms)`
            );
          }
        }
      } catch (error) {
        console.error(
          `Error in middleware "${name}":`,
          error instanceof Error ? error.message : error
        );

        if (globalConfig.errorHandling === 'stop') {
          throw error; // Re-throw to stop the chain
        } else {
          await next();
        }
      }
    };
  }

  /**
   * Register middlewares to the server
   */
  static registerMiddlewares(
    server: { registerMiddl: (middleware: Middleware) => void },
    config: MiddlewareConfiguration
  ): void {
    console.log('\n Middleware Registration Starting...');
    console.log('━'.repeat(50));

    const middlewares = this.loadMiddlewares(config);

    if (middlewares.length === 0) {
      console.warn(' No middlewares to register!');
      return;
    }

    console.log(`\n Registering ${middlewares.length} middleware(s) to server...`);

    let registered = 0;
    middlewares.forEach((middleware, index) => {
      try {
        server.registerMiddl(middleware);
        registered++;
      } catch (error) {
        console.error(
          `Failed to register middleware #${index + 1}:`,
          error instanceof Error ? error.message : error
        );
      }
    });

    console.log('━'.repeat(50));
    console.log(` Successfully registered ${registered}/${middlewares.length} middleware(s)\n`);
  }

  /**
   * Get middleware loading statistics
   */
  static getStats(): {
    registered: number;
    byGroup: Record<string, number>;
  } {
    const stats = middlewareRegistry.getStats();
    return {
      registered: stats.total,
      byGroup: stats.byGroup,
    };
  }
}
