'use strict';

var noble = require('noble');

var FLEX_SIGNATURES = ['AnyFlite', 'Hex Mini', 'HMSoft', 'FlexBLE', 'Hex Nano', 'Any Flite', 'Flexbot'];

var kSerialService = 'ffe0';
var kSerialCharacteristic = 'ffe1';

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



var Drone = function(uuid) {
  this.uuid = uuid;
  this.connected = false;
  this.ble = noble;
  this.steps = {};
  this.channels= new Buffer(PPM_CHANNEL_COUNT); //ROLL,PITCH,YAW,THROTTLE, AUX1,AUX2,AUX3,AUX4
};



Drone.prototype.pkg = function () {
  var buffer = withHeader(new Buffer(11));
  buffer[MSP_DATA_SIZE_IDX] = 5;
  buffer[4] = MSP_SET_RAW_RC_TINY;

  // -- updatePPMPackage
  var checkSum = 0;

  checkSum ^= (buffer[MSP_DATA_SIZE_IDX] & 0xFF);
  checkSum ^= (buffer[MSP_DATA_SIZE_IDX + 1] & 0xFF);


  //populate the channels
  for (var channelIdx = 0; channelIdx < PPM_CHANNEL_COUNT - 4; channelIdx++){
    var scale =  this.channels[channelIdx];
    if (scale > 1) {
        scale = 1;  // pin the high value
    } else if (scale < -1){
        scale = -1; // pin the low value
    }
    buffer[5 + channelIdx] = parseInt(Math.abs((500 + 500 * scale)) / 4, 10);     //125
    checkSum ^= (buffer[5 + channelIdx] & 0xFF);
  }

  var auxChannels = 0x00;

  var aux1Scale = this.channels[4];

  if (aux1Scale < -0.666) {
    auxChannels |= 0x00;
  } else if (aux1Scale < 0.3333){
    auxChannels |= 0x40;
  } else {
    auxChannels |= 0x80;
  }

  var aux2Scale = this.channels[5];

  if (aux2Scale < -0.666) {
    auxChannels |= 0x00;
  } else if (aux2Scale < 0.3333){
    auxChannels |= 0x10;
  } else {
  auxChannels |= 0x20;
  }

  var aux3Scale = this.channels[6];

  if (aux3Scale < -0.666) {
    auxChannels |= 0x00;
  } else if (aux3Scale < 0.3333){
    auxChannels |= 0x04;
  } else {
    auxChannels |= 0x08;
  }

  var aux4Scale = this.channels[7];

  if (aux4Scale < -0.666) {
    auxChannels |= 0x00;
  } else if (aux4Scale < 0.3333){
    auxChannels |= 0x01;
  } else{
    auxChannels |= 0x02;
  }

  buffer[9] = parseInt(auxChannels,10);
  checkSum ^= (buffer[9] & 0xFF);
  buffer[MSP_CHECKSUM_IDX] = checkSum;
  return buffer;
};


Drone.prototype.connect = function(callback) {
  this.ble.on('discover', function(peripheral) {
    if (FLEX_SIGNATURES.indexOf(peripheral.advertisement.localName) >= 0  || peripheral.advertisement.serviceUuids.indexOf('ffe0') >= 0) {
      if (typeof this.uuid === 'undefined' || peripheral.uuid === this.uuid) {   //unspecified uuid OR is the specific one.
        this.peripheral = peripheral;
        this.peripheral.connect(function(error) {
          if (error) {
            this.ble.stopScanning();
            if (typeof callback === 'function') {
              callback(error);
            } else {
              throw error;
            }
          } else {
            this.connected = true;
            this.ble.stopScanning();
            if (typeof callback === 'function') {
              callback();
            }
          }
        }.bind(this));
      }
    }
  }.bind(this));

  this.ble.startScanning();
};



Drone.prototype.setup = function(callback) {
  this.peripheral.discoverAllServicesAndCharacteristics(function(error, services, characteristics) {
    this.services = services;
    this.characteristics = characteristics;

    console.log(services);
    console.log(characteristics);
    this.handshake(callback);
    // if (typeof callback === 'function') {
    //   callback();
    // }
  }.bind(this));
};



Drone.prototype.handshake = function(callback) {
  var characteristic = this.getCharacteristic(kSerialCharacteristic);
  characteristic.notify(true);
  characteristic.on('notify', function (state) {
    console.log('notify---');
    console.log(arguments);
  });
  setTimeout(function() {
    this.startPing();
    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this), 100);
};



Drone.prototype.getCharacteristic = function(unique_uuid_segment) {
  var filtered = this.characteristics.filter(function(c) {
    return c.uuid.search(new RegExp(unique_uuid_segment)) !== -1;
  });

  return filtered[0];
};

Drone.prototype.writeTo = function(unique_uuid_segment, buffer) {
  console.log('Writting: ',buffer);
  this.getCharacteristic(unique_uuid_segment).write(buffer, true);
};


module.exports = Drone;

Drone.prototype.stopPing = function () {
  clearInterval(this.keepAliveInterval);
  this.keepAliveInterval = null;
};

Drone.prototype.startPing = function() {
  this.keepAliveInterval = setInterval(function() {
    this.steps[kSerialCharacteristic] = (this.steps[kSerialCharacteristic] || 0) + 1;
    this.writeTo(
        kSerialCharacteristic,
        this.pkg()
      );
  }.bind(this), 50);
};






Drone.prototype.aileron = function(value) {
  this.channels[ROLL_CHANNEL] = value;
};

Drone.prototype.elevator = function (value) {
  this.channels[PITCH_CHANNEL] = value;
};

Drone.prototype.rudder = function(value) {
  this.channels[YAW_CHANNEL] = value;
};

Drone.prototype.throttle = function(value) {
  this.channels[THROTTLE_CHANNEL] = value;
};

Drone.prototype.aux1 = function(value) {
  this.channels[AUX1_CHANNEL] = value;
};

Drone.prototype.aux2 = function(value) {
  this.channels[AUX2_CHANNEL] = value;
};

Drone.prototype.aux3 = function(value) {
  this.channels[AUX3_CHANNEL] = value;

};

Drone.prototype.aux4 = function(value) {
  this.channels[AUX4_CHANNEL] = value;
};


Drone.prototype.arm = function(callback){
  this.transmitSimpleCommand(MSP_ARM, callback);
};

Drone.prototype.disarm = function(callback){
  this.transmitSimpleCommand(MSP_DISARM, callback);
};

Drone.prototype.trimUp = function(callback){
  this.transmitSimpleCommand(MSP_TRIM_UP, callback);
};
Drone.prototype.trimDown = function(callback){
  this.transmitSimpleCommand(MSP_TRIM_DOWN, callback);
};
Drone.prototype.trimLeft = function(callback){
  this.transmitSimpleCommand(MSP_TRIM_LEFT, callback);
};
Drone.prototype.trimRight = function(callback){
  this.transmitSimpleCommand(MSP_TRIM_RIGHT, callback);
};


Drone.prototype.transmitSimpleCommand = function (command, callback) {
  var simplePkg = withHeader(new Buffer(6));
  simplePkg[3] = 0;
  simplePkg[4] = command;

  // calculate the checksum
  var checkSum = 0;
  checkSum ^= (simplePkg[3] & 0xFF);
  checkSum ^= (simplePkg[4] & 0xFF);

  simplePkg[5] = checkSum;

  this.writeTo(
      kSerialCharacteristic,
      simplePkg
    );
};
