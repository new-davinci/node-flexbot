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
          noble.stopScanning();
          that.copter.discoverServices(['ffe0'], function (error, services) {
            services[0].discoverCharacteristics(['ffe1'], function (error, characteristics) {

              var characteristic = characteristics[0];

              characteristic.on('read', function(data, isNotification){ console.log('there was a read'); });

              characteristic.on('write', function(){ console.log('there was a write'); });

              characteristic.on('broadcast', function(){ console.log('there was a broadcast.')});

              characteristic.on('notify', function(){ console.log('there was a notify')});

              characteristic.read(function(error, data){
                 console.log('Read:', error, data);
              })

              characteristic.discoverDescriptors(function callback(error, descriptors) {
                var descriptor = descriptors[1];
                descriptor.writeValue(new Buffer('$M<0' + String.fromCharCode(254)),function(error){
                  // if(error) console.log(error);
                  console.log('made it');
                  cb();
                });
              });
            });
          });
        });
      }
    });

    /*
    Found the commands:
    #define MSP_HEADER "$M<"
    #define MSP_IDENT 100
    #define MSP_STATUS 101
    #define MSP_RAW_IMU 102
    #define MSP_SERVO 103
    #define MSP_MOTOR 104
    #define MSP_RC 105
    #define MSP_RAW_GPS 106
    #define MSP_COMP_GPS 107
    #define MSP_ATTITUDE 108
    #define MSP_ALTITUDE 109
    #define MSP_BAT 110
    #define MSP_RC_TUNING 111
    #define MSP_PID 112
    #define MSP_BOX 113
    #define MSP_MISC 114
    #define MSP_MOTOR_PINS 115
    #define MSP_BOXNAMES 116
    #define MSP_PIDNAMES 117
    #define MSP_SET_RAW_RC_TINY 150
    #define MSP_ARM 151
    #define MSP_DISARM 152
    #define MSP_TRIM_UP 153
    #define MSP_TRIM_DOWN 154
    #define MSP_TRIM_LEFT 155
    #define MSP_TRIM_RIGHT 156
    #define MSP_SET_RAW_RC 200
    #define MSP_SET_RAW_GPS 201
    #define MSP_SET_PID 202
    #define MSP_SET_BOX 203
    #define MSP_SET_RC_TUNING 204
    #define MSP_ACC_CALIBRATION 205
    #define MSP_MAG_CALIBRATION 206
    #define MSP_SET_MISC 207
    #define MSP_RESET_CONF 208
    #define MSP_EEPROM_WRITE 250
    #define MSP_DEBUG 254
    */

    noble.startScanning();
  };

  return this;
})