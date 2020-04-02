import ConfigMetadata from './ConfigMetadata';

class ConfigProvider {

    private static configs: {[key: string]: any} = {};

    private static generateEnvVarNames(envVarName: string): Set<string> {
        envVarName = envVarName.replace('.', '_');
        const envVarNames: Set<string> = new Set();
        envVarNames.add(envVarName);
        envVarNames.add(envVarName.toLowerCase());
        envVarNames.add(envVarName.toUpperCase());
        return envVarNames;
    }

    private static getAnyFromEnvVar(envVarNames: Set<string>): string {
        for (const envVarName of envVarNames) {
            if (process.env[envVarName]) {
                return process.env[envVarName];
            }
        }
        return null;
    }

    private static traverseConfigObject(obj: any, path: string): void {
        Object.keys(obj).forEach((propName: string) => {
            const propVal: any = obj[propName];
            let propPath: string = path + '.' + propName;
            if (propVal instanceof Object) {
                ConfigProvider.traverseConfigObject(propVal, propPath);
            } else {
                if (!propPath.startsWith('thundra.agent.')) {
                    propPath = 'thundra.agent.' + propPath;
                }
                propPath = propPath.toLowerCase();
                const propType = ConfigMetadata[propPath] ? ConfigMetadata[propPath].type : 'any';
                ConfigProvider.configs[propPath] = this.parse(propVal, propType);
            }
        });
    }

    private static parse(value: any, type: string): any {
        if (value == undefined) {
            return value;
        }
        switch (type) {
            case 'string': return String(value);
            case 'number': return Number(value);
            case 'boolean': return Boolean(value);
            default: return value;
        }
    }

    static init(options?: any, configFilePath?: string): void {
        // 1. Fill configs from file if it is given
        try {
            if (configFilePath) {
                const configJson: any = require(configFilePath);
                Object.keys(configJson).forEach((configName: string) => {
                    const configVal: any = configJson[configName];
                    ConfigProvider.traverseConfigObject(configVal, configName);
                });
            }
        } catch (e) {
        }

        // 2. Fill configs from options if it is given
        if (options) {
            Object.keys(options).forEach((optionName: string) => {
                const optionVal: any = options[optionName];
                ConfigProvider.traverseConfigObject(optionVal, optionName);
            });
        }

        // 3. Fill configs from environment variables
        Object.keys(process.env).forEach((envVarName: string) => {
            if (envVarName.toUpperCase().startsWith('THUNDRA_AGENT_')) {
                const envVarValue: string = process.env[envVarName];
                envVarName = envVarName.toLowerCase().replace(/_/g, '.');
                const envVarType = ConfigMetadata[envVarName] ? ConfigMetadata[envVarName].type : 'any';
                ConfigProvider.configs[envVarName] = this.parse(envVarValue, envVarType);
            }
        });

        // 4. Add non-lambda aliases of configs
        for (const key of Object.keys(ConfigProvider.configs)) {
            const configName: string = key;
            const configValue: any = ConfigProvider.configs[key];
            if (configName.startsWith('thundra.agent.lambda.')) {
                const aliasConfigName: string = 'thundra.agent.' + configName.substring('thundra.agent.lambda.'.length);
                ConfigProvider.configs[aliasConfigName] = configValue;
            }
        }
    }

    static clear(): void {
        Object.keys(ConfigProvider.configs).forEach((key) => delete ConfigProvider.configs[key]);
    }

    static names(): string[] {
        return Object.keys(ConfigProvider.configs);
    }

    static values(): any[] {
        return Object.keys(ConfigProvider.configs).map((key) => ConfigProvider.configs[key]);
    }

    static get<T>(key: string, defaultValue?: T): T {
        const value: T = ConfigProvider.configs[key];
        if (value != undefined) {
            return value;
        } else if (defaultValue !== undefined) {
            return defaultValue;
        } else if (ConfigMetadata[key]) {
            return ConfigMetadata[key].defaultValue as T;
        } else {
            return undefined;
        }
    }

}

export default ConfigProvider;
