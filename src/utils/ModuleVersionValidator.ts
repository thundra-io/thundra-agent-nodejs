const semver = require('semver');
import * as fs from 'fs';

/**
 * Checks and validates module versions
 */
class ModuleVersionValidator {

    private static moduleMap: Map<string, string> = new Map<string, string>();

    private constructor() {
    }

    /**
     * Checks whether given module version is in valid ranges
     * @param basedir module base directory
     * @param versions valid version expression
     * @return {boolean} {@code true} if module version is valid, {@code false} otherwise
     */
    static validateModuleVersion(basedir: string, versions: string): boolean {
        try {
            if (basedir) {
                let jsonFile = ModuleVersionValidator.moduleMap.get(basedir);
                if (!jsonFile) {
                    const packageJSON = `${basedir}/package.json`;
                    jsonFile = fs.readFileSync(packageJSON, 'utf8');
                    ModuleVersionValidator.moduleMap.set(basedir, jsonFile);
                }
                const version = JSON.parse(jsonFile).version;
                return semver.satisfies(version, versions);
            }
            return false;
        } catch (err) {
            return false;
        }
    }

}

export default ModuleVersionValidator;
