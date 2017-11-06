import Packet from './Packet';
import { Socket } from 'net';

export default class PacketSender {
  constructor(port, ip, onError) {
    this.port = port;
    this.ip = ip;
    this.onError = onError;
    this.currentPacket = new Packet();
    this.socket = new Socket();
  }

  connect() {
    this.socket = new Socket();
    this.socket.setTimeout(0);
    this.socket.on('data', function (data) { console.log('Received: ' + data); });
    const connectError = () => {
      console.log('Can\'t connect to TCP socket. (' + this.ip + ':' + this.port + ')');
      if (this.onError) this.onError();
    }
    this.socket.on('timeout', connectError);
    this.socket.on('error', connectError);
    this.socket.connect(this.port, this.ip);
    this.intervalSender = setInterval(() => {
      try {
        this.socket.write(this.currentPacket.getBuffer());
      } catch (e) {
        console.log('TCP socket disconnected. (' + this.ip + ':' + this.port + ')');
        if (this.onError) this.onError();
      }
    }, 100);
  }

  updatePacket(parameters) {
    this.currentPacket = new Packet(parameters);
  }

  disconnect() {
    clearInterval(this.intervalSender);
    this.currentPacket = new Packet();
    this.socket.end();
  }
}
