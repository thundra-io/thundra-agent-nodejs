
import TraceDataProperties from './TraceProperties';
import AuditInfo from './AuditInfo';
import BasePluginData from '../base/BasePluginData';

class TraceData extends BasePluginData {
    id: string;
    duration: number;
    startTimestamp: number;
    endTimestamp: number;
    errors: any;
    thrownError: string;
    readonly contextType: string = 'ExecutionContext';
    contextName: string;
    contextId: string;
    auditInfo: AuditInfo;
    properties: TraceDataProperties;
}

export default TraceData;
