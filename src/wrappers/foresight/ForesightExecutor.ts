import ForesightWrapperUtils from './ForesightWrapperUtils';
import Utils from '../../utils/Utils';
import { HttpTags, TriggerHeaderTags, SpanTags } from '../../Constants';
import PluginContext from '../../plugins/PluginContext';
import ExecutionContext from '../../context/ExecutionContext';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import InvocationSupport from '../../plugins/support/InvocationSupport';

import * as EnvironmentSupport from './environment/EnvironmentSupport';
import TestSuiteExecutionContext from './model/TestSuiteExecutionContext';
import * as TestRunnerSupport from './TestRunnerSupport';
import TestCaseExecutionContext from './model/TestCaseExecutionContext';

export function startInvocation(pluginContext: PluginContext, execContext: ExecutionContext) {
    console.log('startInvocation');

    execContext.invocationData = ForesightWrapperUtils.createInvocationData(execContext, pluginContext);

    console.log('additionalTags1');
    const additionalTags: any = execContext.getAdditionalStartTags();
    if (additionalTags) {

        Object.keys(additionalTags).forEach(tag => {
            execContext.invocationData.tags[tag] = additionalTags[tag];
        })
    }

    console.log('additionalTags2');
}

/**
 * Finish invocation process
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function finishInvocation(pluginContext: PluginContext, execContext: ExecutionContext) {

    console.log('finishInvocation');

    const { invocationData} = execContext;

    ForesightWrapperUtils.finishInvocationData(execContext, pluginContext);

    const testRunScope = TestRunnerSupport.testRunScope;

    invocationData.tags['test.run.id'] = testRunScope.id;
    invocationData.tags['test.run.task.id'] = testRunScope.taskId;

    console.log('additionalTags1');
    const additionalTags: any = execContext.getAdditionalFinishTags();
    if (additionalTags) {

        Object.keys(additionalTags).forEach(tag => {
            invocationData.tags[tag] = additionalTags[tag];
        })
    }

    console.log('additionalTags2');

    EnvironmentSupport.tagInvocation(invocationData);
}

export function startTrace(pluginContext: PluginContext, execContext: ExecutionContext) {

    ForesightWrapperUtils.startTrace(pluginContext, execContext);

    const { rootSpan } = execContext;
    
    console.log('startTrace');

    const testRunScope = TestRunnerSupport.testRunScope;

    rootSpan.tags['test.run.id'] = testRunScope.id;
    rootSpan.tags['test.run.task.id'] = testRunScope.taskId;

    const additionalTags: any = execContext.getAdditionalStartTags();
    if (additionalTags) {

        Object.keys(additionalTags).forEach(tag => {
            rootSpan.tags[tag] = additionalTags[tag];
        })
    }

    EnvironmentSupport.tagSpan(rootSpan);

    console.log('startTrace 2');

    // const executionContextType = execContext.constructor.name;
    // const traceExecution = traceExecutionMap[executionContextType];

    // if (traceExecution != null){
    //     traceExecution.start(execContext);
    // }

    // todo: set tags ?  
}

/**
* Finish trace
* @param {PluginContext} pluginContext
* @param {ExecutionContext} execContext
*/
export function finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    ForesightWrapperUtils.finishTrace(pluginContext, execContext);
    
    const {
        rootSpan,
        response,
        request,
        triggerOperationName,
        invocationData
    } = execContext;

    console.log('finishTrace');

    const additionalTags: any = execContext.getAdditionalFinishTags();
    if (additionalTags) {

        Object.keys(additionalTags).forEach(tag => {
            rootSpan.tags[tag] = additionalTags[tag];
        })
    }

    console.log('finishTrace 2');
    
    // const executionContextType = execContext.constructor.name;
    // const traceExecution = traceExecutionMap[executionContextType];

    // if (traceExecution != null){
    //     traceExecution.finish(execContext);
    // }

    // todo: set tags ?
}

