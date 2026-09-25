# Trend Duel

An English browser game about search trends. Two question modes, endless or customizable sessions, streak bonuses, keyboard controls, a local personal best, and WebRTC multiplayer. No build step or gameplay backend. Multiplayer bundles PeerJS 1.5.5 and uses its public signaling service.

## Play locally

Install Node.js 22 or newer, run `npm start` in this folder, and open http://127.0.0.1:4173. Use an HTTP server rather than double-clicking the HTML file (the game uses JavaScript modules).

## Publish on GitHub Pages

1. Upload this entire project to your repository, including `.github/workflows/pages.yml`.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. Push to `main` or run **Deploy Trend Duel to GitHub Pages** from the Actions tab.

The workflow publishes only `dist/`. All asset links are relative, so repository subpaths work. If your default branch is not `main`, adjust the workflow. Alternatively publish the contents of `dist/` using your own static hosting setup.

## Data transparency

Built-in comparisons and monthly curves are **invented demonstration data**; their rankings are not measured Google Trends results. Historical event notes provide context but do not establish the illustrated search volume. The UI labels the dataset and charts accordingly.

Demo duels build random pairings from 28 pictured topics (378 possible pairs). Each cycle includes all 378 unique pairs in a random order; endless play starts a fresh cycle when the current cycle runs out. Recent pairs are moved to the end of a new cycle. A topic may appear in multiple different pairs. The queue and recent-result display stay bounded in memory. Synthetic interest profiles are deterministic for each topic and selected context, with ties resolved for gameplay. Imported CSV comparisons remain intact. Session settings offer endless play or 10, 25, 50, or 100 rounds, plus quick, normal, suspenseful, or instant reveals. Settings persist locally; active session progress does not. End session calculates results from answered rounds only. Imported CSV games remain one round. Normal reveals animate for approximately 1.5 seconds; percentages are each term’s share of the two displayed interest indices, not shares of all Google searches. Reduced-motion preferences disable the animations.

To use actual data, open **About the data** and import an English Google Trends **Interest over time** CSV containing exactly two terms exported together. One import becomes one round. The game compares arithmetic means of the exported observations on their shared 0–100 scale. `<1` is approximated as 0.5; tied, incomplete, malformed or out-of-range comparisons are rejected. Dates and original series labels remain visible. The import is local and is not uploaded or persisted. Calendar mode retains its demo curves.

Do not compare independently normalized exports. Google Trends indices represent relative interest, not search counts. Sources: [data methodology](https://support.google.com/trends/answer/4365533?hl=en), [CSV exports](https://support.google.com/trends/answer/4365538?hl=en).

## Multiplayer

Open **Multiplayer** or `multiplayer.html`. Choose a nickname and create a room, then send its code or invite link to friends. Everyone clicks **Ready up**, and the host starts. In 2v2, choose Team Lime or Team Violet before readying up. Each team must have exactly two players.

- **1v1:** exactly two players, individual scores.
- **2v2:** exactly four players; a team's score is the sum of both players' scores. Each player answers independently.
- **Free for all:** 2–8 players, individual scores.
- Both Trend Duel and Guess the Peak support 10, 25, 50, or endless rounds, with 15, 30, or 60 seconds per round.
- The host owns the question queue, deadline, answer validation, and scores. Guests receive no answer or interest values until every connected player answers or the host's deadline expires. One answer per player and round is accepted. No speed bonuses, so latency does not change points; an answer still has to reach the host before the deadline.
- The host advances after each reveal and can end the match or return everyone to the lobby for a rematch. Imports are solo-only; multiplayer uses the clearly labeled demo dataset.

### Hosting and connection requirements

The existing GitHub Pages workflow includes all multiplayer files. Serve the site over HTTPS (GitHub Pages does this), or localhost during development. Friends should open the deployed site; a `127.0.0.1` invite refers to each recipient's own computer.

PeerJS Cloud brokers signaling over HTTPS/WebSocket; game state travels on encrypted WebRTC data channels in a host-and-guests topology. The local vendor library is pinned to **PeerJS 1.5.5**, its npm archive integrity was verified, and its MIT license is in `dist/vendor/peerjs-LICENSE.txt`. See [PeerJS](https://peerjs.com/client/getting-started) and [connection options](https://peerjs.com/client/api/peer).

`dist/rtc-config.js` controls signaling and ICE servers. Default STUN servers work when a direct route is possible. **No TURN service is bundled:** restrictive firewalls or symmetric NAT may prevent a connection; the UI times out with a useful message. For broader network compatibility, configure your own TURN service and optionally your own PeerServer. Do not put private long-lived TURN credentials in a public repository; production credentials should be short-lived and issued by your service.

Keep the host tab open and awake. There is no host migration, mid-match rejoin, account authentication, or saved room recovery. When a player disconnects, 1v1/2v2 stops rather than silently changing the format. Free-for-all continues while at least two players remain; disconnected players keep their earned scores. A disconnected host ends the room for guests. Joiners are accepted only in the lobby. Match information and recent-result UI remain bounded in memory during endless play.

This is a game for friends, not a tamper-proof ranked service: the host is trusted, and a determined player can inspect the bundled demo dataset. Nicknames and scores are shared with room members. WebRTC exposes network connection information to peers/signaling infrastructure; no camera or microphone is requested. Room codes are random invite handles, not accounts or passwords.

### Validation

`npm test` covers solo rules plus all three multiplayer formats, readiness/team balance, hidden answers, duplicate/stale/late inputs, timeouts, scoring, endless play, disconnects, and rematches. All three formats were also exercised with real WebRTC connections through PeerJS Cloud between up to four browser peers on the same computer, including synchronized scoring, a timer expiry, a completed match, rematch, and player/host departures. Cross-network connectivity depends on signaling availability and ICE/TURN configuration.

## Development commands

- `npm run check` — JavaScript syntax validation.
- `npm test` — CSV import, score rules, and dataset invariants.
- `dist/data.js` — demo content.
- `dist/app.js` — game and UI.
- `dist/style.css` — responsive styles.
- `dist/images/` and `dist/images.js` — bundled topic artwork; no external image requests during play.
- `dist/credits.html` — image authors, source pages, and usage terms. Artwork retains its individual copyright and licenses.

Only the demo personal best uses localStorage, with an in-memory fallback if storage is unavailable. Fonts load from Google Fonts, with system font fallbacks. The browser’s experimental WebMCP API is feature-detected for a read-only game-state tool; normal play never depends on it.
