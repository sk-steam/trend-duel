// Конфігурація STUN/TURN серверів для пробивання NAT
const peerConfiguration = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelay',
        credential: 'openrelay'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelay',
        credential: 'openrelay'
      }
    ]
  }
};

// Створення Peer з відловом помилок
const peer = new Peer(peerConfiguration);

// Виведення помилок PeerJS у консоль для діагностики
peer.on('error', (err) => {
  console.error('PeerJS Error:', err.type, err);
});