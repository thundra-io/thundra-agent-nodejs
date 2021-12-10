import BasePluginConfig from './BasePluginConfig';
import Sampler from '../../samplers/Sampler';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import ErrorAwareSampler from '../../samplers/ErrorAwareSampler';

/**
 * Configures invocation plugin/support
 */
class InvocationConfig extends BasePluginConfig {
    sampler: Sampler<any>;
    requestTags: string[];
    responseTags: string[];

    constructor(options: any) {
        super(true);

        options = options ? options : {};
        this.sampler = options.sampler;

        if (!this.sampler) {
            const sampleOnError: boolean = ConfigProvider.get<boolean>(
                ConfigNames.THUNDRA_INVOCATION_SAMPLE_ONERROR, false);
            if (sampleOnError) {
                this.sampler = new ErrorAwareSampler();
            }
        }

        this.requestTags = options.requestTags;
        if (!this.requestTags) {
            const requestTagsConfig: string = ConfigProvider.get<string>(
                ConfigNames.THUNDRA_INVOCATION_REQUEST_TAGS);
            if (requestTagsConfig) {
                this.requestTags = requestTagsConfig.split(',').map((tag) => tag.trim());
            }
        }

        this.responseTags = options.responseTags;
        if (!this.responseTags) {
            const responseTagsConfig: string = ConfigProvider.get<string>(
                ConfigNames.THUNDRA_INVOCATION_RESPONSE_TAGS);
            if (responseTagsConfig) {
                this.responseTags = responseTagsConfig.split(',').map((tag) => tag.trim());
            }
        }
    }

}

export default InvocationConfig;
