export default class TestRunMonitoringData {
    dataModelVersion: string = '1.0';
    agentVersion: string = '2.12.51'; // todo: obtain agent version, impl a logic for it
    type: string; // this.constructor.name; not working returns 'ws' string check it

    constructor(type: string) {
        this.type = type;
    }
}
