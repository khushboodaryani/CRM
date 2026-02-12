// src/utils/device.js 

import { v4 as uuidv4 } from 'uuid';

export const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem('deviceId', deviceId);
        console.log('Generated new device ID:', deviceId);
    } else {
        console.log('Using existing device ID:', deviceId);
    }
    return deviceId;
};

// Removed clearDeviceId as we want to persist the device ID