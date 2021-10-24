import ForesightWrapperUtils from './ForesightWrapperUtils';
import PluginContext from '../../plugins/PluginContext';
import ExecutionContext from '../../context/ExecutionContext';

import * as EnvironmentSupport from './environment/EnvironmentSupport';

/**
 * Start invocation process
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function startInvocation(pluginContext: PluginContext, execContext: ExecutionContext) {
    execContext.invocationData = ForesightWrapperUtils.createInvocationData(execContext, pluginContext);

    const additionalTags: any = execContext.getAdditionalStartTags();
    if (additionalTags) {
        Object.keys(additionalTags).forEach((tag) => {
            execContext.invocationData.tags[tag] = additionalTags[tag];
        });
    }
}

/**
 * Finish invocation process
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function finishInvocation(pluginContext: PluginContext, execContext: ExecutionContext) {
    const { invocationData} = execContext;

    ForesightWrapperUtils.finishInvocationData(execContext, pluginContext);

    const additionalTags: any = execContext.getAdditionalFinishTags();
    if (additionalTags) {
        Object.keys(additionalTags).forEach((tag) => {
            invocationData.tags[tag] = additionalTags[tag];
        });
    }

    EnvironmentSupport.tagInvocation(invocationData);
}

/**
 * Start trace
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function startTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    ForesightWrapperUtils.startTrace(pluginContext, execContext);

    const { rootSpan } = execContext;

    const additionalTags: any = execContext.getAdditionalStartTags();
    if (additionalTags) {
        Object.keys(additionalTags).forEach((tag) => {
            rootSpan.tags[tag] = additionalTags[tag];
        });
    }

    EnvironmentSupport.tagSpan(rootSpan);
}

/**
 * Finish trace
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    ForesightWrapperUtils.finishTrace(pluginContext, execContext);

    const { rootSpan } = execContext;

    const additionalTags: any = execContext.getAdditionalFinishTags();
    if (additionalTags) {
        Object.keys(additionalTags).forEach((tag) => {
            rootSpan.tags[tag] = additionalTags[tag];
        });
    }
}
