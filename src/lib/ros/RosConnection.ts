import * as ROSLIB from 'roslib';

class RosConnection {
    private static instance: RosConnection;
    private ros: ROSLIB.Ros | null = null;
    private listeners: Set<(status: boolean) => void> = new Set();
    private isConnected: boolean = false;

    private constructor() {
        if (typeof window !== 'undefined') {
            this.connect();
        }
    }

    public static getInstance(): RosConnection {
        if (!RosConnection.instance) {
            RosConnection.instance = new RosConnection();
        }
        return RosConnection.instance;
    }

    private connect() {
        this.ros = new ROSLIB.Ros({
            url: 'ws://localhost:9090'
        });

        this.ros.on('connection', () => {
            this.isConnected = true;
            this.notifyListeners(true);
            console.log('Connected to websocket server.');
        });

        this.ros.on('error', (error: any) => {
            this.isConnected = false;
            this.notifyListeners(false);
            console.log('Error connecting to websocket server: ', error);
        });

        this.ros.on('close', () => {
            this.isConnected = false;
            this.notifyListeners(false);
            console.log('Connection to websocket server closed.');
            // Reconnect after 3 seconds
            setTimeout(() => this.connect(), 3000);
        });
    }

    public getRos(): ROSLIB.Ros | null {
        return this.ros;
    }

    public subscribeStatus(callback: (status: boolean) => void) {
        this.listeners.add(callback);
        callback(this.isConnected);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(status: boolean) {
        this.listeners.forEach(callback => callback(status));
    }

    public createTopic(name: string, messageType: string) {
        if (!this.ros) return null;
        return new ROSLIB.Topic({
            ros: this.ros,
            name: name,
            messageType: messageType
        });
    }
}

export default RosConnection;
