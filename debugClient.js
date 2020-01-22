const net = require('net');
const WebSocket = require('ws');

const brokerSocket = new WebSocket(
    `ws://localhost:4444`,
    {
        headers: {
            'x-thundra-auth-token': 'thundra',
            'x-thundra-session-name': 'test',
            'x-thundra-protocol-version': '1.0',
        },
    },
);

const shutdownSockets = () => {
    log('debugClient: shutting down the sockets');
    ideSocket.close();
    brokerSocket.close();
};

const log = (...params) => {
    const LOGS_ENABLED = 'true';
    if (LOGS_ENABLED === 'true') {
        console.log(...params);
    }
};

// Setup IDE socket
const ideSocket = net.createServer((connection) => {
    const connPort = connection.remotePort;
    brokerSocket.on('message', (data) => {
        log('brokerWebSocket:', data.toString());
        connection.write(data);
    });
    brokerSocket.on('close', (code, reason) => {
        log(`brokerSocket: disconnected from the the Thundra broker, code: ${code}, reason: ${reason}`);
        connection.end();
    });

    connection.on('data', (data) => {
        log(`ideSocket(${connPort})`, data.toString());
        brokerSocket.send(data);
    });
    connection.on('end', () => {
        log(`ideSocket(${connPort}): disconnected from the IDE Debugger`);
        brokerSocket.close();
    });
    connection.on('error', (err) => {
        log(`ideSocket(${connPort}):` + err);
    });
}).listen(7777);

// Setup broker socket
brokerSocket.on('open', () => {
    log('brokerSocket: connection established with the Thundra broker');
});
brokerSocket.on('error', (err) => {
    log('brokerSocket:' + err);
});

process.on('SIGTERM', () => {
    shutdownSockets();
    process.exit(0);
});
