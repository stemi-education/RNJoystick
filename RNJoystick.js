import React, { Component } from 'react';
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
import PacketSender from './PacketSender';

const CIRCLE_RADIUS = 36;
const DEG_TO_RAD = 57.29578;

// This funky looking function transforms movements gestures from screen coordinate
// system to the STEMI Hexapod coordinate system.
function calculateAngle(x, y) {
  if (y === 0) return 0;
  if (y < 0) return Math.atan(x / y) * DEG_TO_RAD * -1;
  if (x === 0) return 180;
  if (x > 0) return Math.atan(y / x) * DEG_TO_RAD + 90;
  if (x < 0) return Math.atan(y / x) * DEG_TO_RAD - 90;
}


const Window = Dimensions.get('window');
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1
  },
  dropZone: {
    height: 100,
    backgroundColor: '#2c3e50'
  },
  text: {
    marginTop: 25,
    marginLeft: 5,
    marginRight: 5,
    textAlign: 'center',
    color: '#fff'
  },
  draggableContainer: {
    position: 'absolute',
    top: Window.height / 2 - CIRCLE_RADIUS,
    left: Window.width / 2 - CIRCLE_RADIUS,
  },
  circle: {
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    borderRadius: CIRCLE_RADIUS
  }
});

export default class RNJoystick extends Component {
  constructor(props) {
    super(props);

    this.handlePanResponderMove = this.handlePanResponderMove.bind(this);
    this.handlePanResponderRelease = this.handlePanResponderRelease.bind(this);
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
    this.onCommunicationError = this.onCommunicationError.bind(this);

    this.packetSender = new PacketSender('80', '192.168.4.1', this.onCommunicationError);

    this.state = {
      showDraggable: true,
      dropZoneValues: null,
      pan: new Animated.ValueXY(),
      appState: AppState.currentState,
    };

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: this.handlePanResponderMove,
      onPanResponderRelease: this.handlePanResponderRelease,
    });
  }

  getPower(x, y) {
    absDistFromCentre = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    relDistFromCentre = Math.trunc(absDistFromCentre / (Window.width / 2) * 100);
    return relDistFromCentre > 100 ? 100 : relDistFromCentre;
  }

  getAngle(x, y) {
    return Math.trunc(calculateAngle(x, y));
  }

  handlePanResponderMove(evt, gestureState) {
    const dx = gestureState.dx;
    const dy = gestureState.dy;
    this.packetSender.updatePacket({ power: this.getPower(dx, dy), angle: this.getAngle(dx, dy) });
    console.debug('x: ' + dx + ' y: ' + dy + ' power: ' + this.getPower(dx, dy) + ' angle: ' + this.getAngle(dx, dy));
    Animated.event([null, {
      dx: this.state.pan.x,
      dy: this.state.pan.y
    }])(evt, gestureState);
  }

  handlePanResponderRelease(evt, gestureState) {
    this.packetSender.updatePacket({});
    Animated.spring(
      this.state.pan,
      { toValue: { x: 0, y: 0 } }
    ).start();
  }

  onCommunicationError() {
    Alert.alert(
      'Connection lost.',
      ('Mobile phone lost connection with STEMI Hexapod. Please go to the WiFi settings' +
        ' on your phone and connect to the WiFi network named STEMI-XXXXXXX, where X is a' +
        ' number between 0-9. Password for the network is "12345678".'),
      [
        { text: 'Got it', onPress: () => console.log('OK Pressed') },
      ],
      { cancelable: true }
    );
  }

  handleAppStateChange(nextAppState) {
    if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
      this.packetSender.connect();
    } else if (nextAppState.match(/inactive|background/) && this.state.appState === 'active') {
      this.packetSender.disconnect();
    }
    this.setState({ appState: nextAppState });
  }

  componentWillMount() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  render() {
    return (
      <View style={styles.draggableContainer}>
        <Animated.Image
          {...this.panResponder.panHandlers}
          style={[{ transform: this.state.pan.getTranslateTransform() }, styles.circle]}
          source={require('./assets/joystick_button.png')}>
        </Animated.Image>
      </View>
    );
  }
}
