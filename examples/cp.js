var childProcess = require('child_process'),
  rec;

rec = childProcess.exec('node examples/receive.js', function (error, stdout, stderr) {
  if (error) {
    console.log(error.stack);
    console.log('Error code: ' + error.code);
    console.log('Signal received: ' + error.signal);
  }
  console.log('Child Process STDOUT: ' + stdout);
  console.log('Child Process STDERR: ' + stderr);
});

rec.on('exit', function (code) {
  console.log('Child process exited with exit code ' + code);
});