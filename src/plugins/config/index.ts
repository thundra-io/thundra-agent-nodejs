/**
 * Module entry point for publicly supported APIs
 */

import LogConfig from './LogConfig';
import ThundraConfig from './ThundraConfig';
import TraceConfig from './TraceConfig';
import MetricConfig from './MetricConfig';
import InvocationConfig from './InvocationConfig';
import IntegrationConfig from './IntegrationConfig';
import { TraceableConfig } from '@thundra/instrumenter';

export default {
    ThundraConfig,
    TraceConfig,
    MetricConfig,
    InvocationConfig,
    LogConfig,
    TraceableConfig,
    IntegrationConfig,
};
