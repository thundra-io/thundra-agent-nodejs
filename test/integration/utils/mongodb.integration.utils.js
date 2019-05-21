module.exports.insert = (doc, mongodb) => {
    return new Promise((resolve) => {
        const MongoClient = mongodb.MongoClient;
        const mongoURL = 'mongodb://localhost:27017';
        const dbName = 'testDB';
        const collectionName = 'testCollection'
        MongoClient.connect(mongoURL, {useNewUrlParser: true }, (err, client) => {
            const db = client.db(dbName);
            const collection = db.collection(collectionName);
            collection.insertOne(doc).then((res) => {
                return resolve(data);
            }).catch((err) => {
                return resolve(err);
            });
        });
    });
}
