import DurationAwareSamplerConfig from './DurationAwareSamplerConfig';
import ErrorAwareSamplerConfig from './ErrorAwareSamplerConfig';
import ThundraSpan from '../../opentracing/Span';
import Sampler from '../../opentracing/sampler/Sampler';
import DurationAwareSampler from '../../opentracing/sampler/DurationAwareSampler';
import ErrorAwareSampler from '../../opentracing/sampler/ErrorAwareSampler';
import CountAwareSamplerConfig from './CountAwareSamplerConfig';
import CountAwareSampler from '../../opentracing/sampler/CountAwareSampler';
import TimeAwareSamplerConfig from './TimeAwareSamplerConfig';
import TimeAwareSampler from '../../opentracing/sampler/TimeAwareSampler';
import Utils from '../utils/Utils';
import { envVariableKeys } from '../../Constants';
import ThundraLogger from '../../ThundraLogger';

class TraceSamplerConfig {
    durationAwareSamplerConfig: DurationAwareSamplerConfig;
    errorAwareSamplerConfig: ErrorAwareSamplerConfig;
    timeAwareSamplerConfig: TimeAwareSamplerConfig;
    countAwareSamplerConfig: CountAwareSamplerConfig;
    durationAwareSampler: DurationAwareSampler;
    errorAwareSampler: ErrorAwareSampler;
    countAwareSampler: CountAwareSampler;
    timeAwareSampler: TimeAwareSampler;
    customSampler: Sampler<ThundraSpan>;
    runCustomSamplerOnEachSpan: boolean;

    constructor(options: any) {
        options = options ? options : {};
        this.durationAwareSamplerConfig = new DurationAwareSamplerConfig(options.durationAwareSamplerConfig);
        this.errorAwareSamplerConfig = new ErrorAwareSamplerConfig(options.errorAwareSamplerConfig);
        this.countAwareSamplerConfig = new CountAwareSamplerConfig(options.countAwareSamplerConfig);
        this.timeAwareSamplerConfig = new TimeAwareSamplerConfig(options.timeAwareSamplerConfig);
        this.customSampler = options.customSampler;

        if (this.durationAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_TRACE_DURATION_AWARE_SAMPLER_ENABLE) === 'true') {
            this.durationAwareSampler = new DurationAwareSampler(this.durationAwareSamplerConfig.duration,
                this.durationAwareSamplerConfig.longerThan);
        }

        if (this.errorAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_TRACE_ERROR_AWARE_SAMPLER_ENABLE) === 'true') {
            this.errorAwareSampler = new ErrorAwareSampler();
        }

        if (this.countAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_TRACE_COUNT_AWARE_SAMPLER_ENABLE) === 'true') {
            try {
                const countFreq = Utils.getConfiguration(
                    envVariableKeys.THUNDRA_AGENT_TRACE_COUNT_AWARE_SAMPLER_COUNT_FREQ);

                if (countFreq) {
                    this.countAwareSamplerConfig.countFreq = parseInt(countFreq, 10);
                }
            } catch (err) {
                ThundraLogger.getInstance().error(err);
            }

            this.countAwareSampler = new CountAwareSampler(this.countAwareSamplerConfig.countFreq);
        }

        if (this.timeAwareSamplerConfig.enabled || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_TRACE_TIME_AWARE_SAMPLER_ENABLE) === 'true') {
            try {
                const timeFreq = Utils.getConfiguration(
                    envVariableKeys.THUNDRA_AGENT_TRACE_TIME_AWARE_SAMPLER_TIME_FREQ);

                if (timeFreq) {
                    this.timeAwareSamplerConfig.timeFreq = parseInt(timeFreq, 10);
                }
            } catch (err) {
                ThundraLogger.getInstance().error(err);
            }

            this.timeAwareSampler = new TimeAwareSampler(this.timeAwareSamplerConfig.timeFreq);
        }

        this.runCustomSamplerOnEachSpan = options.runCustomSamplerOnEachSpan
            ? options.runCustomSamplerOnEachSpan : false;
    }

    isSampled(span: ThundraSpan): boolean {
        let isSampled = false;

        if (!this.durationAwareSampler &&
            !this.errorAwareSampler &&
            !this.customSampler &&
            !this.countAwareSampler &&
            !this.timeAwareSampler) {
            isSampled = true;
        }

        if (this.durationAwareSampler || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_TRACE_DURATION_AWARE_SAMPLER_ENABLE) === 'true') {
            isSampled = isSampled || this.durationAwareSampler.isSampled(span);
        }

        if (this.errorAwareSampler || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_TRACE_ERROR_AWARE_SAMPLER_ENABLE) === 'true') {
            isSampled = isSampled || this.errorAwareSampler.isSampled();
        }

        if (this.countAwareSampler || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_TRACE_COUNT_AWARE_SAMPLER_ENABLE) === 'true') {
            isSampled = isSampled || this.countAwareSampler.isSampled();
        }

        if (this.timeAwareSampler || Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_TRACE_TIME_AWARE_SAMPLER_ENABLE) === 'true') {
            isSampled = isSampled || this.timeAwareSampler.isSampled();
        }

        if (this.customSampler) {
            if (this.runCustomSamplerOnEachSpan) {
                isSampled = true;
            } else {
                isSampled = isSampled || this.customSampler.isSampled(span);
            }
        }

        return isSampled;
    }
}

export default TraceSamplerConfig;
