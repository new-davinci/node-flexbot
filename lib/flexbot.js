var noble = require('noble');

module.exports = (function () {
  var that = this;
  that.copter = null;
  that.connected = false;

  //Command buffers for the flexbot
  var COMMAND_HEADER = new Buffer([0x24, 0x4d, 0x3c, 0x00]),
      INIT_COMMAND = Buffer.concat([COMMAND_HEADER, new Buffer([0x96, 0x96])]),
      ARM_COMMAND = Buffer.concat([COMMAND_HEADER, new Buffer([0x97, 0x97])]);

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
              characteristics[0].write(INIT_COMMAND, true, function(error){
                if(error) console.log(error);
                characteristics[0].write(ARM_COMMAND, true, function(error){
                  // cb();
                });
              });
            });
          });
        });
      }
    });

    /*
    Found the commands:

    NOTES: These MUST be translated into ASCII. I created the module-wide variable COMMAND_HEADER that you can Buffer.concat() to.
    You also, for some reason, send the command TWICE... so init is Buffer.concat([ COMMAND_HEADER new Buffer([ 0x96, 0x96 ])]);
    #define MSP_HEADER "$M<"
    #define MSP_IDENT 100 (0x64)
    #define MSP_STATUS 101 (0x65)
    #define MSP_RAW_IMU 102 (0x66)
    #define MSP_SERVO 103 (0x67)
    #define MSP_MOTOR 104 (0x68)
    #define MSP_RC 105 (0x69)
    #define MSP_RAW_GPS 106 (0x6A)
    #define MSP_COMP_GPS 107 (0x6B)
    #define MSP_ATTITUDE 108 (0x6C)
    #define MSP_ALTITUDE 109 (0x6D)
    #define MSP_BAT 110 (0x6E)
    #define MSP_RC_TUNING 111 (0x6F)
    #define MSP_PID 112 (0x70)
    #define MSP_BOX 113 (0x71)
    #define MSP_MISC 114 (0x72)
    #define MSP_MOTOR_PINS 115 (0x73)
    #define MSP_BOXNAMES 116 (0x74)
    #define MSP_PIDNAMES 117 (0x75)
    #define MSP_SET_RAW_RC_TINY 150 (0x96)
    #define MSP_ARM 151 (0x97)
    #define MSP_DISARM 152 (0x98)
    #define MSP_TRIM_UP 153 (0x99)
    #define MSP_TRIM_DOWN 154 (0x9A)
    #define MSP_TRIM_LEFT 155 (0x9B)
    #define MSP_TRIM_RIGHT 156 (0x9C)
    #define MSP_SET_RAW_RC 200 (0xC8)
    #define MSP_SET_RAW_GPS 201 (0xC9)
    #define MSP_SET_PID 202 (0xCA)
    #define MSP_SET_BOX 203 (0xCB)
    #define MSP_SET_RC_TUNING 204 (0xCC)
    #define MSP_ACC_CALIBRATION 205 (0xCD)
    #define MSP_MAG_CALIBRATION 206 (0xCE)
    #define MSP_SET_MISC 207(0xCF)
    #define MSP_RESET_CONF 208 (0xD0)
    #define MSP_EEPROM_WRITE 250 (0xFA)
    #define MSP_DEBUG 254 (0xFE)
    */

    noble.startScanning();
  };

  return this;
})