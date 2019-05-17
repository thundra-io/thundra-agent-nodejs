import ErrorAwareSamplerConfig from './ErrorAwareSamplerConfig';
import ErrorAwareSampler from '../../opentracing/sampler/ErrorAwareSampler';
import CountAwareSampler from '../../opentracing/sampler/CountAwareSampler';
import CountAwareSamplerConfig from './CountAwareSamplerConfig';
import TimeAwareSamplerConfig from './TimeAwareSamplerConfig';
import TimeAwareSampler from '../../opentracing/sampler/TimeAwareSampler';
import Utils from '../utils/Utils';
import { envVariableKeys } from '../../Constants';
import ThundraConfig from './ThundraConfig';
import ThundraLogger from '../../ThundraLogger';
const koalas = require('koalas');

class LogSamplerConfig {
    errorAwareSamplerConfig: ErrorAwareSamplerConfig;
    timeAwareSamplerConfig: TimeAwareSamplerConfig;
    countAwareSamplerConfig: CountAwareSamplerConfig;
    errorAwareSampler: ErrorAwareSampler;
    countAwareSampler: CountAwareSampler;
    timeAwareSampler: TimeAwareSampler;

    constructor(options: any) {
        options = options ? options : {};
        this.errorAwareSamplerConfig = new ErrorAwareSamplerConfig(options.errorAwareSamplerConfig);
        this.countAwareSamplerConfig = new CountAwareSamplerConfig(options.countAwareSamplerConfig);
        this.timeAwareSamplerConfig = new TimeAwareSamplerConfig(options.timeAwareSamplerConfig);

        if (this.errorAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_LOG_ERROR_AWARE_SAMPLER_ENABLE) === 'true') {
            this.errorAwareSampler = new ErrorAwareSampler();
        }

        if (this.countAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_LOG_COUNT_AWARE_SAMPLER_ENABLE) === 'true') {
            try {
                const countFreq = Utils.getConfiguration(
                    envVariableKeys.THUNDRA_AGENT_LOG_COUNT_AWARE_SAMPLER_COUNT_FREQ);

                if (countFreq) {
                    this.countAwareSamplerConfig.countFreq = parseInt(countFreq, 10);
                }
            } catch (err) {
                ThundraLogger.getInstance().error(err);
            }

            this.countAwareSampler = new CountAwareSampler(this.countAwareSamplerConfig.countFreq);
        }

        if (this.timeAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_LOG_TIME_AWARE_SAMPLER_ENABLE) === 'true') {

            try {
                const timeFreq = Utils.getConfiguration(
                    envVariableKeys.THUNDRA_AGENT_LOG_TIME_AWARE_SAMPLER_TIME_FREQ);

                if (timeFreq) {
                    this.timeAwareSamplerConfig.timeFreq = parseInt(timeFreq, 10);
                }
            } catch (err) {
                ThundraLogger.getInstance().error(err);
            }

            this.timeAwareSampler = new TimeAwareSampler(this.timeAwareSamplerConfig.timeFreq);
        }
    }

    isSampled(): boolean {
        let isSampled = false;

        if (!this.errorAwareSampler &&
            !this.countAwareSampler &&
            !this.timeAwareSampler) {
            isSampled = true;
        }

        if (this.errorAwareSampler) {
            isSampled = isSampled || this.errorAwareSampler.isSampled();
        }

        if (this.countAwareSampler) {
            isSampled = isSampled || this.countAwareSampler.isSampled();
        }

        if (this.timeAwareSampler) {
            isSampled = isSampled || this.timeAwareSampler.isSampled();
        }

        return isSampled;
    }
}

export default LogSamplerConfig;
