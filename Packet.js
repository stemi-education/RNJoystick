export default class Packet {
  constructor(parameters) {
    this.power = 0;
    this.angle = 0;
    this.rotation = 0;
    this.staticTilt = 0;
    this.movingTilt = 0;
    this.onOff = 1;
    this.accX = 0;
    this.accY = 0;
    this.slidersArray = [50, 25, 0, 0, 0, 0, 0, 0, 0];
    this.duration = 0;

    if (parameters && parameters.slidersArray && parameters.slidersArray.length !== 9) {
      parameters.slidersArray = this.slidersArray;
      console.error('new Packet: slidersArray.length should be exactly 9; defaulting ');
    }

    Object.assign(this, parameters)
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
