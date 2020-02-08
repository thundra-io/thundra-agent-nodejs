const net = require('net');
const WebSocket = require('ws');
const { DEBUGGER_PORT, BROKER_HOST, BROKER_PORT, LOGS_ENABLED, AUTH_TOKEN, SESSION_NAME } = process.env;

const CLOSING_CODES: {[key: string]: number} = {
    NORMAL: 1000,
    TIMEOUT: 4001,
};

const log = (...params: any[]) => {
    if (LOGS_ENABLED === 'true') {
        console.log(...params);
    }
};

const debuggerSocket = new net.Socket();
const brokerSocket = new WebSocket(
    `ws://${BROKER_HOST}:${BROKER_PORT}`,
    {
        headers: {
            'x-thundra-auth-token': AUTH_TOKEN,
            'x-thundra-session-name': SESSION_NAME,
            'x-thundra-protocol-version': '1.0',
        },
    },
);

// Setup debugger socket
debuggerSocket.on('data', (data: Buffer) => {
    brokerSocket.send(data);
});
debuggerSocket.on('end', () => {
    log('debuggerSocket: disconnected from the main lambda process');
    if (brokerSocket.readyState === WebSocket.OPEN) {
        brokerSocket.close(CLOSING_CODES.NORMAL, 'NORMAL');
    }
});
debuggerSocket.on('error', (err: any) => {
    log('debuggerSocket:' + err);
});

// Setup broker socket
let firstMessage = true;
const sendToDebugger = (data: Buffer) => {
    if (debuggerSocket.writable) {
        debuggerSocket.write(data);
    } else {
        setTimeout(() => sendToDebugger(data), 0);
    }
};

brokerSocket.on('message', (data: Buffer) => {
    if (firstMessage) {
        firstMessage = false;
        debuggerSocket.connect({ port: DEBUGGER_PORT }, () => {
            log('debuggerSocket: connection established with main lambda process');
        });
    }

    sendToDebugger(data);
});
brokerSocket.on('open', () => {
    log('brokerSocket: connection established with the Thundra broker');
});
brokerSocket.on('close', (code: Number, reason: string) => {
    log(`brokerSocket: disconnected from the the Thundra broker, code: ${code}, reason: ${reason}`);
    if (!debuggerSocket.destroyed) {
        debuggerSocket.end();
    }
});
brokerSocket.on('error', (err: any) => {
    log('brokerSocket:' + err);
});

process.on('SIGTERM', () => {
    if (brokerSocket.readyState === WebSocket.OPEN) {
        brokerSocket.close(CLOSING_CODES.NORMAL, 'NORMAL');
    }
    if (debuggerSocket.destroyed) {
        debuggerSocket.end();
    }
});

process.on('SIGHUP', () => {
    if (brokerSocket.readyState === WebSocket.OPEN) {
        brokerSocket.close(CLOSING_CODES.TIMEOUT, 'TIMEOUT');
    }
    if (!debuggerSocket.destroyed) {
        debuggerSocket.end();
    }
});
