import ConfigMetadata from './ConfigMetadata';

class ConfigProvider {

    private static configs: {[key: string]: any} = {};

    static init(options?: any, configFilePath?: string): void {
        ConfigProvider.clear();

        // 1. Fill configs from file if it is given
        try {
            if (configFilePath) {
                const configJson: any = require(configFilePath);
                Object.keys(configJson).forEach((configName: string) => {
                    const configVal: any = configJson[configName];
                    ConfigProvider.traverseConfigObject(configVal, configName);
                });
            }
        } catch (e) { /* do nothing */ }

        // 2. Fill configs from options if it is given
        if (options) {
            Object.keys(options).forEach((optionName: string) => {
                const optionVal: any = options[optionName];
                ConfigProvider.traverseConfigObject(optionVal, optionName);
            });
        }

        // 3. Fill configs from environment variables
        Object.keys(process.env).forEach((envVarName: string) => {
            if (envVarName.toUpperCase().startsWith('THUNDRA_')) {
                const envVarValue: string = process.env[envVarName];
                envVarName = ConfigProvider.envVarToConfigName(envVarName);
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
        // tslint:disable-next-line:triple-equals
        if (value != undefined) { // if not null or undefined
            return value;
        } else if (defaultValue !== undefined) { // if user passes null as defaultValue, return null
            return defaultValue;
        } else if (ConfigMetadata[key]) {
            return ConfigMetadata[key].defaultValue as T;
        } else {
            return undefined;
        }
    }

    static set(key: string, value: any): void {
        const type = ConfigMetadata[key] ? ConfigMetadata[key].type : 'any';
        ConfigProvider.configs[key] = this.parse(value, type);
    }

    static configNameToEnvVar(configName: string): string {
        return configName.toUpperCase().replace(/\./g, '_');
    }

    static envVarToConfigName(envVarName: string): string {
        return envVarName.toLowerCase().replace(/_/g, '.');
    }

    static setAsEnvVar(configName: string, configValue: any): void {
        const envVarKey = ConfigProvider.configNameToEnvVar(configName);
        process.env[envVarKey] = configValue;
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
        if (!value) { return value; }
        switch (type) {
            case 'string': return String(value);
            case 'number': return Number(value);
            case 'boolean': return (typeof value === 'string'
                ? (value.toLowerCase() === 'true' ? true : false)
                : Boolean(value));
            default: return value;
        }
    }

}

export default ConfigProvider;
