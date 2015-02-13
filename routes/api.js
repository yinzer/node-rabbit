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

  router.post('/send/:name', function (req, res) {
    var name = req.params.name;
    
    amqp.connect('amqp://localhost').then(function (conn) {
      return when(conn.createChannel().then(function (ch) {
        var q = 'hello';
        var ok = ch.assertQueue(q, { durable: true });

        return ok.then(function (_qok) {
          ch.sendToQueue(q, new Buffer(name));
          console.log(" [x] Sent '%s'", name);

          res.json({
            message: 'sent ' + name
          });

          return ch.close();
        });
      })).ensure(function () {
        conn.close();
      });
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

  router.post('/rpc/:n', function (req, res) {
    var n = req.params.n;
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
          ch.sendToQueue('rpc_queue', new Buffer(n.toString()), {
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