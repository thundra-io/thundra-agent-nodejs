class TraceDataProperties {
    coldStart: string;
    timeout: string;
    functionMemoryLimitInMB: number;
    functionRegion: string;
    functionARN: string;
    logGroupName: string;
    logStreamName: string;
    requestId: string;
    request: string | null;
    response: string | null;
}

export default TraceDataProperties;
