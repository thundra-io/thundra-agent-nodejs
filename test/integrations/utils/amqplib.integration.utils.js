module.exports.promise_model = (amqplib) => {
    return new Promise((resolve) => {
        const q = 'tasks_promise';

        const open = amqplib.connect('amqp://user:bitnami@localhost:5672');

        // publisher
        open.then(function(conn) {
            return conn.createChannel();
        }).then(function(ch){
            return ch.assertQueue(q).then(function(ok){
                return ch.sendToQueue(q, Buffer.from('amqplib promise'));
            });
        }).catch(err=>resolve(err));

        // consumer
        open.then(function(conn) {
            return conn.createChannel();
        }).then(function(ch){
            return ch.assertQueue(q).then(function(ok){
                return ch.consume(q,function(msg){
                    if (msg !== null) {
                        ch.ack(msg);
                        resolve(msg.content.toString());
                    }
                });
            });
        }).catch(err => resolve(err));
    });
}


module.exports.callback_model = (amqplib) => {
    return new Promise((resolve) => {

        const q = "tasks_callback"
    
        function bail(err) {
            return resolve(err);
        }
    
        function publisher(conn){
            conn.createChannel(on_open);
            function on_open(err, ch){
                if (err != null) bail(err);
                ch.assertQueue(q);
                ch.sendToQueue(q, Buffer.from('amqplib callback'));
            }
        }

        function consumer(conn) {
            const ok = conn.createChannel(on_open);
            function on_open(err, ch){
                if (err != null) bail(err);
                ch.assertQueue(q);
                ch.consume(q, function(msg) {
                    if (msg !== null) {
                        ch.ack(msg);
                        return resolve(msg.content.toString());
                    }
                })
            }
        }

        amqplib.connect('amqp://user:bitnami@localhost:5672', function(err, conn) {
            if (err != null) bail(err);
            consumer(conn);
            publisher(conn)
        })
    });
}