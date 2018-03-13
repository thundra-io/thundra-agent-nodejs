import uuidv4 from "uuid/v4";

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

const getApplicationId = () => {
    let arr = process.env.AWS_LAMBDA_LOG_STREAM_NAME.split("]");
    return arr[arr.length - 1];
};

const getApplicationProfile = () => {
    return process.env.thundra_applicationProfile ? process.env.thundra_applicationProfile : "";
};

const getApplicationRegion = () => {
    return process.env.AWS_REGION;
};

const getApplicationVersion = () => {
    return process.env.AWS_LAMBDA_FUNCTION_VERSION;
};

module.exports = {
    formatDate,
    generateId,
    getApplicationId,
    getApplicationProfile,
    getApplicationRegion,
    getApplicationVersion,
};

