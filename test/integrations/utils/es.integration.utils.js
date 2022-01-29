module.exports.query = (client) => {
    return new Promise((resolve) => {

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

module.exports.queryWithMultipleHost = (client) => {
    return new Promise((resolve) => {

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

module.exports.newQuery = (client) => {
    return new Promise((resolve) => {
        const query = {
            index: 'twitter',
            body: {
                query: {
                    match: {
                        body: 'elasticsearch'
                    }
                }
            },
        };

        client.search(query).then((data) => {
            return resolve(data);
        }).catch((err) => {
            return resolve(err);
        });
    });
};

module.exports.newQueryWithMultipleHost = (client) => {
    return new Promise((resolve) => {
        const query = {
            index: 'twitter',
            body: {
                query: {
                    match: {
                        body: 'elasticsearch'
                    }
                }
            },
        };

        client.search(query).then((data) => {
            return resolve(data);
        }).catch((err) => {
            return resolve(err);
        });
    });
};

