/**
 * default SetupFile
 * this file for obtain require on testsuite's context
 * will be added to setupFiles array on testsuite loading
 * will be run only one time for per testsuite
 */

const globalObj: any = global;

if (globalObj.loadThundraTestModules) {
    globalObj.loadThundraTestModules(require);
}
