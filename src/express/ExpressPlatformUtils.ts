import { PlatformUtils } from '../application/PlatformUtils';

export class ExpressPlatformUtils extends PlatformUtils {
    static getTransactionId(): string {
        return '';
    }

    static setInvocationTags(invocationData: any, pluginContext: any) {
        return;
    }
}
