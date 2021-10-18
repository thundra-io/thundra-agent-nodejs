import ConfigProvider from '../../../../../config/ConfigProvider';
import ExecutionContext from '../../../../../context/ExecutionContext';
import ExecutionContextManager from '../../../../../context/ExecutionContextManager';
import ThundraSpan from '../../../../../opentracing/Span';
import ThundraLogger from '../../../../../ThundraLogger';
import Utils from '../../../../../utils/Utils';
import * as TestRunnerSupport from '../../../TestRunnerSupport';

/**
 * Util class for test suite event handlers.
 */
export default class HandlerUtils {

    static async sendTestRunStart() {

        const testRunStart = TestRunnerSupport.startTestRun();
        if (!testRunStart) {
            return;
        }

        try {

            await HandlerUtils.sendData(testRunStart);
            ThundraLogger.debug(`
                <Setup> Test run start event sended for test suite: ${TestRunnerSupport.testSuiteName}
                with test run id: ${testRunStart.id}
            `);
        } catch (error) {

            ThundraLogger.error('<Setup> Test run start event did not send.', error);
        } finally {

            TestRunnerSupport.startTestRunStatusEvent();
            ThundraLogger.debug('<Setup> Test run status event interval started');
        }
    }

    static async sendTestRunFinish() {

        try {

            const testRunFinish = TestRunnerSupport.finishTestRun();
            if (!testRunFinish) {
                return;
            }

            await HandlerUtils.sendData(testRunFinish);
            ThundraLogger.debug(`
                <Setup> Test run start event sended for test suite: ${TestRunnerSupport.testSuiteName}
                with test run id: ${testRunFinish.id}
            `);
        } catch (error) {

            ThundraLogger.error('<Setup> Test run finish event did not send.', error);
        } finally {

            TestRunnerSupport.clearTestRun();
            ThundraLogger.debug(`<Teardown> Test run information cleared for test suite: ${TestRunnerSupport.testSuiteName}`);
        }
    }

    static async sendData(data: any) {

        const config = ConfigProvider.thundraConfig;
        const { apiKey } = config;

        const { reporter } = TestRunnerSupport.wrapperContext;

        await reporter.sendReports([Utils.generateReport(data, apiKey)]);
    }

    static createSpanForTest(operationName: string, context: ExecutionContext) {
        const { tracer } = context;

        if (!tracer) {

            ThundraLogger.debug('<HandlerUtils> Tracer can not be empty.');
            return;
        }

        const {
            domainName,
            className,
        }: any = context.getContextInformation();

        const parentSpan = tracer.getActiveSpan();

        return tracer._startSpan(operationName, {
            childOf: parentSpan,
            domainName,
            className,
            disableActiveStart: true,
        });
    }

    static finishSpanForTest(span: ThundraSpan, tagName: string, context: ExecutionContext) {
        if (!span) {

            ThundraLogger.debug('<HandlerUtils> Span can not be empty.');
            return;
        }

        span.close();

        if (!context || !context.invocationData) {

            ThundraLogger.debug('<HandlerUtils> Execution context can not be empty.');
            return;
        }

        const { invocationData } = context;
        if (invocationData) {
            let duration = span.getDuration();

            const currentDuration = invocationData.tags[tagName];
            duration = duration + (currentDuration ? currentDuration : 0);

            invocationData.tags[tagName] = duration;
        }
    }
}
