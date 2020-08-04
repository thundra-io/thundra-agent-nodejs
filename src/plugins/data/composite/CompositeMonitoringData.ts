import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';

/**
 * Composite {@link BaseMonitoringData} implementation which
 * wraps other {@link BaseMonitoringData}s inside itself
 */
class CompositeMonitoringData extends BaseMonitoringData {

    allMonitoringData: any [];

    constructor() {
        super(MonitorDataType.COMPOSITE);
        this.allMonitoringData = [];
    }

}

export default CompositeMonitoringData;
