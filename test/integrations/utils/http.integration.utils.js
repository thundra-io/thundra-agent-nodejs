module.exports.get = (http) => {
    return new Promise((resolve) => {
        const url = 'http://httpstat.us/200/cors?userId=1';
        http.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            // We resolve with error.
            console.log('HTTP request returned an error. Error: ', err);
            resolve(err);
        });
    });
};

module.exports.getAPIGW = (http) => {
    return new Promise((resolve) => {
        const url = 'https://qbzotxrb9a.execute-api.us-west-2.amazonaws.com/prod';
        http.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            // We resolve with error.
            console.log('HTTP request returned an error. Error: ', err);
            resolve(err);
        });
    });
};

module.exports.getError = (http) => {
    return new Promise((resolve) => {
        const url = 'http://httpstat.us/404/cors';
        http.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            // We resolve with error.
            console.log('HTTP request returned an error. Error: ', err);
            resolve(err);
        });
    });
};

module.exports.post = (https) => {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            todo: 'Buy the milk'
        });

        const options = {
            hostname: 'flaviocopes.com',
            port: 443,
            path: '/todos',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            return resolve();
        });

        req.on('end', () => {
            return resolve();
        });

        req.on('error', (err) => {
            console.log('HTTP request returned an error. Error: ', err);
            return resolve(err);
        });

        req.write(data);
        req.end();
    });
};
