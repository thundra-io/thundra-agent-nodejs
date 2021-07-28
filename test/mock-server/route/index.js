module.exports = {
    '/get': (stream) => {
        stream.respond({
            ':status': 200
        });

        stream.end();
    },
    '/post': (stream) => {
        stream.respond({
            'content-type': 'application/json',
            ':status': 200
        });
        
        stream.end(JSON.stringify({
            testField: 'test-value'
        }));
    },
    '/404': (stream) => {
        stream.respond({
            ':status': 404
        });

        stream.end();
    },
    '/500': (stream) => {
        stream.respond({
            ':status': 500
        });

        stream.end();
    },
};