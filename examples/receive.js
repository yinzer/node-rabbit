var amqp = require('amqplib');

amqp.connect('amqp://guest:guest@rabbit:5672').then(function(conn) {
  process.once('SIGINT', function() { conn.close(); });
  return conn.createChannel().then(function(ch) {
    
    var ok = ch.assertQueue('micros_transaction', {durable: false});
    
    ok = ok.then(function(_qok) {
      return ch.consume('micros_transaction', function(msg) {
        console.log(" [x] Received '%s'", msg.content.toString());
      }, {noAck: true});
    });
    
    return ok.then(function(_consumeOk) {
      console.log(' [*] Waiting for messages. To exit press CTRL+C');
    });
  });
}).then(null, console.warn);
