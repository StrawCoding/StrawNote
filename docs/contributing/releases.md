# StrawNote Release Process

## Version scheme（a.b.c.d）

```text
a.b.c.d
```

| Segment | Meaning                                                                                    |
| ------- | ------------------------------------------------------------------------------------------ |
| `a.b.c` | Product / feature line                                                                     |
| `d`     | Preview counter；**`d = 0` = 正式版**；**`d ≠ 0` = 測試／預覽**（等同舊 `{base}-pre-{N}`） |

Examples:

- `0.28.0.0` — 正式版（Play **production**）
- `0.28.0.1` — 測試版（Play **internal**）
- `0.28.1.0` — 下一正式小改

Git tags：`v0.28.0.0` / `v0.28.0.1`。

Play 雙軌（見 [play-release.md](../play-release.md)）：

- tag 以 `.0` 結尾（`d=0`）→ `play-production-release`
- 其他 `v*` → `play-internal-release`

Bump all workspace `package.json` (+ metainfo / iOS marketing):

```shell
./scripts/set-version.sh 0.28.0.0
```

---

## Legacy AFFiNE pre-release notes

Older canary used `{base}-pre-{N}`. New StrawNote line uses **a.b.c.d** only.

Trigger desktop RC via [.github/workflows/release.yml](../../.github/workflows/release.yml) when needed; mobile Play ships from the dual-track workflows above.
