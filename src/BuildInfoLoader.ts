const BuildInfo = require('../package.json');
class BuildInfoLoader {
    static getAgentVersion(): string {
        return BuildInfo.version;
    }
}

export default BuildInfoLoader;
