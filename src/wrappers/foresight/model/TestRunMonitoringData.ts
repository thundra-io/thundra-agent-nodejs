import { AGENT_VERSION } from '../../../Constants';

export default class TestRunMonitoringData {
    dataModelVersion: string = '1.0';
    agentVersion: string = AGENT_VERSION;
    type: string;

    constructor(type: string) {
        this.type = type;
    }
}
