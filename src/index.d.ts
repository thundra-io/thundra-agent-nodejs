/**
 * Type definitions for @thundra/core v2.12.4
 *
 * Project:     Thundra Lambda Node.js Agent
 * Author:      Oguzhan Ozdemir <oguzhan.ozdemir@thundra.io>
 */

declare module '@thundra/core' {
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
  export function createLambdaWrapper(options?: any): (f: Function) => WrappedFunction;

  /**
   * Wraps the given original AWS Lambda handler
   * @param handler the original AWS Lambda handler to be wrapped
   * @return the wrapped handler
   */
  export function lambdaWrapper(handler: any): (f: Function) => WrappedFunction;

  /**
   * Creates {@link Logger} with given options
   * @param options the options (configs, etc ...) to initialize logger to be created
   */
  export function createLogger(options: any): Logger;

  /**
   * Creates an Express.js middleware to integrate Thundra
   * @return the Thundra middleware
   */
  export function expressMW(): void;

  /**
   * Adds given log listener
   * @param listener the log listener to be added
   */
  export function addLogListener(listener: any): void;

  /**
   * Gets the tracer
   * @return {Tracer} the tracer
   */
  export function tracer(): ThundraTracer;

  /**
   * Loads and returns the user AWS Lambda handler
   * @return the loaded user AWS Lambda handler
   */
  export function loadUserHandler(): any;

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

  export = createLambdaWrapper;
}
