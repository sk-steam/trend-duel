// PeerJS Cloud handles discovery only. Match messages use WebRTC data channels.
// Override host/port/path here if you deploy your own PeerServer.
// Add your TURN service to iceServers for networks that block direct connections.
// Static sites cannot keep TURN passwords secret: use short-lived credentials
// supplied by your own service for production, never a private long-lived secret.
export const peerOptions={debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]}};
