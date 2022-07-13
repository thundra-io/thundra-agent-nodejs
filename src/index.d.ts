/**
 * Type definitions for @thundra/core
 *
 * Project:     Thundra Lambda Node.js Agent
 * Author:      Oguzhan Ozdemir <oguzhan.ozdemir@thundra.io>
 */

declare module '@thundra/core' {
  import 'aws-lambda'

  /**
   * Initialized agent with given options (configs, etc ...)
   * @param options the options (configs, etc ...) to initialize agent
   */
  export function init(options?: any): void;

  /**
   * Creates {@link LambdaWrapper} to wrap the original AWS Lambda handler
   * @param options the options (configs, etc ...) to initialize agent
   * @return {LambdaWrapper} the AWS Lambda wrapper to wrap the original handler
   */
  export default function createLambdaWrapper(options?: any): <F extends Function>(f: F) => F;

  /**
   * Wraps the given original AWS Lambda handler
   * @param handler the original AWS Lambda handler to be wrapped
   * @return the wrapped handler
   */
  export function lambdaWrapper<F extends Function>(f: F): F;

  /**
   * Creates {@link Logger} with given options
   * @param options the options (configs, etc ...) to initialize logger to be created
   */
  export function createLogger(options: any): Logger;

  /**
   * Gets the tracer
   * @return {Tracer} the tracer
   */
  export function tracer(): ThundraTracer;

  /**
   * Instruments given module if it is supported
   * @param moduleName {string} name of the module to be instrumented
   * @param module the module to be instrumented
   * @return {boolean} {@code true} if the given has been instrumented,
   *                   {@code false} otherwise
   */
  export function instrumentModule(moduleName: string, module: any): boolean;

  /**
   * Sets the tag
   * @param {string} name the tag name
   * @param value the tag value
   */
  export function setTag(name: string, value: any): void;

  /**
   * Sets the tags
   * @param tags the tags to be set
   */
  export function setTags(tagsToSet: { [name: string]: any }): void;

  /**
   * Gets the tag
   * @param {string} name the tag name
   * @return the tag value
   */
  export function getTag(name: string): any;

  /**
   * Gets the tags
   * @return the tags
   */
  export function getTags(): any;

  /**
   * Removes the tag
   * @param {string} name the tag name
   */
  export function removeTag(name: string): void;

  /**
   * Removes the tags
   */
  export function removeTags(): void;

  /**
   * Checks whether invocation has error
   * @return {boolean} {@code true} if invocation has error, {@code false} otherwise
   */
  export function hasError(): boolean;

  /**
   * Sets the {@link Error} to the invocation
   * @param {Error} error the {@link Error} to be set
   */
  export function setError(error: any): void;

  /**
   * Gets the {@link Error} to the invocation
   * @return {Error} the {@link Error} of the invocation
   */
  export function getError(): Error;

  /**
   * Clears the invocation error
   */
  export function clearError(): void;

  /**
   * Gets the invocation URL on Thundra Console
   * @return {string} the invocation URL on Thundra Console
   */
  export function getConsoleInvocationURL(): string;

  /**
   * Wraps the given function
   * @param func the original function to be wrapped
   * @return wrapped function
   */
  export function nodeWrapper<T extends (...args: any[]) => any>(func: T): T;

  /**
    * Thundra's logger implementation
    */
  export class Logger {
    options: any;
    loggerName: any;
    logLevel: any;
    levels: any;
    constructor(options: {
      loggerName: any;
    });
    /**
     * Reports the given log
     * @param level the log level
     * @param args the log arguments
     */
    reportLog(level: any, args: any): void;
    /**
     * Logs in {@code TRACE} level
     * @param args the log arguments
     */
    trace(...args: any[]): void;
    /**
     * Logs in {@code DEBUG} level
     * @param args the log arguments
     */
    debug(...args: any[]): void;
    /**
     * Logs in {@code INFO} level
     * @param args the log arguments
     */
    info(...args: any[]): void;
    /**
     * Logs in {@code WARN} level
     * @param args the log arguments
     */
    warn(...args: any[]): void;
    /**
     * Logs in {@code ERROR} level
     * @param args the log arguments
     */
    error(...args: any[]): void;
    /**
     * Logs in {@code FATAL} level
     * @param args the log arguments
     */
    fatal(...args: any[]): void;
    /**
     * Logs directly by given arguments
     * @param args the log arguments
     */
    log(...args: any[]): void;
    /**
     * Destroys plugin
     */
    destroy(): void;
  }

  /**
   * Wraps the original AWS Lambda handler to hook into AWS Lambda invocation cycle
   */
  export interface WrappedFunction extends Function {
    thundraWrapped?: boolean;
  }

  /**
   * Thundra's {@link Tracer} implementation
   */
  export class ThundraTracer extends Tracer { }

  /**
   * Tracer is the entry-point between the instrumentation API and the tracing
   * implementation.
   *
   * The default object acts as a no-op implementation.
   *
   * Note to implementators: derived classes can choose to directly implement the
   * methods in the "OpenTracing API methods" section, or optionally the subset of
   * underscore-prefixed methods to pick up the argument checking and handling
   * automatically from the base class.
   */
  export class Tracer { }
}
