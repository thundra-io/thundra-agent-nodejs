const Hapi = require('@hapi/hapi');

const { APIError } = require('../../mocks/mocks');

let server;

const start = async (port = 9090) => {

    server = Hapi.server({
        port,
        host: 'localhost'
    });

    server.route([{
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return 'Hello World!';
        }
    },
    {
        method: 'GET',
        path: '/error',
        handler: (request, h) => {
            throw new APIError('Boom');
        }
    }]);

    await server.start();

    console.log('Server running on %s', server.info.uri);

    return server;
};

const destroy = () => {
    if (server) {
        server.stop();
    }
};

module.exports = {
    start,
    destroy,
};