var express = require('express');
var uuid    = require('node-uuid');
var amqp    = require('amqplib');
var when    = require('when'),
  defer     = when.defer;

module.exports = (function () {
  var router = express.Router();
  
  router.route('/')
    .get(function (req, res) {
      res.json({
        message: 'hello world!'
      });
    });

  router.get('/transaction', function (req, res) {
    // var transaction = 'Transaction: ' + Math.floor(Math.random() * 100000) + 1;
    
    amqp.connect('amqp://guest:guest@rabbit:5672').then(function(conn) {
      return when(conn.createChannel().then(function(ch) {
        var q = 'micros_transaction';
        var ok = ch.assertQueue(q, {durable: false});
        
        return ok.then(function() {
          ch.sendToQueue(q, new Buffer("hi"), {deliveryMode: false});
          res.json({
            transaction: "hi"
          });
          return ch.close();
        });
      })).ensure(function() { conn.close(); });
    }).then(null, console.warn);
  
  });

  router.post('/log/:key/:msg', function (req, res) {
    var key = req.params.key;
    var msg = req.params.msg;

    amqp.connect('amqp://localhost').then(function (conn) {
      return when(conn.createChannel().then(function (ch) {
        var ex = 'topic_logs';
        var ok = ch.assertExchange(ex, 'topic', {durable: false});
        return ok.then(function () {
          ch.publish(ex, key, new Buffer(msg));
          res.json({
            key: key,
            msg: msg
          });
          return ch.close();
        });
      })).ensure(function () {
        conn.close();
      });
    }).then(null, console.log);
  });

  router.get('/redemption', function (req, res) {
    var n = Math.floor(Math.random() * 100) + 1;
    amqp.connect('amqp://localhost').then(function (conn) {
      return when(conn.createChannel().then(function (ch) {
        var answer = defer();
        var corrId = uuid();
        function maybeAnswer (msg) {
          if (msg.properties.correlationId === corrId) {
            answer.resolve(msg.content.toString());
          }
        }

        var ok = ch.assertQueue('', {exclusive: true})
          .then(function (qok) {
            return qok.queue;
          });

        ok = ok.then(function (queue) {
          return ch.consume(queue, maybeAnswer, {noAck: true})
            .then(function () {
              return queue;
            });
        });

        ok = ok.then(function (queue) {
          ch.sendToQueue('micros_redemption', new Buffer(n.toString()), {
            correlationId: corrId,
            replyTo: queue
          });
          return answer.promise;
        });

        return ok.then(function (fibN){
          // console.log(' [.] Got %d', fibN);
          res.json({
            fib: fibN
          });
        });
      })).ensure(function () {
        conn.close();
      });
    }).then(null, console.warn);
  });

  return router;
})();