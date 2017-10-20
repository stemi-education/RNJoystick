import _ from 'lodash';

export default class Packet {
    constructor(parameters) {
      const defaults = {
        power: 0,
        angle: 0,
        rotation: 0,
        staticTilt: 0,
        movingTilt: 0,
        onOff: 1,
        accX: 0,
        accY: 0,
        slidersArray: [50, 25, 0, 0, 0, 0, 0, 0, 0],
        duration: 0
      }
  
      if (parameters && parameters.slidersArray && parameters.slidersArray.length !== 9) {
        parameters.slidersArray = defaults.slidersArray;
        console.log('new Packet: slidersArray.length should be exactly 9; defaulting ');
      }
  
      for (p in parameters) {
        this[p.toString()] = parameters[p.toString()];
      }
  
      _.defaults(this, defaults);
    }
  
    getBuffer () {
      const array = new Uint8Array(22);
  
      array.set([80, 75, 84, // 'P', 'K', 'T'
        this.power, this.angle / 2, this.rotation, this.staticTilt,
        this.movingTilt, this.onOff, this.accX, this.accY]);
      array.set(this.slidersArray, 11);
      //pack distance in 2 bytes (big endian)
      array.set([~~(this.duration / 256), this.duration % 256], 20);
  
      return new Buffer(array);
    }
  }