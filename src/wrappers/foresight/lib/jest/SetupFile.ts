/**
 * default SetupFile
 * this file for obtain require on testsuite's context
 * will be added to setupFiles array on testsuite loading
 * will be run only one time for per testsuite
 */

const globalObj: any = global;

if (globalObj && globalObj.__THUNDRA__ && globalObj.__THUNDRA__.testScopeLoaded) {
    globalObj.__THUNDRA__.testScopeLoaded(require);
}
