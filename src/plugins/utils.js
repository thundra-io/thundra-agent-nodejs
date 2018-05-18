import uuidv4 from 'uuid/v4';
import {readFile} from 'fs';
import os from 'os';
import {DATA_FORMAT_VERSION, PROC_IO_PATH, PROC_STAT_PATH} from '../constants';

const generateId = () => {
    return uuidv4();
};

const generateReport = (data, type, apiKey) => {
    return {
        data: data,
        type: type,
        apiKey: apiKey,
        dataFormatVersion: DATA_FORMAT_VERSION
    };
};

const getCpuUsage = () => {
    const cpus = os.cpus();
    const procCpuUsage = process.cpuUsage();
    const procCpuUsed = procCpuUsage.user + procCpuUsage.system;
    let sysCpuTotal = 0, sysCpuIdle = 0;
    cpus.forEach(cpu => {
        sysCpuTotal += (cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq);
        sysCpuIdle += cpu.times.idle;
    });
    const sysCpuUsed = sysCpuTotal - sysCpuIdle;
    return {
        procCpuUsed: procCpuUsed,
        sysCpuUsed: sysCpuUsed,
        sysCpuTotal: sysCpuTotal
    };
};

const getCpuLoad = (start, end, clockTick) => {
    const sysCpuTotalDif = (end.sysCpuTotal - start.sysCpuTotal);
    let procCpuLoad = ((end.procCpuUsed - start.procCpuUsed) / clockTick) / sysCpuTotalDif;
    let sysCpuLoad = (end.sysCpuUsed - start.sysCpuUsed) / sysCpuTotalDif;
    procCpuLoad = Number.isNaN(procCpuLoad) ? 0.0 : procCpuLoad;
    sysCpuLoad = Number.isNaN(sysCpuLoad) ? 0.0 : sysCpuLoad;
    return {
        procCpuLoad: Math.min(procCpuLoad, sysCpuLoad),
        sysCpuLoad: sysCpuLoad
    };
};

const parseError = (err) => {
    let error = {errorMessage: '', errorType: 'Unknown Error'};
    if (err instanceof Error) {
        error.errorType = err.name;
        error.errorMessage = err.message;
    }
    else if (typeof err === 'string') {
        error.errorMessage = err.toString();
    }
    else {
        try {
            error.errorMessage = JSON.stringify(err);
        } catch (e) {
            // the comment below is for ignoring in unit tests, do not remove it
            // istanbul ignore next
            error.errorMessage = '';
        }
    }
    return error;
};

const readProcStatPromise = () => {
    return new Promise((resolve, reject) => {
        readFile(PROC_STAT_PATH, (err, file) => {
            if (err) {
                return reject(err);
            }
            else {
                let procStatArray = file.toString().split(' ');
                const procStatData = {
                    threadCount: parseInt(procStatArray[19]),
                };
                return resolve(procStatData);
            }
        });
    });
};

const readProcIoPromise = () => {
    return new Promise((resolve, reject) => {
        readFile(PROC_IO_PATH, (err, file) => {
            if (err) {
                return reject(err);
            }
            else {
                let procIoArray = file.toString().split('\n');
                const procIoData = {
                    readBytes: parseInt(procIoArray[4].substr(procIoArray[4].indexOf(' ') + 1)),
                    writeBytes: parseInt(procIoArray[5].substr(procIoArray[5].indexOf(' ') + 1))
                };
                return resolve(procIoData);
            }
        });
    });
};


module.exports = {
    generateId,
    generateReport,
    getCpuUsage,
    getCpuLoad,
    readProcStatPromise,
    readProcIoPromise,
    parseError
};
