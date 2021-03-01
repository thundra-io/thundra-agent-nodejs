/**
 * Defines custom types
 */

declare namespace NodeJS {
    export interface Global {
        __thundraImports__: any;
        __thundraMasterModule__: any;
        __thundraTraceEntry__: any;
        __thundraTraceLine__: any;
        __thundraTraceExit__: any;
        __thundraGlobalExecutionContext__: any;
        __thundraId: any;
    }
}
