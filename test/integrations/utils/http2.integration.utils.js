import HTTP2 from 'http2';
import FS from 'fs';
import URL from 'url';

const http2Client = (url, { caPath } = {}) => {
    
    const requestUrl = new URL.URL(url);
    
    const client = HTTP2.connect(requestUrl, {
        ...(caPath != undefined ? { ca: FS.readFileSync(caPath) } : undefined )
    });
    
    client.on('error', (err) => {
        console.error(err);
    });
    
    return {
        request: ({ method = 'GET', path, search, payload, headers }) => {
            return new Promise((resolve) => {
                let buffer;
                let options = headers;
                
                if (payload){
                    buffer = new Buffer.from(JSON.stringify(payload));
                }
                
                if (!options) {
                    options = {
                        [HTTP2.constants.HTTP2_HEADER_SCHEME]: 'https',
                        [HTTP2.constants.HTTP2_HEADER_METHOD]: method,
                        [HTTP2.constants.HTTP2_HEADER_PATH]: path || requestUrl.pathname,
                        [HTTP2.constants.HTTP2_METHOD_SEARCH]: search || requestUrl.search,
                        'Content-Type': 'application/json',
                        ...(buffer ? {'Content-Length': buffer.length}: undefined) ,
                    };
                }
                
                const request = client.request(options);
                
                request.on('response', (headers, flags) => {
                    // todo: do something if needed.
                });
                
                request.setEncoding('utf8');
                
                const data = [];
                request.on('data', (chunk) => {
                    data.push(chunk);
                });
                
                request.on('end', () => {
                    client.close();
                    
                    resolve(data.join());        
                });
                
                if (buffer){
                    request.write(buffer);
                }
                
                request.end();              
            });        
        },
        close: () => {
            if (client) {
                client.close();
            }
        }      
    };   
};

module.exports = {
    http2Client,
};