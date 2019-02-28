module.exports.query = (es) => {
    return new Promise((resolve) => {
        var client = new es.Client({
            host: 'http://localhost:9200'
        });

        const query = {
            index: 'twitter',
            type: 'tweets',
            body: {
                query: {
                    match: {
                        body: 'elasticsearch'
                    }
                }
            }
        };

        client.search(query).then((data) => {
            return resolve(data);
        }).catch((err) => {
            return resolve(err);
        });
    });
};
