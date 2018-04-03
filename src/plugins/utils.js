import uuidv4 from "uuid/v4";
import {readFile} from "fs";
import os from "os";
import {PROC_IO_PATH, PROC_STAT_PATH} from "../constants";

// convert JavaScript Date object to “yyyy-MM-dd HH:mm:ss.SSS Z” formatted string
const formatDate = (date) => {
    const pad = (number, length) => {
        let str = "" + number;
        while (str.length < length)
            str = "0" + str;
        return str;
    };
    let offset = date.getTimezoneOffset();
    offset = ((offset <= 0 ? "+" : "-") + pad(parseInt(Math.abs(offset / 60)), 2) + pad(Math.abs(offset % 60), 2));
    let year = pad(date.getFullYear(), 4);
    let month = pad(date.getMonth() + 1, 2);
    let day = pad(date.getDate(), 2);
    let hour = pad(date.getHours(), 2);
    let minutes = pad(date.getMinutes(), 2);
    let seconds = pad(date.getSeconds(), 2);
    let milliseconds = pad(date.getMilliseconds(), 3);
    return year + "-" + month + "-" + day + " " + hour + ":" + minutes + ":" + seconds + "." + milliseconds + " " + offset;
};

const generateId = () => {
    return uuidv4();
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


const readProcStatPromise = () => {
    return new Promise((resolve, reject) => {
        readFile(PROC_STAT_PATH, (err, file) => {
            if (err) {
                return reject(err);
            }
            else {
                let procStatArray = file.toString().split(" ");
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
                let procIoArray = file.toString().split("\n");
                const procIoData = {
                    readBytes: parseInt(procIoArray[4].substr(procIoArray[4].indexOf(" ") + 1)),
                    writeBytes: parseInt(procIoArray[5].substr(procIoArray[5].indexOf(" ") + 1))
                };
                return resolve(procIoData);
            }
        });
    });
};


module.exports = {
    formatDate,
    generateId,
    getCpuUsage,
    getCpuLoad,
    readProcStatPromise,
    readProcIoPromise,
};
