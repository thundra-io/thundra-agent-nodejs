/**
 * export utils
 */
export * from './utils';

/**
 * export other internal Thundra API modules here ...
 */

/**
 * Resolves given module path as relative to Thundra root path
 *
 * @param modulePath the module path to be resolved
 * @return {string} the resolved path as relative to Thundra root path
 */
export function resolveFromRoot(modulePath: string) {
    return require.resolve(modulePath);
}
