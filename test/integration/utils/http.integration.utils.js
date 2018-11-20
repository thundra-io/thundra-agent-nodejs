module.exports.get = (http) => {
    return new Promise((resolve) => {
        const url = 'http://jsonplaceholder.typicode.com/users/1?q=123';
        http.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            // We resolve with error.
            resolve(err);
        });        
    });
};