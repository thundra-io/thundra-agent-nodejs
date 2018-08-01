import TraceConfig  from '../../dist/plugins/config/TraceConfig';
import TraceOption from '../../dist/plugins/config/TraceOption';

describe('TraceConfig', () => {
    it('should parse single envirenment variable', () => {
        process.env.thundra_trace_def = 'album.getAlbum[traceArgs=true,traceReturnValue=true,traceError=true]'; 
        const traceConfig = new TraceConfig({});
        
        expect(traceConfig.traceDef.length).toBe(1);
        expect(traceConfig.traceDef[0].traceArgs).toBe(true);
        expect(traceConfig.traceDef[0].traceError).toBe(true);
        expect(traceConfig.traceDef[0].traceReturnValue).toBe(true);
        expect(traceConfig.traceDef[0].pattern).toBe('album.getAlbum');

        delete process.env.thundra_trace_def;
    });

    it('should parse multiple envirenment variable', () => {
        process.env.thundra_trace_def1 = 'album.getAlbum[traceArgs=true,traceReturnValue=false, traceError=true]'; 
        process.env.thundra_trace_def2 = 'user.get*[traceArgs=true,traceReturnValue=true,traceError=false]'; 
        const traceConfig = new TraceConfig({});
        
        expect(traceConfig.traceDef.length).toBe(2);
        expect(traceConfig.traceDef[1].traceArgs).toBe(true);
        expect(traceConfig.traceDef[1].traceError).toBe(false);
        expect(traceConfig.traceDef[1].traceReturnValue).toBe(true);
        expect(traceConfig.traceDef[1].pattern).toBe('user.get*');
        expect(traceConfig.traceDef[1].shouldTraceFunction('user.get')).toBeTruthy();

        delete process.env.thundra_trace_def1;
        delete process.env.thundra_trace_def2;
    });

    it('should parse from programatic config', () => {
        const traceConfig = new TraceConfig( {
            traceDef: [{
                pattern : 'business.f*',
                traceArgs: true,
                traceReturnValue: false,
                traceError: true,
            }]
        });
        
        expect(traceConfig.traceDef.length).toBe(1);
        expect(traceConfig.traceDef[0].traceArgs).toBe(true);
        expect(traceConfig.traceDef[0].traceError).toBe(true);
        expect(traceConfig.traceDef[0].traceReturnValue).toBe(false);
        expect(traceConfig.traceDef[0].pattern).toBe('business.f*');

    });
});

describe('TraceOption', () => {

    it('should test shouldTrace', () => {
        const traceOption = new TraceOption('album.get*');
        expect(traceOption.shouldTraceFunction('album.getAlbum')).toBeTruthy();
        expect(traceOption.shouldTraceFunction('album.setAlbum')).toBeFalsy();
    });

    it('should test shouldTrace with exactly match', () => {
        const traceOption = new TraceOption('business.go');
        expect(traceOption.shouldTraceFunction('business.go')).toBeTruthy();
    });

    it('should test shouldTraceFile', () => {
        const traceOption = new TraceOption('business.go');
        expect(traceOption.shouldTraceFile('business.*')).toBeTruthy();
    });
});