import TraceConfig  from '../../dist/plugins/config/TraceConfig';
import TraceDef from '../../dist/plugins/config/TraceDef';

describe('TraceConfig', () => {
    it('should parse single envirenment variable', () => {
        process.env.thundra_trace_def = 'album.getAlbum[traceArgs=true,traceReturnValue=true,traceError=true]'; 
        const traceConfig = new TraceConfig({});
        
        expect(traceConfig.traceDefs.length).toBe(1);
        expect(traceConfig.traceDefs[0].traceArgs).toBe(true);
        expect(traceConfig.traceDefs[0].traceError).toBe(true);
        expect(traceConfig.traceDefs[0].traceReturnValue).toBe(true);
        expect(traceConfig.traceDefs[0].pattern).toBe('album.getAlbum');

        delete process.env.thundra_trace_def;
    });

    it('should parse multiple envirenment variable', () => {
        process.env.thundra_trace_def1 = 'album.getAlbum[traceArgs=true,traceReturnValue=false, traceError=true]'; 
        process.env.thundra_trace_def2 = 'user.get*[traceArgs=true,traceReturnValue=true,traceError=false]'; 
        const traceConfig = new TraceConfig({});
        
        expect(traceConfig.traceDefs.length).toBe(2);
        expect(traceConfig.traceDefs[1].traceArgs).toBe(true);
        expect(traceConfig.traceDefs[1].traceError).toBe(false);
        expect(traceConfig.traceDefs[1].traceReturnValue).toBe(true);
        expect(traceConfig.traceDefs[1].pattern).toBe('user.get*');
        expect(traceConfig.traceDefs[1].shouldTraceFunction('user.get')).toBeTruthy();

        delete process.env.thundra_trace_def1;
        delete process.env.thundra_trace_def2;
    });

    it('should parse from programatic config', () => {
        const traceConfig = new TraceConfig( {
            traceDefs: [{
                pattern : 'business.f*',
                traceArgs: true,
                traceReturnValue: false,
                traceError: true,
            }]
        });
        
        expect(traceConfig.traceDefs.length).toBe(1);
        expect(traceConfig.traceDefs[0].traceArgs).toBe(true);
        expect(traceConfig.traceDefs[0].traceError).toBe(true);
        expect(traceConfig.traceDefs[0].traceReturnValue).toBe(false);
        expect(traceConfig.traceDefs[0].pattern).toBe('business.f*');

    });
});

describe('TraceOption', () => {

    it('should test shouldTrace', () => {
        const traceDef = new TraceDef('album.get*');
        expect(traceDef.shouldTraceFunction('album.getAlbum')).toBeTruthy();
        expect(traceDef.shouldTraceFunction('album.setAlbum')).toBeFalsy();
    });

    it('should test shouldTrace with exactly match', () => {
        const traceDef = new TraceDef('business.go');
        expect(traceDef.shouldTraceFunction('business.go')).toBeTruthy();
    });

    it('should test shouldTraceFile', () => {
        const traceDef = new TraceDef('business.go');
        expect(traceDef.shouldTraceFile('business.*')).toBeTruthy();
    });
});