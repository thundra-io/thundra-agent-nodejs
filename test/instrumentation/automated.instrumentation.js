const Instrumenter = require('../../dist/opentracing/instrument/Instrumenter').default;
const ThundraTracer = require( '../../dist/opentracing/Tracer').default;
const TraceConfig = require('../../dist/plugins/config/TraceConfig').default;
const assert = require('assert');

const automatic_instrumentation_test = function () {
    const tracer = new ThundraTracer();
    const config = new TraceConfig({
        traceableConfigs: [{
            pattern: 'test.instrumentation.utils.automated.instrumentation.util.*',
            traceReturnValue: true,
            traceArgs : true,
        }],
        tracer,
    });

    
    const instrumenter = new Instrumenter(config);
    instrumenter.hookModuleCompile();
    
    const Automated = require('./utils/automated.instrumentation.util');

    const returnValue = Automated.test_function();

    const spanList = tracer.getRecorder().spanList;

    assert.equal(spanList.length, 2);
    assert.equal(spanList[1].className, 'Method');
    assert.equal(spanList[1].operationName, 'test.instrumentation.utils.automated.instrumentation.util.f1');
    assert.equal(spanList[1].tags['method.args'][0].name, 'a');
    assert.equal(spanList[1].tags['method.args'][0].type, 'number');
    assert.equal(spanList[1].tags['method.args'][0].value, 0);
    assert.equal(spanList[1].tags['method.return_value'].type, 'number');
    assert.equal(spanList[1].tags['method.return_value'].value, 1);

    assert.equal(spanList[0].operationName, 'test.instrumentation.utils.automated.instrumentation.util.test_function');
    assert.equal(spanList[0].className, 'Method');
    assert.equal(spanList[0].tags['method.args'].length, 0);
    assert.equal(spanList[0].tags['method.return_value'].type, 'number');
    assert.equal(spanList[0].tags['method.return_value'].value, returnValue);
};

automatic_instrumentation_test();



