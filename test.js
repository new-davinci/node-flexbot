'use strict';
var Flexbot = require('./lib/drone');
var drone = new Flexbot();


drone.connect(function () {
  console.log(arguments);
  console.log('connected');
  drone.setup(function () {
    console.log(arguments);
    setTimeout(function () {
      console.log('arming');
      drone.arm(function () {
        console.log(arguments);
      });
    }, 10000);
  });
});
