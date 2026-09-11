# Chillax

Free Chrome watch party for **YouTube** and **Netflix**: synced playback, group chat, voice/video, avatars, and emoji reactions.

Everyone uses their own YouTube or Netflix account. Chillax does not skip, hide, or block platform ads, and it does not re-stream or decrypt video.

## Install (unpacked, for you)

1. Install [Node.js 20+](https://nodejs.org/).
2. In this folder:
   ```bash
   npm install
   npm run build
   ```
3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the `dist` folder.
4. Pin Chillax. Open a YouTube video or a Netflix title (`/watch/...`), then start a party.

Development with reload:

```bash
npm run dev
```

Load unpacked from `dist` (CRXJS writes the extension there).

## Send to friends (no Chrome Web Store)

Friends cannot double-click a `.crx`. They load the unzipped folder once.

Live installer: [chillax-ruby.vercel.app](https://chillax-ruby.vercel.app). Send friends that link.

The zip also lives on [GitHub Releases](https://github.com/ganeshdipdumbare/chillax/releases/latest) — latest file: [chillax-for-friends.zip](https://github.com/ganeshdipdumbare/chillax/releases/latest/download/chillax-for-friends.zip). That is the right place to store the binary; it is not committed into git. New `v*` tags build and attach a zip automatically.

To publish an update:

```bash
npm run pack-site
npx vercel deploy --prod
```

The site is `install.html` plus `chillax-for-friends.zip`. They download, unzip, and follow the steps. Chrome still will not install from a webpage the way the Web Store does.

Without Vercel, pack locally:

1. `npm run pack` writes `chillax-for-friends.zip` in this folder.
2. Send that zip (AirDrop, iMessage, Drive).
3. Tell them: unzip it, open `install.html`, follow the six steps.

The guide is [public/install.html](public/install.html). It also ships inside the zip.

They must leave the unzipped folder on disk. After Chrome restarts, if a “Disable developer mode extensions” popup appears, they click **Cancel**.

## Storybook

UI pieces (avatars, chat, reactions, call tiles) run in isolation:

```bash
npm run storybook
```

Open [http://localhost:6006](http://localhost:6006). Static export: `npm run build-storybook`.

## How to party

1. Host opens the same video everyone will watch.
2. Pick an avatar, then **Start the night** in the Chillax sidebar or popup.
3. Copy the invite link (YouTube query `?chillax=`, Netflix hash `#chillax=`).
4. Guests install Chillax, open the link, and allow the microphone when prompted.
5. Camera starts **off**. Mute is one click. Use the reaction bar under chat. Parties cap at **8** people.

If Netflix strips the hash, guests can paste the party code (starts with `cx`) under **Join with code**. They must already be on the same title.

A YouTube host cannot sync a Netflix guest.

## Voice and video

Mic and camera run in an extension page, so Chrome should prompt for **Chillax**, not YouTube or Netflix.

Audio and video are **WebRTC mesh** between browsers. Chat and playback sync use a host-centered DataChannel. Signaling uses the public [PeerJS](https://peerjs.com/) broker; media is not sent through that broker after connect.

v1 uses STUN only (no TURN). Some networks (symmetric NAT / strict firewalls) will fail the call. Chat and playback sync may still work. A TURN server (for example [Metered](https://www.metered.ca/tools/openrelay/)) is the first reliability upgrade.

Use headphones so the mic does not pick up the movie or other people.

## Privacy

- Chillax does not store chat, video, or audio on a server we run.
- Nickname and avatar are saved in `chrome.storage.local` on your machine.

## Publish to the Chrome Web Store

Google reviews every listing. Watch-party extensions that overlay YouTube/Netflix can be approved (Teleparty is in the store), but it is not guaranteed. Follow these steps.

### 1. Make a developer account

1. Sign in with a Google account at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Pay the one-time **$5** registration fee.
3. Complete identity / tax info if Google asks. A published extension that uses camera/mic is easier to trust with a real publisher name.

### 2. Put a privacy policy on the public web

Chrome will reject camera + microphone without a policy URL. Host a page (GitHub Pages, Notion public page, or your site) that says, in plain language:

- What you collect: nickname and avatar in local storage only.
- What you do **not** collect: chat, voice, video, and watch history are peer-to-peer and not stored by you.
- Permissions: `storage`, `camera`, `microphone`, and access to YouTube/Netflix pages to sync the player and show the overlay.
- How to delete data: uninstall the extension.
- Contact email.

### 3. Build a store zip

```bash
npm run build
cd dist
zip -r ../chillax-extension.zip .
```

Zip the **contents of `dist`**, not the parent repo. Do not include `node_modules` or source.

Bump `version` in [package.json](package.json) and [manifest.config.ts](manifest.config.ts) before each upload (for example `1.0.1`). Chrome does not accept a reused version number.

### 4. Screenshots and listing copy

In the dashboard, **New item** → upload `chillax-extension.zip`.

You will need:

- **Icon:** 128×128 Cx mark (already at `public/icons/icon128.png`).
- **Screenshots:** at least one 1280×800 or 640×400 of the sidebar on YouTube (and Netflix if you can). No other product’s trademarks in a misleading way. Crop so Chillax is obviously a separate overlay, not YouTube/Netflix UI.
- **Small promo tile** (optional): 440×280.
- **Name:** Chillax
- **Summary:** Watch YouTube and Netflix together with synced playback, chat, and voice/video.
- **Category:** Social or Fun (pick the closest).
- **Language**
- **Single purpose:** say it syncs playback and adds party chat/call on those sites. Do not claim to be YouTube or Netflix.

Permission justifications (write honestly):

- `storage` — save nickname and avatar on this device.
- `camera` / `microphone` — optional in-party call; prompted as Chillax.
- Host access to youtube.com / netflix.com — inject the party overlay and control the local player. Users still need their own account. You do not download or decrypt video.

### 5. Privacy practices form

In the listing, declare:

- You do **not** sell user data.
- You do **not** use remote code except the PeerJS signaling host (disclose `0.peerjs.com` as the WebRTC broker).
- Limited use of YouTube/Netflix page access: overlay + player sync only.

### 6. Submit for review

Click **Submit for review**. First review often takes a few days. Common rejection reasons:

- Overlay looks like official YouTube/Netflix chrome.
- Missing or vague privacy policy.
- Camera/mic used without a clear in-product prompt.
- Unrelated host permissions.
- Version / zip mismatch.

If rejected, Google emails a reason. Fix, bump the version, upload a new zip.

### 7. After it is live

- Share the store URL. Guests still install Chillax, then open your invite link.
- Each store update: bump version → `npm run build` → zip `dist` → upload → submit again.
- Keep the privacy policy URL working forever, or the listing can be taken down.

## Verify locally

Use two Chrome profiles with the unpacked extension.

- YouTube: same video, play/pause/seek follow the host, chat and reactions appear in the sidebar, SPA navigation still finds the player.
- Voice/video: mic both ways; camera tiles only in the Chillax panel; mute and camera-off; movie audio still plays.
- Netflix: logged-in profiles that can play the same title; hash invite or join-with-code; wrong-title prompt if IDs differ.

Netflix cannot be verified without a logged-in Netflix session.
