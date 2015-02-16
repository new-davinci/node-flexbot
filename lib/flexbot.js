'use strict';

var noble = require('noble');

var FLEX_SIGNATURES = ['AnyFlite', 'Hex Mini', 'HMSoft', 'FlexBLE', 'Hex Nano', 'Any Flite', 'Flexbot'];

var kThrottleFineTuningStep = 0.03,
    kBeginnerElevatorChannelRatio  = 0.5,
    kBeginnerAileronChannelRatio   = 0.5,
    kBeginnerRudderChannelRatio    = 0.0,
    kBeginnerThrottleChannelRatio  = 0.8;

var PPM_CHANNEL_COUNT = 8;

function withHeader(buffer) {
  for (var i = 0; i <MSP_HEADER.length; i++) {
    buffer[i] = MSP_HEADER[i];
  }
  return buffer;
}

function checksum(buffer) {
  var data = Array.prototype.slice.call(buffer, 3);
  if(data[0] === 0) {
    // out message
    return data[1];
  } else {
    // in message
    return data
      .slice(0, data[0])
      .reduce(function(tot, cur) { return tot ^ cur; }, 0);
  }
}

function sign(value) {
  return (value < 0 ? -1.0 : 1.0);
}


var MSP_HEADER               = new Buffer([0x24, 0x4d, 0x3c]),
    MSP_DATA_SIZE_IDX        = 3,
    MSP_CHECKSUM_IDX         = 10,

    MSP_IDENT                = 100,
    MSP_STATUS               = 101,
    MSP_RAW_IMU              = 102,
    MSP_SERVO                = 103,
    MSP_MOTOR                = 104,
    MSP_RC                   = 105,
    MSP_RAW_GPS              = 106,
    MSP_COMP_GPS             = 107,
    MSP_ATTITUDE             = 108,
    MSP_ALTITUDE             = 109,
    MSP_BAT                  = 110,
    MSP_RC_TUNING            = 111,
    MSP_PID                  = 112,
    MSP_BOX                  = 113,
    MSP_MISC                 = 114,
    MSP_MOTOR_PINS           = 115,
    MSP_BOXNAMES             = 116,
    MSP_PIDNAMES             = 117,

    MSP_SET_RAW_RC_TINY      = 150,
    MSP_ARM                  = 151,
    MSP_DISARM               = 152,
    MSP_TRIM_UP              = 153,
    MSP_TRIM_DOWN            = 154,
    MSP_TRIM_LEFT            = 155,
    MSP_TRIM_RIGHT           = 156,

    MSP_SET_RAW_RC           = 200,
    MSP_SET_RAW_GPS          = 201,
    MSP_SET_PID              = 202,
    MSP_SET_BOX              = 203,
    MSP_SET_RC_TUNING        = 204,
    MSP_ACC_CALIBRATION      = 205,
    MSP_MAG_CALIBRATION      = 206,
    MSP_SET_MISC             = 207,
    MSP_RESET_CONF           = 208,

    MSP_EEPROM_WRITE         = 250,

    MSP_DEBUG                = 254;


var ROLL_CHANNEL             = 0,
    PITCH_CHANNEL            = 1,
    YAW_CHANNEL              = 2,
    THROTTLE_CHANNEL         = 3,
    AUX1_CHANNEL             = 4,
    AUX2_CHANNEL             = 5,
    AUX3_CHANNEL             = 6,
    AUX4_CHANNEL             = 7;

module.exports = function () {
  var that = this;
  that.copter = null;
  that.connected = false;
  that.channels= new Buffer(PPM_CHANNEL_COUNT); //ROLL,PITCH,YAW,THROTTLE, AUX1,AUX2,AUX3,AUX4

  that.package = function () {
    var buffer = withHeader(new Buffer(11));
    buffer[MSP_DATA_SIZE_IDX] = 5;
    buffer[4] = MSP_SET_RAW_RC_TINY;

    // -- updatePPMPackage
    var checkSum = 0;

    checkSum ^= (buffer[MSP_DATA_SIZE_IDX] & 0xFF);
    checkSum ^= (buffer[MSP_DATA_SIZE_IDX + 1] & 0xFF);


    //populate the channels
    for (var channelIdx = 0; channelIdx < PPM_CHANNEL_COUNT - 4; channelIdx++){
      var scale =  that.channels[channelIdx];
      if (scale > 1) {
          scale = 1;  // pin the high value
      } else if (scale < -1){
          scale = -1; // pin the low value
      }
      buffer[5 + channelIdx] = Math.abs((500 + 500 * scale)) / 4;
      checkSum ^= (buffer[5 + channelIdx] & 0xFF);
    }

    var auxChannels = 0x00;

    var aux1Scale = that.channels[4];

    if (aux1Scale < -0.666) {
      auxChannels |= 0x00;
    } else if (aux1Scale < 0.3333){
      auxChannels |= 0x40;
    } else {
      auxChannels |= 0x80;
    }

    var aux2Scale = that.channels[5];

    if (aux2Scale < -0.666) {
      auxChannels |= 0x00;
    } else if (aux2Scale < 0.3333){
      auxChannels |= 0x10;
    } else {
    auxChannels |= 0x20;
    }

    var aux3Scale = that.channels[6];

    if (aux3Scale < -0.666) {
      auxChannels |= 0x00;
    } else if (aux3Scale < 0.3333){
      auxChannels |= 0x04;
    } else {
      auxChannels |= 0x08;
    }

    var aux4Scale = that.channels[7];

    if (aux4Scale < -0.666) {
      auxChannels |= 0x00;
    } else if (aux4Scale < 0.3333){
      auxChannels |= 0x01;
    } else{
      auxChannels |= 0x02;
    }

    buffer[9] = auxChannels;
    checkSum ^= (buffer[9] & 0xFF);
    buffer[MSP_CHECKSUM_IDX] = checkSum;
    return buffer;
  };


  that.pkg = that.package();  //   ROLL,PITCH,YAW,THROTTLE, AUX1,AUX2,AUX3,AUX4


  //Place to save the characteristic to write to
  that.BLECharacteristic = null;

  //for the write loop that keeps the connection alive
  that.keepAliveInterval = null;

  that.transmitSimpleCommand = function (command, callback) {
    var simplePkg = withHeader(new Buffer(6));
    simplePkg[3] = 0;
    simplePkg[4] = command;

    // calculate the checksum
    var checkSum = 0;
    checkSum ^= (simplePkg[3] & 0xFF);
    checkSum ^= (simplePkg[4] & 0xFF);

    simplePkg[5] = checkSum;
    if(!that.BLECharacteristic){
      callback(new Error('Cannot Send Message; Not connected to a Flexbot. Attempted to send '+simplePkg.toString()));
    } else {
      console.log(simplePkg);
      that.BLECharacteristic.write(simplePkg, true, callback);
    }
  };







  that.connect = function (callback) {
    noble.on('discover',function (p) {
      if (FLEX_SIGNATURES.indexOf(p.advertisement.localName) >= 0  || p.advertisement.serviceUuids.indexOf('ffe0') >= 0) {
        console.log('Discovered a Flexbot.');
        that.copter = p;
        that.copter.connect(function () {
          console.log('Connected to Flexbot.');
          noble.stopScanning();
          that.copter.discoverServices(['ffe0'], function (error, services) {

            if(error){
              callback(error);
            } else {
              services[0].discoverCharacteristics(['ffe1'], function (error, characteristics) {
                if(error){
                  callback(error);
                } else {
                  that.BLECharacteristic = characteristics[0];
                  that.keepAlive();
                  console.log('Flexbot keepalive activated');
                  callback(undefined);
                }
              });
            }
          });
        });
      }
    });

    that.init = function(callback){
      that.keepAlive();
      if (typeof callback === 'function') {
        callback();
      }
    };

    that.aileron = function(value) {
      that.channels[ROLL_CHANNEL] = value;
      that.pkg = that.package();
    };

    that.elevator = function (value) {
      that.channels[PITCH_CHANNEL] = value;
      that.pkg = that.package();
    };

    that.rudder = function(value) {
      that.channels[YAW_CHANNEL] = value;
      that.pkg = that.package();
    };

    that.throttle = function(value) {
      that.channels[THROTTLE_CHANNEL] = value;
      that.pkg = that.package();
    };

    that.aux1 = function(value) {
      that.channels[AUX1_CHANNEL] = value;
      that.pkg = that.package();
    };

    that.aux2 = function(value) {
      that.channels[AUX2_CHANNEL] = value;
      that.pkg = that.package();
    };

    that.aux3 = function(value) {
      that.channels[AUX3_CHANNEL] = value;
      that.pkg = that.package();

    };

    that.aux4 = function(value) {
      that.channels[AUX4_CHANNEL] = value;
      that.pkg = that.package();
    };


    that.arm = function(callback){
      that.transmitSimpleCommand(MSP_ARM, callback);
    };

    that.disarm = function(callback){
      that.transmitSimpleCommand(MSP_DISARM, callback);
    };

    that.trimUp = function(callback){
      that.transmitSimpleCommand(MSP_TRIM_UP, callback);
    };
    that.trimDown = function(callback){
      that.transmitSimpleCommand(MSP_TRIM_DOWN, callback);
    };
    that.trimLeft = function(callback){
      that.transmitSimpleCommand(MSP_TRIM_LEFT, callback);
    };
    that.trimRight = function(callback){
      that.transmitSimpleCommand(MSP_TRIM_RIGHT, callback);
    };

    that.keepAlive = function(){

      if(that.BLECharacteristic) {
        that.keepAliveInterval = setInterval(function(){
          console.log(that.pkg);
          that.BLECharacteristic.write(that.pkg, function(err){
            if(err){
              throw new Error('Error during keepAlive-- did you disconnect?');
            }
          });
        }, 100);
      } else {
        throw new Error('Cannot call keepAlive without an active connection to a Flexbot.');
      }
    };



    noble.startScanning();
  };

  return this;
};
