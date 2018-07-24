import * as http from 'http';
import * as https from 'https';
import {URL} from './Constants';
import { RequestOptions, ClientRequest } from 'http';

class Reporter {
    private reports: any[];
    private apiKey: string;

    constructor(apiKey: string) {
        this.reports = [];
        this.apiKey = apiKey;
    }

    addReport(report: any): void {
        if (process.env.thundra_lambda_publish_cloudwatch_enable === 'true') {
            const jsonStringReport = '\n' + JSON.stringify(report).replace(/\r?\n|\r/g, '') + '\n';
            process.stdout.write(jsonStringReport);
        } else {
            this.reports = [...this.reports, report];
        }
    }

    async sendReports(): Promise<void> {
        await this.request()
            .then((response: any ) => {
                if (response.status !== 200) {
                    console.log(this.reports);
                }
            })
            .catch((err: any) => {
                console.error(err);
            });
    }

    request(): Promise<any> {
        const hostname = URL.hostname;
        const path = URL.pathname + '/monitor-datas';
        const port = URL.port;
        const protocol = URL.protocol;

        return new Promise((resolve, reject) => {
            const options: RequestOptions = {
                method: 'POST',
                hostname,
                path,
                port: parseInt(port, 0),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'ApiKey ' + this.apiKey,
                },
            };

            let request: ClientRequest;
            const responseHandler = (response: http.IncomingMessage) => {
                let responseData = '';
                response.on('data', (chunk: Buffer | string) => {
                    responseData += chunk;
                });
                response.on('end', () => {
                    resolve({status: response.statusCode, data: responseData});
                });
            };

            protocol === 'https:' ? request = https.request(options, responseHandler) :
                                    request = http.request(options, responseHandler);

            request.on('error', (error: any) => {
                reject(error);
            });
            request.write(JSON.stringify(this.reports));
            request.end();
        });
    }
}

export default Reporter;
