module.exports.set = (redis) => {
    return new Promise((resolve, reject) => {
        const client = redis.createClient();

        client.on('error', function (err) {
            return reject(err);
        });

        client.set('string key', 'string val', function(err, data) {
            client.quit();
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};