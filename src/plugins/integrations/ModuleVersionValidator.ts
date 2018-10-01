const semver = require('semver');

class ModuleVersionValidator {
    validateModuleVersion(basedir: string, versions: string): boolean {
        try {
            if (basedir) {
                const packageJSON = `${basedir}/package.json`;
                const version = require(packageJSON).version;
                return semver.satisfies(version, versions);
            }
            return false;
        } catch (err) {
            return false;
        }
    }
}

export default ModuleVersionValidator;
