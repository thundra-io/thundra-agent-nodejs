declare namespace NodeJS {
    export interface Global {
        __njsTraceEntry__ : any
        __njsTraceExit__ : any
        __njsOnCatchClause__: any
    }
}