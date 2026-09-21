import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosInstance';

let socket: Socket | null = null;
let connectingPromise: Promise<Socket> | null = null;

const connect = (): Promise<Socket> => {
  // Reuse the instance as soon as it exists (not only once `.connected` is true), and
  // if a connection attempt is already in flight, await that same attempt instead of
  // racing a second one. connect()/joinRoom()/on() are often called back-to-back
  // without awaiting each other (e.g. on screen mount) — since this function is async
  // (AsyncStorage read happens before the socket is created), two concurrent callers
  // could otherwise both see "no socket yet" and each spin up their own client,
  // silently orphaning one along with whatever listener was just attached to it.
  if (socket) return Promise.resolve(socket);
  if (connectingPromise) return connectingPromise;
  connectingPromise = (async () => {
    const token = await AsyncStorage.getItem('token');
    socket = io(api.defaults.baseURL as string, { auth: { token }, transports: ['websocket'] });
    connectingPromise = null;
    return socket;
  })();
  return connectingPromise;
};

const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const joinRoom = async (room: string) => {
  const s = await connect();
  s.emit('join', room);
};

const leaveRoom = (room: string) => {
  if (!socket) return;
  socket.emit('leave', room);
};

const on = async (event: string, cb: (...args: any[]) => void) => {
  const s = await connect();
  s.on(event, cb);
};

const off = (event: string, cb: (...args: any[]) => void) => {
  if (!socket) return;
  socket.off(event, cb);
};

export default { connect, disconnect, joinRoom, leaveRoom, on, off };
