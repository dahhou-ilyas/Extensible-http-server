import type { Middleware, HttpRequest } from "../type/type";
import type { MiddlewareConfig } from "../middleware/types";

/**
 * Middleware execution group - determines the execution order category
 */
export enum MiddlewareGroup {
  /** Execute first - logging, request ID, etc. */
  MONITORING = "monitoring",
  /** Security-related - CORS, CSP, helmet, etc. */
  SECURITY = "security",
  /** Rate limiting, throttling */
  RATE_LIMITING = "rate_limiting",
  /** Authentication and authorization */
  AUTH = "auth",
  /** Request parsing, body parsing */
  PARSING = "parsing",
  /** Business logic middlewares */
  BUSINESS = "business",
  /** Execute last - error handling, response transformation */
  FINALIZATION = "finalization"
}

/**
 * Metadata describing a middleware
 */
export interface MiddlewareDescriptor<T extends MiddlewareConfig = MiddlewareConfig> {
  /** Unique identifier for the middleware */
  name: string;

  /** Human-readable description */
  description?: string;

  /** Middleware version */
  version?: string;

  /** Execution priority within its group (lower = earlier, 1-100) */
  priority: number;

  /** Middleware group for categorization */
  group: MiddlewareGroup;

  /** Factory function to create the middleware instance */
  factory: (config: T) => Middleware;

  /** Default configuration for this middleware */
  defaultConfig?: Partial<T>;

  /** Configuration validator (optional) */
  validateConfig?: (config: T) => { valid: boolean; errors?: string[] };
}

/**
 * Registry entry combining descriptor and runtime state
 */
interface RegistryEntry<T extends MiddlewareConfig = MiddlewareConfig> {
  descriptor: MiddlewareDescriptor<T>;
  enabled: boolean;
  config?: T;
}

/**
 * Middleware Registry - Singleton pattern
 * Manages dynamic registration and retrieval of middlewares
 */
export class MiddlewareRegistry {
  private static instance: MiddlewareRegistry;
  private registry: Map<string, RegistryEntry> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): MiddlewareRegistry {
    if (!MiddlewareRegistry.instance) {
      MiddlewareRegistry.instance = new MiddlewareRegistry();
    }
    return MiddlewareRegistry.instance;
  }

  /**
   * Register a middleware with its descriptor
   */
  public register<T extends MiddlewareConfig>(
    descriptor: MiddlewareDescriptor<T>
  ): void {
    if (this.registry.has(descriptor.name)) {
      console.warn(
        `Middleware "${descriptor.name}" is already registered. Overwriting...`
      );
    }

    this.registry.set(descriptor.name, {
      descriptor: descriptor as MiddlewareDescriptor,
      enabled: false,
    });

    console.log(
      `Registered middleware: ${descriptor.name} (${descriptor.group}, priority: ${descriptor.priority})`
    );
  }

  /**
   * Unregister a middleware by name
   */
  public unregister(name: string): boolean {
    const deleted = this.registry.delete(name);
    if (deleted) {
      console.log(`✓ Unregistered middleware: ${name}`);
    }
    return deleted;
  }

  /**
   * Get a middleware descriptor by name
   */
  public get(name: string): MiddlewareDescriptor | undefined {
    return this.registry.get(name)?.descriptor;
  }

  /**
   * Get all registered middleware descriptors
   */
  public getAll(): MiddlewareDescriptor[] {
    return Array.from(this.registry.values()).map((entry) => entry.descriptor);
  }

  /**
   * Get middlewares by group
   */
  public getByGroup(group: MiddlewareGroup): MiddlewareDescriptor[] {
    return this.getAll().filter((desc) => desc.group === group);
  }

  /**
   * Get all registered middleware names
   */
  public getNames(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Check if a middleware is registered
   */
  public has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get all middlewares sorted by execution order (group + priority)
   */
  public getSorted(): MiddlewareDescriptor[] {
    const groupOrder: Record<MiddlewareGroup, number> = {
      [MiddlewareGroup.MONITORING]: 1,
      [MiddlewareGroup.SECURITY]: 2,
      [MiddlewareGroup.RATE_LIMITING]: 3,
      [MiddlewareGroup.AUTH]: 4,
      [MiddlewareGroup.PARSING]: 5,
      [MiddlewareGroup.BUSINESS]: 6,
      [MiddlewareGroup.FINALIZATION]: 7,
    };

    return this.getAll().sort((a, b) => {
      const groupDiff = groupOrder[a.group] - groupOrder[b.group];
      if (groupDiff !== 0) return groupDiff;
      return a.priority - b.priority;
    });
  }

  /**
   * Clear all registered middlewares (useful for testing)
   */
  public clear(): void {
    this.registry.clear();
    console.log("✓ Registry cleared");
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    total: number;
    byGroup: Record<string, number>;
  } {
    const byGroup: Record<string, number> = {};

    this.getAll().forEach((desc) => {
      byGroup[desc.group] = (byGroup[desc.group] || 0) + 1;
    });

    return {
      total: this.registry.size,
      byGroup,
    };
  }

  /**
   * Validate a configuration against a middleware's validator
   */
  public validateConfig<T extends MiddlewareConfig>(
    name: string,
    config: T
  ): { valid: boolean; errors?: string[] } {
    const entry = this.registry.get(name);
    if (!entry) {
      return { valid: false, errors: [`Middleware "${name}" not found`] };
    }

    if (entry.descriptor.validateConfig) {
      return entry.descriptor.validateConfig(config as any);
    }

    return { valid: true };
  }

  /**
   * Get merged configuration (defaults + provided)
   */
  public getMergedConfig<T extends MiddlewareConfig>(
    name: string,
    config: T
  ): T {
    const entry = this.registry.get(name);
    if (!entry || !entry.descriptor.defaultConfig) {
      return config;
    }

    return {
      ...entry.descriptor.defaultConfig,
      ...config,
    } as T;
  }
}

/**
 * Global registry instance for convenience
 */
export const middlewareRegistry = MiddlewareRegistry.getInstance();
