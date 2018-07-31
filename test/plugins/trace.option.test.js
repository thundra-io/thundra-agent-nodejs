import TraceConfig  from '../../dist/plugins/config/TraceConfig';

describe('TraceConfig', () => {
    it('should parse single envirenment variable', () => {
        process.env.thundra_trace_def = 'album.getAlbum[traceArgs=true,traceReturnValue=true,traceError=true]'; 
        const traceOption = new TraceConfig({});
        
        expect(traceOption.traceDef.length).toBe(1);
        expect(traceOption.traceDef[0].traceArgs).toBe('true');
        expect(traceOption.traceDef[0].traceError).toBe('true');
        expect(traceOption.traceDef[0].traceReturnValue).toBe('true');
        expect(traceOption.traceDef[0].pattern).toBe('album.getAlbum');

        delete process.env.thundra_trace_def;
    });

    it('should parse multiple envirenment variable', () => {
        process.env.thundra_trace_def1 = 'album.getAlbum[traceArgs=true,traceReturnValue=false, traceError=true]'; 
        process.env.thundra_trace_def2 = 'user.get*[traceArgs=true,traceReturnValue=true,traceError=false]'; 
        const traceOption = new TraceConfig({});
        
        expect(traceOption.traceDef.length).toBe(2);
        expect(traceOption.traceDef[1].traceArgs).toBe('true');
        expect(traceOption.traceDef[1].traceError).toBe('false');
        expect(traceOption.traceDef[1].traceReturnValue).toBe('true');
        expect(traceOption.traceDef[1].pattern).toBe('user.get*');

        delete process.env.thundra_trace_def1;
        delete process.env.thundra_trace_def2;
    });
});