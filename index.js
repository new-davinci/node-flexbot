var Flexbot = require('./lib/flexbot');

var flexbot = new Flexbot();

flexbot.connect(function () {
  console.log('connected');
  flexbot.init(function() {
  	console.log('arming...')
  	flexbot.arm(function(){
  		console.log('armed');
  	})
  })
});