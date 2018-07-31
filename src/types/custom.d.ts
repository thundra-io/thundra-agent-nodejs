declare namespace NodeJS {
    export interface Global {
        __thundraTraceEntry__ : any
        __thundraTraceExit__ : any
        __thundraOnCatchClause__: any
    }
}