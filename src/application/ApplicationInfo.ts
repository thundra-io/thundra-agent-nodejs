/**
 * Hold application level information such as application id, name, etc ...
 */
export interface ApplicationInfo {

    applicationId: string;
    applicationInstanceId: string;
    applicationName: string;
    applicationClassName: string;
    applicationDomainName: string;
    applicationRegion: string;
    applicationVersion: string;
    applicationStage: string;
    applicationTags: any;

}
