var cluster = require('cluster'),
  numCPUs = require('os').cpus().length;


if (cluster.isMaster) {
  console.log('I am the master, launching workers!');
  for (var i=0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  var express = require('express'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    port = process.env.PORT || 3000,
    api = require('./routes/api'),
    micros = require('./routes/micros'),
    app = express();

  app.use(morgan('dev'));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use('/', api);
  app.use('/micros', micros);

  app.listen(port);
  console.log('Magic happens on port ' + port);
}