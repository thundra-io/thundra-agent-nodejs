import HTTP2 from 'http2';
import FS from 'fs';
import PATH from 'path';

const routes = require('./route');

let server;

const start = (port = 8443) => {
    server = HTTP2.createSecureServer({     
        key: FS.readFileSync(PATH.resolve(__dirname, './cert/http2-privkey.pem')),
        cert: FS.readFileSync(PATH.resolve(__dirname, './cert/http2-cert.pem'))
    });
    
    server.on('error', (err) => console.error(err));
    
    server.on('stream', (stream, headers) => {
        
        const path = headers[':path'];
        const route = routes[path];
        if (route){
            route(stream);
        } else{
            routes['/404'](stream);
        }
    });
    
    server.listen(port);
};

const destroy = () => {
    if (server){
        server.close();
    }
};

module.exports = {
    start,
    destroy,
};