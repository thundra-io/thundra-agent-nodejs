module.exports.promise_model = (amqplib) => {
    return new Promise((resolve) => {

        const amqp_url = 'amqp://user:bitnami@localhost:5672';

        // publisher
        async function produce(){
            console.log("Publishing");
            var conn = await amqplib.connect(amqp_url, "heartbeat=60");
            var ch = await conn.createChannel()
            var exch = 'test_exchange';
            var q = 'tasks_promise';
            var rkey = 'test_route';
            var msg = 'amqplib promise';
            await ch.assertExchange(exch, 'direct', {durable: true}).catch(console.error);
            await ch.assertQueue(q, {durable: true});
            await ch.bindQueue(q, exch, rkey);
            await ch.publish(exch, rkey, Buffer.from(msg));
            setTimeout( function()  {
                ch.close();
                conn.close();},  500 );
        }

        // consumer
        async function do_consume() {
            var conn = await amqplib.connect(amqp_url, "heartbeat=60");
            var ch = await conn.createChannel()
            var q = 'tasks_promise';
            await conn.createChannel();
            await ch.assertQueue(q, {durable: true});
            await ch.consume(q, function (msg) {
                ch.ack(msg);
                ch.cancel('myconsumer');
                resolve(msg.content.toString());
                }, {consumerTag: 'myconsumer'});
            setTimeout( function()  {
                ch.close();
                conn.close();},  500 );
        }
        produce();
        do_consume();
    });
};


module.exports.callback_model = (amqplib) => {
    return new Promise((resolve) => {

        const q = 'tasks_callback';
    
        function bail(err) {
            resolve(err);
            process.exit(1);
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
                        resolve(msg.content.toString());
                    }
                });
            }
        }

        amqplib.connect('amqp://user:bitnami@localhost:5672', function(err, conn) {
            if (err != null) bail(err);
            consumer(conn);
            publisher(conn);
        });
    });
};