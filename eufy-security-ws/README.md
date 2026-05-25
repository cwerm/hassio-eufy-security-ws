# Home Assistant Add-on: eufy-security-ws

![Logo][logo]

[![Release][release-shield]][release] ![Project Maintenance][maintenance-shield]

![Supports aarch64 Architecture][aarch64-shield] [![Docker aarch64 Pulls][docker-aarch64-shield]][docker-aarch64]

![Supports amd64 Architecture][amd64-shield] [![Docker amd64 Pulls][docker-amd64-shield]][docker-amd64]

![Supports armhf Architecture][armhf-shield] [![Docker armhf Pulls][docker-armhf-shield]][docker-armhf]

![Supports armv7 Architecture][armv7-shield] [![Docker armv7 Pulls][docker-armv7-shield]][docker-armv7]

![Supports i386 Architecture][i386-shield] [![Docker i386 Pulls][docker-i386-shield]][docker-i386]

Allows you to use your Eufy devices.

It bridges events and allows you to control your Eufy devices via websocket. In this way you can integrate your Eufy devices with whatever smart home infrastructure you are using.

See Documentation tab for more details.

## 2FA Verification Support

If your Eufy account has two-factor authentication (2FA) enabled, the add-on includes a built-in web UI and REST endpoint to enter your verification code during initial login.

### How it works

1. Start the add-on. If 2FA is required, the add-on will request a verification code from Eufy.
2. Open `http://<your-home-assistant-ip>:3001` in your browser.
3. The status indicator will show **"Verification code required"** when a code is pending.
4. Enter the 6-digit code from your email/SMS and click **Verify Code**.
5. Once accepted, the add-on completes authentication. You only need to do this once per login session.

### REST API

You can also submit the code programmatically:

```bash
curl -X POST http://<your-home-assistant-ip>:3001/verify \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Web UI for entering the 2FA code |
| `GET` | `/status` | Returns `{ "tfaPending": bool, "wsConnected": bool }` |
| `POST` | `/verify` | Submit a code: `{ "code": "123456" }` |

### Configuration

The 2FA helper runs on port **3001** by default. You can change this in the add-on configuration:

```yaml
tfa_port: 3001
```

[logo]: https://raw.githubusercontent.com/bropat/hassio-eufy-security-ws/master/eufy-security-ws/logo.png
[docker-amd64-shield]: https://img.shields.io/docker/pulls/bropat/hassio-eufy-security-ws-amd64?label=docker%20pulls%20amd64&logo=docker
[docker-amd64]: https://hub.docker.com/repository/docker/bropat/hassio-eufy-security-ws-amd64/general
[docker-aarch64-shield]: https://img.shields.io/docker/pulls/bropat/hassio-eufy-security-ws-aarch64?label=docker%20pulls%20aarch64&logo=docker
[docker-aarch64]: https://hub.docker.com/repository/docker/bropat/hassio-eufy-security-ws-aarch64/general
[docker-armhf-shield]: https://img.shields.io/docker/pulls/bropat/hassio-eufy-security-ws-armhf?label=docker%20pulls%20armhf&logo=docker
[docker-armhf]: https://hub.docker.com/repository/docker/bropat/hassio-eufy-security-ws-armhf/general
[docker-armv7-shield]: https://img.shields.io/docker/pulls/bropat/hassio-eufy-security-ws-armv7?label=docker%20pulls%20armv7&logo=docker
[docker-armv7]: https://hub.docker.com/repository/docker/bropat/hassio-eufy-security-ws-armv7/general
[docker-i386-shield]: https://img.shields.io/docker/pulls/bropat/hassio-eufy-security-ws-i386?label=docker%20pulls%20i386&logo=docker
[docker-i386]: https://hub.docker.com/repository/docker/bropat/hassio-eufy-security-ws-i386/general
[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg
[maintenance-shield]: https://img.shields.io/maintenance/yes/2024.svg
[release-shield]: https://img.shields.io/badge/version-v1.9.3-blue.svg
[release]: https://github.com/bropat/eufy-security-ws/releases/tag/1.9.3
Join us on Discord:

<a target="_blank" href="https://discord.gg/5wjQ2asb64"><img src="https://dcbadge.limes.pink/api/server/5wjQ2asb64" alt="" /></a>
