const net = require('net');

const { DEBUGGER_PORT, BROKER_HOST, BROKER_PORT, LOGS_ENABLED } = process.env;
const debuggerSocket = new net.Socket();
const brokerSocket = new net.Socket();
const shutdownSockets = () => {
    log('debugBridge: shutting down the sockets');
    debuggerSocket.end();
    brokerSocket.end();
};

const log = (msg) => {
    if (LOGS_ENABLED === 'true') {
        console.log(msg);
    }
}

// Setup debugger socket
debuggerSocket.connect({ port: DEBUGGER_PORT });
debuggerSocket.on('data', (data) => {
    brokerSocket.write(data);
});
debuggerSocket.on('connect', () => {
    log('debuggerSocket: connection established with main lambda process');
});
debuggerSocket.on('end', () => {
    log('debuggerSocket: disconnected from the main lambda process');
    brokerSocket.end();
});
debuggerSocket.on('error', (err) => {
    log('debuggerSocket:' + err);
});

// Setup broker socket
brokerSocket.connect({ host: BROKER_HOST, port: BROKER_PORT });
brokerSocket.on('connect', () => {
    log('brokerSocket: connection established with the Thundra broker');
});
brokerSocket.on('data', (data) => {
    debuggerSocket.write(data);
});
brokerSocket.on('end', () => {
    log('brokerSocket: disconnected from the the Thundra broker');
    debuggerSocket.end();
});
brokerSocket.on('error', (err) => {
    log('brokerSocket:' + err);
});

process.on('SIGTERM', () => {
    shutdownSockets();
    process.exit(0);
});
