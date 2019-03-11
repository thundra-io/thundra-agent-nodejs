import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';

class CompositeMonitoringData extends BaseMonitoringData {
    allMonitoringData: any [];

    constructor() {
        super(MonitorDataType.COMPOSITE);
        this.allMonitoringData = [];
    }
}

export default CompositeMonitoringData;
