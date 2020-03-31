class ConfigProvider {

    private static configs: Map<string, any> = new Map<string, any>();

    private static generateEnvVarNames(envVarName: string): Set<string> {
        envVarName = envVarName.replace('.', '_');
        const envVarNames: Set<string> = new Set();
        envVarNames.add(envVarName);
        envVarNames.add(envVarName.toLowerCase());
        envVarNames.add(envVarName.toUpperCase());
        return envVarNames;
    }

    private static getAnyFromEnvVar(envVarNames: Set<string>): string {
        for (let envVarName of envVarNames) {
            if (process.env[envVarName]) {
                return process.env[envVarName];
            }
        }
        return null;
    }

    private static traverseConfigObject(obj: any, path: string): void {
        Object.keys(obj).forEach((propName: string) => {
            const propVal: any = obj[propName];
            var propPath: string = path + '.' + propName;
            if (propVal instanceof Object) {
                ConfigProvider.traverseConfigObject(propVal, propPath);
            } else {
                if (!propPath.startsWith('thundra.agent.')) {
                    propPath = 'thundra.agent.' + propPath;
                }
                ConfigProvider.configs.set(propPath, propVal);
            }
        })
    }

    static init(options?: any, configFilePath?: string): void {
        // 1. Fill configs from file if it is given
        try {
            if (configFilePath) {
                const configJson: any = require(configFilePath);
                Object.keys(configJson).forEach((configName: string) => {
                    const configVal: any = configJson[configName];
                    ConfigProvider.traverseConfigObject(configVal, configName);
                })
            }
        } catch (e) {
        }

        // 2. Fill configs from options if it is given
        if (options) {
            Object.keys(options).forEach((optionName: string) => {
                const optionVal: any = options[optionName];
                ConfigProvider.traverseConfigObject(optionVal, optionName);
            })
        }

        // 3. Fill configs from environment variables
        Object.keys(process.env).forEach((envVarName: string) => {
            if (envVarName.toUpperCase().startsWith('THUNDRA_AGENT_')) {
                const envVarValue: string = process.env[envVarName];
                envVarName = envVarName.toLowerCase().replace(/_/g, ".");
                ConfigProvider.configs.set(envVarName, envVarValue);
            }
        });

        // 4. Add non-lambda aliases of configs
        for (var entry of ConfigProvider.configs.entries()) {
            const configName: string = entry[0];
            const configValue: any = entry[1];
            if (configName.startsWith("thundra.agent.lambda.")) {
                const aliasConfigName: string = "thundra.agent." + configName.substring("thundra.agent.lambda.".length);
                ConfigProvider.configs.set(aliasConfigName, configValue);
            }
        }
    }

    static clear(): void {
        ConfigProvider.configs.clear();
    }

    static getConfiguration(key: string, defaultValue?: any): any {
        return ConfigProvider.configs.get(key);
    }

    static getNumericConfiguration(key: string, defaultValue?: number): number {
        return parseInt(ConfigProvider.getConfiguration(key, defaultValue), 10);
    }

}

export default ConfigProvider;