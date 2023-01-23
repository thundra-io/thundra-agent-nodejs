const https = require('https');
const aws4  = require('aws4');

const THUNDRA_APIKEY_ENV_VAR_NAME = 'THUNDRA_APIKEY';
const THUNDRA_AWS_SSM_APIKEY_PARAM_NAME_ENV_VAR_NAME = 'THUNDRA_AWS_SSM_APIKEY_PARAM_NAME';

async function _doRequest(opts) {
    return new Promise ((resolve, reject) => {
        https.request(opts, function(res) {
            let resData = '';
            res.on('data', (chunk) => {
                resData += chunk;
            });
            res.on('end', () => {
                resolve({
                    data: resData,
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                });
            });
            res.on('error', (error) => {
                return reject(error);
            });
        }).end(opts.body || '');
    });
}

async function _getAWSSSMParameter(name) {
    const opts = {
        service: 'ssm',
        region: process.env.AWS_REGION,
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AmazonSSM.GetParameter',
        },
        body: JSON.stringify({
            Name: name,
            WithDecryption: true,
        }),
    };
    aws4.sign(opts);
    const response = await _doRequest(opts);
    if (response) {
        const { data, statusCode, statusMessage } = response;
        if (statusCode == 200) {
            const responseObj = JSON.parse(data);
            return responseObj
                && responseObj.Parameter
                && responseObj.Parameter.Value
                && responseObj.Parameter.Value.trim();
        } else {
            console.error(
                `Request failed (code=${statusCode}, message=${statusMessage}) ` +
                `while getting Thundra API key from AWS SSM with param name ${name}`);
        }
    } else {
        console.error(
            `No response could be retrieved while getting Thundra API key from AWS SSM with param name ${name}`);
    }
}

module.exports.init = async function() {
    if (!process.env[THUNDRA_APIKEY_ENV_VAR_NAME]) {
        if (process.env[THUNDRA_AWS_SSM_APIKEY_PARAM_NAME_ENV_VAR_NAME]) {
            try {
                const apiKey = await _getAWSSSMParameter(process.env[THUNDRA_AWS_SSM_APIKEY_PARAM_NAME_ENV_VAR_NAME]);
                if (apiKey) {
                    process.env[THUNDRA_APIKEY_ENV_VAR_NAME] = apiKey;
                    console.log(`${THUNDRA_APIKEY_ENV_VAR_NAME}: ${process.env[THUNDRA_APIKEY_ENV_VAR_NAME]}`);
                } else {
                    console.error(`No Thundra API key could be retrieved from AWS SSM by param name ` +
                                  `${process.env[THUNDRA_AWS_SSM_APIKEY_PARAM_NAME_ENV_VAR_NAME]}`);
                }
            } catch (err) {
                console.error(`Unable to get Thundra API key from AWS SSM by param name ` +
                              `${process.env[THUNDRA_AWS_SSM_APIKEY_PARAM_NAME_ENV_VAR_NAME]}: ${err}`);
            }
        }
    }
};
