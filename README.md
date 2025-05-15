# at-transfer

at-transfer is a peer-to-peer file sharing service on top of the [AT Protocol](https://atproto.com)

> [!NOTE]
> This project is under development and is not yet feature-complete. Expect changes and potential issues or instability.

## Important Info!
- at-transfer uses peer-to-peer connections for file transfers. Due to the nature of the internet and WebRTC, transfers may fail or be unreliable across different networks, especially when devices are behind strict NATs, firewalls, or cellular networks. However, transfers will work consistently on local networks (such as home Wi-Fi), where devices can communicate directly.

- **No Central Relay:** at-transfer does not use a central relay (TURN) server by default, so fully serverless transfers are only possible when both peers can establish a direct connection.
- **Signaling Latency:** File transfer setup uses the AT Protocol for signaling, which may introduce some delay compared to direct WebSocket-based signaling.
- **Browser Compatibility:** Some browsers or mobile devices may have additional restrictions that affect connectivity.

## Features
- Peer-to-peer file sharing using the decentralized [AT Protocol](https://atproto.com).
- Direct and secure file transfer.

## Roadmap
- **Short-Term Goals**
    - Enhance documentation and provide clear setup instructions.
    - Implement a user-friendly interface for seamless file sharing.

### Long Term
- Achieve full feature-completion with robust security measures.
- Implementing AT Proto OAuth for better session management.

## Getting Started
Instructions on how to install and configure `at-transfer` will be added soon!

## Contributing
Contributions are welcome! I am working on a `CONTRIBUTING.md` guide!

## License
The project is MIT licensed!
