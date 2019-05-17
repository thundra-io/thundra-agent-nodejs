import CountAwareSamplerConfig from './CountAwareSamplerConfig';
import TimeAwareSamplerConfig from './TimeAwareSamplerConfig';
import ErrorAwareSamplerConfig from './ErrorAwareSamplerConfig';
import Sampler from '../../opentracing/sampler/Sampler';
import CountAwareSampler from '../../opentracing/sampler/CountAwareSampler';
import TimeAwareSampler from '../../opentracing/sampler/TimeAwareSampler';
import ErrorAwareSampler from '../../opentracing/sampler/ErrorAwareSampler';
import Utils from '../utils/Utils';
import { envVariableKeys } from '../../Constants';
import ThundraLogger from '../../ThundraLogger';

class MetricSamplerConfig {
    countAwareSamplerConfig: CountAwareSamplerConfig;
    timeAwareSamplerConfig: TimeAwareSamplerConfig;
    errorAwareSamplerConfig: ErrorAwareSamplerConfig;
    customSampler: () => Sampler<null>;
    countAwareSampler: CountAwareSampler;
    timeAwareSampler: TimeAwareSampler;
    errorAwareSampler: ErrorAwareSampler;

    constructor(options: any) {
        options = options ? options : {};
        this.countAwareSamplerConfig = new CountAwareSamplerConfig(options.countAwareSamplerConfig);
        // Count Aware Sampler is enabled by default for metric plugin
        if (!options.countAwareSamplerConfig) {
            this.countAwareSamplerConfig.enabled = true;
        }

        this.timeAwareSamplerConfig = new TimeAwareSamplerConfig(options.timeAwareSamplerConfig);
        // Time Aware Sampler is enabled by default for metric plugin
        if (!options.timeAwareSamplerConfig) {
            this.timeAwareSamplerConfig.enabled = true;
        }
        this.errorAwareSamplerConfig = new ErrorAwareSamplerConfig(options.errorAwareSamplerConfig);
        this.customSampler = options.customSampler;

        if (this.countAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_METRIC_COUNT_AWARE_SAMPLER_ENABLE) === 'true') {
            try {
                const countFreq = Utils.getConfiguration(
                    envVariableKeys.THUNDRA_AGENT_METRIC_COUNT_AWARE_SAMPLER_COUNT_FREQ);
                if (countFreq) {
                    this.countAwareSamplerConfig.countFreq = parseInt(countFreq, 10);
                }
            } catch (err) {
                ThundraLogger.getInstance().error(err);
            }
            this.countAwareSampler = new CountAwareSampler(this.countAwareSamplerConfig.countFreq);

        }

        if (this.timeAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_METRIC_TIME_AWARE_SAMPLER_ENABLE) === 'true') {
            try {
                const timeFreq = Utils.getConfiguration(
                    envVariableKeys.THUNDRA_AGENT_METRIC_TIME_AWARE_SAMPLER_TIME_FREQ);

                if (timeFreq) {
                    this.timeAwareSamplerConfig.timeFreq = parseInt(timeFreq, 10);
                }
            } catch (err) {
                ThundraLogger.getInstance().error(err);
            }

            this.timeAwareSampler = new TimeAwareSampler(this.timeAwareSamplerConfig.timeFreq);
        }

        if (this.errorAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_METRIC_ERROR_AWARE_SAMPLER_ENABLE) === 'true') {
            this.errorAwareSampler = new ErrorAwareSampler();
        }
    }

    isSampled(): boolean {
        if (!this.countAwareSampler &&
            !this.timeAwareSampler &&
            !this.errorAwareSampler &&
            !this.customSampler) {
            return true;
        }

        let isSampled = false;

        if (this.countAwareSampler) {
            isSampled = isSampled || this.countAwareSampler.isSampled();
        }

        if (this.timeAwareSampler) {
            isSampled = isSampled || this.timeAwareSampler.isSampled();
        }

        if (this.errorAwareSampler) {
            isSampled = isSampled || this.errorAwareSampler.isSampled();
        }

        if (this.customSampler) {
            if (typeof this.customSampler === 'function' && this.customSampler().isSampled) {
                isSampled = isSampled || this.customSampler().isSampled();
            }
        }

        return isSampled;
    }

}

export default MetricSamplerConfig;
