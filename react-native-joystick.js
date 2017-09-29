import React, {Component} from 'react';
import {
    AppState,
    Alert,
    Image,
    AppRegistry,
    StyleSheet,
    Text,
    View,
    PanResponder,
    Animated,
    Dimensions
} from 'react-native';

var net = require('net')
var _ = require('lodash')

var Packet = function(parameters) {
     var defaults = {
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

    if(parameters && parameters.slidersArray && parameters.slidersArray.length !== 9){
        parameters.slidersArray = defaults.slidersArray;
        console.log('new Packet: slidersArray.length should be exactly 9; defaulting ');
    }

    for(p in parameters){
        this[p.toString()] = parameters[p.toString()];
    }

    _.defaults(this, defaults);
}

Packet.prototype.getBuffer = function(){
    var array = new Uint8Array(22);

    array.set([80, 75, 84, // 'P', 'K', 'T'
               this.power, this.angle/2, this.rotation, this.staticTilt,
               this.movingTilt, this.onOff, this.accX, this.accY]);
    array.set(this.slidersArray, 11);
    //pack distance in 2 bytes (big endian)
    array.set([~~(this.duration / 256), this.duration % 256], 20);

    return new Buffer(array);
}

let CIRCLE_RADIUS = 36;
let DEG_TO_RAD = 57.29578;


let Window = Dimensions.get('window');
let styles = StyleSheet.create({
    mainContainer: {
        flex    : 1
    },
    dropZone    : {
        height  : 100,
        backgroundColor:'#2c3e50'
    },
    text        : {
        marginTop   : 25,
        marginLeft  : 5,
        marginRight : 5,
        textAlign   : 'center',
        color       : '#fff'
    },
    draggableContainer: {
        position    : 'absolute',
        top         : Window.height/2 - CIRCLE_RADIUS,
        left        : Window.width/2 - CIRCLE_RADIUS,
    },
    circle      : {
        width               : CIRCLE_RADIUS*2,
        height              : CIRCLE_RADIUS*2,
        borderRadius        : CIRCLE_RADIUS
    }
});

export default class RNJoystick extends Component{
    constructor(props){
        super(props);

        this.state = {
            showDraggable   : true,
            dropZoneValues  : null,
            pan             : new Animated.ValueXY()
        };

        this.getPower = (x, y) => {
            absDistFromCentre = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
            relDistFromCentre = Math.trunc(absDistFromCentre / (Window.width / 2) * 100);
            return relDistFromCentre > 100 ? 100 : relDistFromCentre;
        }

        // This funky looking function transforms movements gestures from screen coordinate
        // system to the STEMI Hexapod coordinate system.
        this._getAngle = (x, y) => {
            if (y === 0) return 0;
            if (y < 0) return Math.atan(x/y) * DEG_TO_RAD * -1;
            if (x === 0) return 180;
            if (x > 0) return Math.atan(y/x) * DEG_TO_RAD + 90;
            if (x < 0) return Math.atan(y/x) * DEG_TO_RAD - 90;
        }

        this.getAngle = (x, y) => Math.trunc(this._getAngle(x,y));

        this.panResponder = PanResponder.create({
            onStartShouldSetPanResponder    : () => true,
            onPanResponderMove              : (evt, gestureState) => {
                var dx = gestureState.dx;
                var dy = gestureState.dy;
                this.currentPacket = new Packet({power: this.getPower(dx, dy), angle: this.getAngle(dx, dy)});
                console.log('x: ' + dx + ' y: ' + dy + ' power: ' + this.getPower(dx, dy) + ' angle: ' +  this.getAngle(dx, dy));
                Animated.event([null, {
                    dx  : this.state.pan.x,
                    dy  : this.state.pan.y
                }])(evt, gestureState);
            },
            onPanResponderRelease           : (evt, gestureState) => {
                this.currentPacket = new Packet();
                    Animated.spring(
                    this.state.pan,
                    {toValue:{x:0,y:0}}
                ).start();
            }
        });
    }

    componentDidMount() {
        this.socket = new net.Socket();
        this.socket.setTimeout(3000);
        this.currentPacket = new Packet();
        var self = this;
        self.socket.on('data', function(data){ console.log('Received: ' + data); });
        var connectError = function(){
            console.log('Can\'t connect to TCP socket. (' + self.ip + ':' + self.port +')');
        }
        self.socket.on('timeout', connectError);
        self.socket.on('error', connectError);
        self.socket.on('connect', function(){
            self.socket.setTimeout(0);
            self.connected = true;
            self.robotState = 'running';
        });

        self.socket.connect('80', '192.168.4.1');

        self.intervalSender = setInterval(function(){
            try {
                self.socket.write(self.currentPacket.getBuffer());
            } catch (e) {
                console.log('TCP Socket Exception: write failed.');
                Alert.alert(
                'Connection lost.',
                ('Mobile phone lost connection with STEMI Hexapod. Please go to the WiFi settings' +
                ' on your phone and connect to the WiFi network named STEMI-XXXXXXX, where X is a' +
                ' number between 0-9. Password for the network is "12345678".'),
                [
                    {text: 'Got it', onPress: () => console.log('OK Pressed')},
                ],
                  { cancelable: true }
                );
            }
        }, 100);
    }

    componentWillUnmount() {
        clearInterval(this.intervalSender);
        this.socket.end();
    }

    render(){
        return (
            <View style={styles.draggableContainer}>
                <Animated.Image
                    {...this.panResponder.panHandlers}
                    style={[this.state.pan.getLayout(), styles.circle]}
                    source={require('./assets/joystick_button.png')}>
                </Animated.Image>
            </View>
        );
    }
}
