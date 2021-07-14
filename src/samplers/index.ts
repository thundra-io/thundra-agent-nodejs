/**
 * Module entry point for samplers
 */

import CompositeSampler from './CompositeSampler';
import CountAwareSampler from './CountAwareSampler';
import DurationAwareSampler from './DurationAwareSampler';
import ErrorAwareSampler from './ErrorAwareSampler';
import TimeAwareSampler from './TimeAwareSampler';
import SpanAwareSampler from './SpanAwareSampler';
import { SamplerCompositionOperator } from './CompositeSampler';

export default {
    CompositeSampler,
    CountAwareSampler,
    DurationAwareSampler,
    ErrorAwareSampler,
    TimeAwareSampler,
    SamplerCompositionOperator,
    SpanAwareSampler,
};
