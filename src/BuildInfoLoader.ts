const BuildInfo = require('./BuildInfo');
class BuildInfoLoader {
    static getAgentVersion(): string {
        return BuildInfo.version;
    }
}

export default BuildInfoLoader;
