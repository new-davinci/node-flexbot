var Flexbot = require('../index.js'),
		repl = require('repl');

var flexbot = new Flexbot();

flexbot.connect(function () {
  console.log('connected');
  flexbot.init(function() {
  	console.log('arming...');
  	flexbot.arm(function(){
  		console.log('armed');
  		repl.start({
  			prompt: "Flexbot>"
  		}).context.flexbot = flexbot;
  	});
  });
});
