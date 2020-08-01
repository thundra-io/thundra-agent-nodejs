const semver = require('semver');
import * as fs from 'fs';

class ModuleVersionValidator {
    moduleMap: Map<string, string>;

    constructor() {
        this.moduleMap = new Map<string, string>();
    }

    validateModuleVersion(basedir: string, versions: string): boolean {
        try {
            if (basedir) {
                let jsonFile = this.moduleMap.get(basedir);
                if (!jsonFile) {
                    const packageJSON = `${basedir}/package.json`;
                    jsonFile = fs.readFileSync(packageJSON, 'utf8');
                    this.moduleMap.set(basedir, jsonFile);
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
