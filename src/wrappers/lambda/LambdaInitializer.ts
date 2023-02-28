import * as moduleLoadTracer from './ModuleLoadTracer';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';

export function init(): void {
    const traceColdStart: boolean =
        ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LAMBDA_TRACE_COLDSTART_ENABLE);
    if (traceColdStart) {
        moduleLoadTracer.init();
        moduleLoadTracer.activate();
    }
}
