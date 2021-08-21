import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

import ThundraLogger from '../../../ThundraLogger';

import Reporter, { httpAgent, httpsAgent } from '../../../Reporter';

class TestReporter extends Reporter {

    constructor(apiKey: string, opt: any = {}) {
        super(apiKey, opt);
    } 

    report(data: any, path: string){
        return new Promise((resolve, reject) => {

            const dataJson = JSON.stringify(data);

            let request: http.ClientRequest;
            const responseHandler = (response: http.IncomingMessage) => {
                let responseData = '';
                response.on('data', (chunk: Buffer | string) => {
                    responseData += chunk;
                });
                response.on('end', () => {
                    ThundraLogger.debug(
                        `<Reporter> Received response from collector (status code: ${response.statusCode}): \
                            ${responseData}`);
                    if (response.statusCode === 429) {
                        this.latestReportingLimitedMinute = Math.floor(Date.now() / 1000);
                    }
                    if (response.statusCode !== 200) {
                        // Unauthorized request (for ex. API key is not present or invalid)
                        if (response.statusCode === 401) {
                            let responseMessage = null;
                            try {
                                const responseJson = JSON.parse(responseData);
                                responseMessage = responseJson.message;
                            } catch (e) {
                                // Ignore
                            }
                            if (!responseMessage) {
                                responseMessage = 'No API key is present or invalid API key';
                            }
                            ThundraLogger.error(
                                `<Reporter> Unable to report because of unauthorized request: ${responseMessage}`);
                        }
                        return reject({
                            status: response.statusCode,
                            data: responseData,
                        });
                    }
                    return resolve({
                        status: response.statusCode,
                        data: responseData,
                    });
                });
            };

            const requestObj = this.generateRequestOptions(path);

            this.useHttps
                ? request = https.request(requestObj, responseHandler)
                : request = http.request(requestObj, responseHandler);

            request.on('error', (error: any) => {
                ThundraLogger.debug('<Reporter> Request sent to collector has failed:', error);
                return reject(error);
            });
            try {
                ThundraLogger.debug(
                    `<Reporter> Sending data to collector at ${requestObj.hostname}: ${dataJson}`);
                request.write(dataJson);
                request.end();
            } catch (error) {
                ThundraLogger.error('<Reporter> Cannot serialize report data:', error);
            }
        });
    }

    generateRequestOptions(path: string) {

        return {
            method: 'POST',
            hostname:this.url.hostname,
            path: this.url.pathname + path,
            port: parseInt(this.url.port, 0),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'ApiKey ' + this.apiKey,
            },
            agent: this.useHttps ? httpsAgent : httpAgent,
            createConnection: (options: http.ClientRequestArgs, oncreate: (err: Error, socket: net.Socket) => void) => {
                try {
                    const socket: net.Socket = net.createConnection(options.port as number, options.hostname);
                    socket.setNoDelay(true);
                    socket.setKeepAlive(true);
                    oncreate(null, socket);
                    return socket;
                } catch (e) {
                    oncreate(e, null);
                    throw e;
                }
            },
        };
    }

    sendReport(reports: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                const reportJson: string = JSON.stringify(reports); //Utils.serializeJSON(reports);
                //const reportJson: string = this.serializeReport(compositeReport);
                this.doReport(reportJson)
                    .then((res: any) => {
                        resolve(res);
                    })
                    .catch((err: any) => {
                        if (err.code === 'ECONNRESET') {
                            this.doReport(reportJson)
                                .then((res: any) => {
                                    resolve(res);
                                })
                                .catch((err2: any) => {
                                    reject(err2);
                                });
                        } else {
                            reject(err);
                        }
                    });
            } catch (err) {
                reject(err);
            }
        });
    }

    protected createRequestOptions(u?: url.URL): http.RequestOptions {
        const path = '/testrun-start';

        return {
            method: 'POST',
            hostname: u ? u.hostname : this.url.hostname,
            path: (u ? u.pathname : this.url.pathname) + path,
            port: parseInt(u ? u.port : this.url.port, 0),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'ApiKey ' + this.apiKey,
            },
            agent: this.useHttps ? httpsAgent : httpAgent,
            createConnection: (options: http.ClientRequestArgs, oncreate: (err: Error, socket: net.Socket) => void) => {
                try {
                    const socket: net.Socket = net.createConnection(options.port as number, options.hostname);
                    socket.setNoDelay(true);
                    socket.setKeepAlive(true);
                    oncreate(null, socket);
                    return socket;
                } catch (e) {
                    oncreate(e, null);
                    throw e;
                }
            },
        };
    }
}

export default TestReporter;