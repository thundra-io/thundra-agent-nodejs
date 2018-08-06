import * as uuidv4 from 'uuid/v4';
import { readFile } from 'fs';
import * as os from 'os';
import { DATA_FORMAT_VERSION, PROC_IO_PATH, PROC_STAT_PATH } from '../Constants';
import ThundraSpanContext from '../opentracing/SpanContext';
import Reference from 'opentracing/lib/reference';
import * as opentracing from 'opentracing';

class Utils {
    static generateId() {
        return uuidv4();
    }

    static generateReport(data: any, type: any, apiKey: String) {
        return {
            data,
            type,
            apiKey,
            dataFormatVersion: DATA_FORMAT_VERSION,
        };
    }

    static getCpuUsage() {
        const cpus: os.CpuInfo[] = os.cpus();
        const procCpuUsage: NodeJS.CpuUsage = process.cpuUsage();
        const procCpuUsed = procCpuUsage.user + procCpuUsage.system;
        let sysCpuTotal = 0;
        let sysCpuIdle = 0;

        cpus.forEach((cpu) => {
            sysCpuTotal += (cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq);
            sysCpuIdle += cpu.times.idle;
        });
        const sysCpuUsed = sysCpuTotal - sysCpuIdle;
        return {
            procCpuUsed,
            sysCpuUsed,
            sysCpuTotal,
        };
    }

    static getCpuLoad(start: any, end: any, clockTick: any) {
        const sysCpuTotalDif = (end.sysCpuTotal - start.sysCpuTotal);
        let procCpuLoad = ((end.procCpuUsed - start.procCpuUsed) / clockTick) / sysCpuTotalDif;
        let sysCpuLoad = (end.sysCpuUsed - start.sysCpuUsed) / sysCpuTotalDif;
        procCpuLoad = Number.isNaN(procCpuLoad) ? 0.0 : procCpuLoad;
        sysCpuLoad = Number.isNaN(sysCpuLoad) ? 0.0 : sysCpuLoad;
        return {
            procCpuLoad: Math.min(procCpuLoad, sysCpuLoad),
            sysCpuLoad,
        };
    }

    static parseError(err: any) {
        const error: any = { errorMessage: '', errorType: 'Unknown Error' };
        if (err instanceof Error) {
            error.errorType = err.name;
            error.errorMessage = err.message;
        } else if (typeof err === 'string') {
            error.errorMessage = err.toString();
        } else {
            try {
                error.errorMessage = JSON.stringify(err);
            } catch (e) {
                // the comment below is for ignoring in unit tests, do not remove it
                // istanbul ignore next
                error.errorMessage = '';
            }
        }
        return error;
    }

    static readProcStatPromise() {
        return new Promise((resolve, reject) => {
            readFile(PROC_STAT_PATH, (err, file) => {
                if (err) {
                    return reject(err);
                } else {
                    const procStatArray = file.toString().split(' ');
                    const procStatData = {
                        threadCount: parseInt(procStatArray[19], 0),
                    };
                    return resolve(procStatData);
                }
            });
        });
    }

    static readProcIoPromise() {
        return new Promise((resolve, reject) => {
            readFile(PROC_IO_PATH, (err, file) => {
                if (err) {
                    return reject(err);
                } else {
                    const procIoArray = file.toString().split('\n');
                    const procIoData = {
                        readBytes: parseInt(procIoArray[4].substr(procIoArray[4].indexOf(' ') + 1), 0),
                        writeBytes: parseInt(procIoArray[5].substr(procIoArray[5].indexOf(' ') + 1), 0),
                    };
                    return resolve(procIoData);
                }
            });
        });
    }

    static getParentContext(references: any): ThundraSpanContext {
        let parent: ThundraSpanContext = null;
        if (references) {
            for (const ref of references) {
                if (!(ref instanceof Reference)) {
                    console.error(`Expected ${ref} to be an instance of opentracing.Reference`);
                    break;
                }
                const spanContext = ref.referencedContext();

                if (!(spanContext instanceof ThundraSpanContext)) {
                    console.error(`Expected ${spanContext} to be an instance of SpanContext`);
                    break;
                }

                if (ref.type() === opentracing.REFERENCE_CHILD_OF) {
                    parent = ref.referencedContext() as ThundraSpanContext;
                    break;
                } else if (ref.type() === opentracing.REFERENCE_FOLLOWS_FROM) {
                    if (!parent) {
                        parent = ref.referencedContext() as ThundraSpanContext;
                    }
                }
            }
        }

        return parent;
    }
}

export default Utils;
