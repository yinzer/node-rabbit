var amqp = require('amqplib');

amqp.connect('amqp://localhost').then(function(conn) {
  process.once('SIGINT', function() { conn.close(); });
  return conn.createChannel().then(function(ch) {
    var ok = ch.assertQueue('micros_transaction', {durable: true});
    ok = ok.then(function() { ch.prefetch(1); });
    ok = ok.then(function() {
      ch.consume('micros_transaction', doWork, {noAck: false});
      console.log(" [*] Waiting for messages. To exit press CTRL+C");
    });
    return ok;

    function doWork(msg) {
      var body = msg.content.toString();
      console.log(" [x] Received '%s'", body);
      var secs = body.split('.').length - 1;
      //console.log(" [x] Task takes %d seconds", secs);
      setTimeout(function() {
        console.log(" [x] Done");
        ch.ack(msg);
      }, secs * 1000);
    }
  });
}).then(null, console.warn);