module.exports.insert = (doc, mongodb) => {
    return new Promise((resolve) => {
        const MongoClient = mongodb.MongoClient;
        const mongoURL = 'mongodb://localhost:27017';
        const dbName = 'testDB';
        const collectionName = 'testCollection';
        MongoClient.connect(mongoURL, { useNewUrlParser: true }, (err, client) => {
            const db = client.db(dbName);
            const collection = db.collection(collectionName);
            collection.insertOne(doc)
                .then((res) => client.close())
                .then(() => resolve())
                .catch((err) => {
                    client.close()
                        .then(resolve);
                });
        });
    });
};

module.exports.update = (doc, updateKey, mongodb) => {
    return new Promise((resolve) => {
        const MongoClient = mongodb.MongoClient;
        const mongoURL = 'mongodb://localhost:27017';
        const dbName = 'testDB';
        const collectionName = 'testCollection';
        MongoClient.connect(mongoURL, { useNewUrlParser: true }, (err, client) => {
            const db = client.db(dbName);
            const collection = db.collection(collectionName);
            collection.insertOne(doc)
                .then((res) => collection.updateOne(updateKey, {
                    '$set': { 'newField': 'newValue ' },
                })).then((res) => client.close())
                .then(() => resolve())
                .catch((err) => {
                    client.close()
                        .then(resolve);
                });
        });
    });
};

module.exports.dropCollection = (mongodb) => {
    return new Promise((resolve) => {
        const MongoClient = mongodb.MongoClient;
        const mongoURL = 'mongodb://localhost:27017';
        const dbName = 'testDB';
        const collectionName = 'testCollection';
        MongoClient.connect(mongoURL, { useNewUrlParser: true }, (err, client) => {
            const db = client.db(dbName);
            db.dropCollection('non_exist')
                .then((res) => client.close())
                .then(() => resolve())
                .catch((err) => {
                    client.close()
                        .then(resolve);
                });
        });
    });
};
