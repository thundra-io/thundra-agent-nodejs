module.exports.select = (pg) => {
    return new Promise((resolve) => {
        const config =  {
            user: 'postgres',
            password: 'postgres',
            database: 'postgres',
            application_name: 'test'
        };

        const client = new pg.Client(config);

        client.connect();
        
        client.query('SELECT $1::text as message', ['Hello world!'], (err, data) => {
            client.end(() => {
                if (err) {
                    // Resolve even though there is an error.
                    return resolve(err);
                }
                return resolve(data);
            });
        });
    });    
};
