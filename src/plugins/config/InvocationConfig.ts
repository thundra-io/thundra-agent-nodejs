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
    }

}

export default InvocationConfig;
