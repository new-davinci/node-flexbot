var noble = require('noble');

module.exports = (function () {
  var that = this;
  that.copter = null;
  that.connected = false;

  that.connect = function (cb) {
    noble.on('discover',function (p) {
      console.log('discovered');

      // found a flexbot
      if (p.advertisement.localName ==='Flexbot'  || p.advertisement.serviceUuids.indexOf('ffe0') >= 0) {
        console.log('discovered a flexbot')
        that.copter = p;
        that.copter.connect(function () {
          noble.stopScanning();
          that.copter.discoverServices(['ffe0'], function (error, services) {
            services[0].discoverCharacteristics(['ffe1'], function (error, characteristics) {
              console.log(characteristics);
              
              characteristics[0].on('notify', function(state){
                console.log('notified', state);
              })

              characteristics[0].on('write', function(){
                console.log('written', arguments);
              });

              characteristics[0].discoverDescriptors(function(error, descriptors){
                console.log(error, descriptors);
                // descriptors[0].writeValue(new Buffer(1), function(error){
                  console.log('error: ', error)
                  // characteristics[0].notify(true, function(error){
                    var commandBufferHeader = new Buffer('$M<4', 'utf-8');
                    var initCommandBuffer = Buffer.concat([commandBufferHeader, new Buffer([150])]);
                    console.log(initCommandBuffer);
                    characteristics[0].write(initCommandBuffer, true, function(error){
                      if(error) console.log(error);
                      console.log('made it');
                      var armCommandBuffer = Buffer.concat([commandBufferHeader, new Buffer([151])]);
                      console.log(armCommandBuffer);
                      characteristics[0].write(armCommandBuffer ,true, function(error){
                        characteristics[0].read(function(error, value){
                          console.log(value);
                          // cb(error, value);
                        })
                      });
                    });
                  // });
                // });
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