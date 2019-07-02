module.exports.set = (redis) => {
    return new Promise((resolve, reject) => {
        const client = new redis();

        client.set('string key', 'string val', function(err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};