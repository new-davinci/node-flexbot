var noble = require('noble');




module.exports = (function () {
  var that = this;
  that.copter = null;
  that.connected = false;

  that.connect = function (cb) {
    noble.on('discover',function (p) {
      console.log('discovered');

      // found a flexbot
      if (p.advertisement.localName ==='Any Flite'  || p.advertisement.serviceUuids.indexOf('ffe0') >= 0) {
        console.log('discovered a flexbot')
        that.copter = p;
        that.copter.connect(function () {
          that.copter.discoverServices(['ffe0'], function (error, services) {
            services[0].discoverCharacteristics(['ffe1'], function (error, characteristics) {
              console.log(characteristics);
              cb();

            });
          });
        });
      }
    });

    noble.startScanning();

  };

  return this;
})