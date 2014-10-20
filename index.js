var Flexbot = require('./lib/flexbot');

var flexbot = new Flexbot();

flexbot.connect(function () {
  console.log('connected');
  console.log(arguments);
  process.exit(0);
});