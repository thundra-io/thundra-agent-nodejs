import https from 'https';
import http from 'http';
import {URL} from './constants'

class Reporter {
    constructor(apiKey) {
        this.reports = [];
        this.apiKey = apiKey;
    }

    addReport = (report) => {
        if (process.env.thundra_lambda_publish_cloudwatch_enable === 'true') {
            let jsonStringReport = '\n' + JSON.stringify(report).replace(/\r?\n|\r/g, '') + '\n';
            process.stdout.write(jsonStringReport);
        }
        else {
            this.reports = [...this.reports, report];
        }
    };

    sendReports = async () => {
        await this.request()
            .then(response => {
                if (response.status !== 200) {
                    console.log(this.reports);
                }
            })
            .catch(err => {
                console.error(err);
            })
    };

    request = () => {
        const hostname = URL.hostname;
        const path = URL.pathname + '/monitor-datas';
        const port = URL.port;
        const protocol = URL.protocol;

        return new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                hostname: hostname,
                path: path,
                port: port,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'ApiKey ' + this.apiKey
                }
            };
            const requestLib = protocol === 'https:' ? https : http;
            const request = requestLib.request(
                options,
                response => {
                    let responseData = '';
                    response.on('data', chunk => {
                        responseData += chunk;
                    });

                    response.on('end', () => {
                        resolve({status: response.statusCode, data: responseData});
                    })
                });

            request.on('error', error => {
                reject(error);
            });

            request.write(JSON.stringify(this.reports));
            request.end();
        });

    };

}

export default Reporter;


