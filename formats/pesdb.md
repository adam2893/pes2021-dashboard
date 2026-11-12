# pesdb tables (`common/etc/pesdb/*.bin`)

Reader: `src/engine/formats/pesdb/`. Oracle: `src/tools/oracles/pesdb_oracle.py` (FootballLife `tools/pesdb.py`).
Confidence: **confirmed-oracle** = my C++ matches the FL oracle on the real files (counts and SHA-256 of a text dump);
this proves the reader follows FL's layout, not that FL's layout is the game's meaning. **probable** = taken from FL docs,
checked only through the oracle. **guess** = my reading, no source.

## Container (confirmed-oracle, 5 tables, dt00 and dt10)

`ff 10 81 'W' 'E' 'S' 'Y' 'S'`, `u32 zsize`, `u32 usize`, then a zlib stream (`78 01`). `zsize + 16` equals the file size
exactly in every file checked. `Player.bin` is 1,227,684 bytes because that is the **compressed** file: zsize 1,227,668,
usize 5,547,984 = 17,782 x 312. No encryption. Bytes 0 to 2 (`ff 10 81`) are unexplained and ignored (probable: version/flags).
Input without the tag is treated as an already unwrapped table (FL's loader does the same).

dt00 and dt10 hold byte-identical decoded copies of these five tables (dt10 overrides in the VFS but changes nothing here).
Counts: Player 17,782, Team 663, Competition 91, CompetitionEntry 1,291, CompetitionKind 9. RE-INVENTORY's
"27,927 players shipped" and "743 teams" do not match this install (guess: different build or FL's modified data).

## Player (312 bytes)

| field | where | confidence |
|---|---|---|
| id | u32 at +0x08 | confirmed-oracle |
| playing style | bit 155, w5 | probable (FL doc, oracle-matched) |
| height | bit 216, w7, +100 cm | probable |
| nationality | bit 233, w9 | probable |
| weight | bit 256, w7, +30 kg | probable |
| age | bit 408, w6, +15 | probable |
| registered position | bit 434, w4 (0 GK .. 12 CF) | probable |
| owning club (loans) | u32 at +0x04, team id, 0 if not on loan | probable (probe 21: 877 of 1,249 loanees back at this club in a European-league ML) |
| contract end date | +0x0C, low 25 bits, YYYYMMDD decimal (e.g. 20230630) | probable (value spread, 0 for 16 players) |
| Player field 0x30 (strength bonus, clamped to 7 by Team_ComputeStrength) | bit 451, w3 | confirmed (3,000 of 3,000 players vs memory dword 6 bits 28-30) |
| loan end date | +0x10, low 25 bits, YYYYMMDD decimal | probable (probe 21: 876 of 877 loan returners end on or before 20200630) |
| names | 4 x 61 bytes UTF-8 at +0x44: full, shirt, screen, printed | confirmed-oracle (strings read plausibly: Japanese full name, Latin shirt names) |
| +0x00..+0x07, other bits | kept in `raw`; `bit_field()` reads any | unknown |

Not decoded here: the other 90 ability/skill fields (FL docs list them; read through `bit_field`). Age looks like a
stored value, not a birth date (guess, from the +15 offset).

## Team (1532 bytes)

id u32 +0x08 (probable), name 70 bytes at +0x170 (probable, English slot), first dword +0x00 (guess: Coach id, from RE-INVENTORY). Country: bit 562, width 9 (probable: 80 of 80 continental-draw keys). Category: bit 636, width 3: 2 other European club, 6 other South American club, 7 other club, 1 classics team, 5 ML default team, 0 league clubs, AFC clubs and national teams (probable: it reproduces the ML team-record order, 555 of 555). Rest in `raw`.

## Competition (36 bytes)

byte 3 >> 3 area, byte 4 parent, byte 5 id, byte 6 flags, 28-byte code at +0x08 (all probable; bytes 0, 1 = 100, 200, byte 2 and 7 unread).
`parent` is FL's name; the data shows e.g. 1, 2 and 0 for different rows, meaning unverified (guess).

## CompetitionEntry (12 bytes)

u32 team id, u32 row id, u32 holding comp id in the low byte and a slot above it (probable).

## CompetitionKind (88 bytes)

byte 0 kind id 1..9 (confirmed-oracle: ids 1..9 map to PLAYOFF, GROUPSTAGE, KNOCKOUT, LEAGUE, LEAGUE_2SEASONS, QUALIFICATION_1, QUALIFICATION_2, PRACTICE, SPLIT_TOTAL);
bytes 1 to 3 unknown (byte 1 differs per row); 61-byte Japanese name at +0x04; 23-byte code at +0x41. The layout is **my reading**
of the hex (FL gives only the record size); the oracle for this table uses the same offsets, so it checks consistency, not correctness (guess to probable).

## Not supported

Coach, Stadium, CompetitionRegulation (2352 B), PlayerAssignment, Country and the other tables; Player ability fields as named members; writing/packing.
