# OpenBW Web source

This directory contains a pinned static snapshot of Heiner's browser port of OpenBW:

- Source: <https://github.com/heiner/openbw/tree/claudeweb>
- Pinned build: [`5f70e1300d4c`](https://github.com/heiner/openbw/commit/5f70e1300d4c)
- Original deployment: <https://openbw.heiner.ai/>
- Retrieved: 2026-07-24

The snapshot is hosted under `/openbw/`. It differs from the pinned deployment only by listing the included Weave map; the four map choices that returned HTTP 404 on the original deployment were removed.

Original StarCraft game data is not included in this repository. The browser downloads the required MPQ files directly from the Internet Archive on first launch and caches them in IndexedDB.

The included map's authorship and license are documented in [`maps/ATTRIBUTION.md`](maps/ATTRIBUTION.md).

## Retrieved artifact checksums

```text
81c9f6a625284eca1f7c70ec31b2c7bfc89e2409b8ddfeb8f0d7e45739181429  index.html
21fd9abb2c60a2e0494450120d89e5fa0280b0dabcb8b6876aa6fef347c16e4e  openbw.js (before removing unavailable map choices)
7db7e015e2afabfc127a0626ffcaaa84141e2fe545492f320cc50164f6f7cba2  net.js
2a5c9c7c2f20bb9c2dc8ead8225afd36a77dded23c25be14c0a9910dd7cb0ac6  openbw.wasm
1956cdf864ca30a5f5e6c438857ba715d07bfb80988077cbefae8431c63e0a94  maps/Weave_v1.scx
```
