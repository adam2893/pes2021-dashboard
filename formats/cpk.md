# CPK (CRI archive) format note

Written from reading `pes-file-tools` (no licence; read only, not copied) and checked against four
small PES 2021 archives. Status: layout `probable`, confirmed by the oracle comparison below for the
uncompressed path; the CRILAYLA path is verified only against vectors built from this note.

## Archive
- Offset 0: the header table, offset `TocOffset`: the TOC table. Each is a wrapper plus a @UTF table:
  4-byte tag (`CPK ` / `TOC `), u32 (ignored), u64 LE payload length, payload.
- Payload is either a plain `@UTF` table or XOR-masked: key starts 0x5f, `key = (key * 0x15) & 0xff`
  after every byte. Rule used: payload not starting with `@UTF` is unmasked.
- Entry data position = base + `FileOffset`. Base is `ContentOffset`, except when `0 < TocOffset < ContentOffset`,
  then `TocOffset` (PES: TocOffset 0x800, ContentOffset 0x1000, file offsets counted from 0x800; the
  Python reader hardcodes 0x800 which agrees here). `confirmed` on the 4 test archives.
- TOC columns used: `DirName`, `FileName`, `FileSize` (stored), `ExtractSize`, `FileOffset`, optional `ID`.
- Not implemented: ITOC (id-only archives), ETOC (timestamps), HTOC/GTOC, CRCs.
- An entry with `FileSize != ExtractSize` is CRILAYLA-compressed.

## @UTF table (big endian)
32-byte header after the 4-byte magic: u32 body length (bytes after the first 8), u32 rows offset,
u32 strings offset, u32 data offset (all relative to byte 8 of the table), u32 table-name string
offset, u16 column count, u16 row length, u32 row count. Column definitions follow at byte 32:
`u8 flags` (high nibble storage, low nibble type), `u32` name offset into the string pool, then for
constant columns the value inline.
- Storage: 1 = no value (null), 3 = constant (one value for all rows, stored in the column definition),
  5 = per row (stored in the row block).
- Types: 0 u8, 1 s8, 2 u16, 3 s16, 4 u32, 5 s32, 6 u64, 7 s64, 8 float32, 9 float64 (8 bytes),
  10 string (u32 offset into the pool, NUL terminated), 11 blob (u32 offset into data section + u32 length).
  Only 0, 2, 4, 6, 10 seen in PES CPKs; others are implemented from the usual CRI convention (`guess`).
- Row r starts at rows offset + r * row length; per-row columns are packed in column order.

## CRILAYLA (little endian header)
```
0x00  "CRILAYLA"
0x08  u32 body size   (bytes of output after the 0x100 prefix)
0x0c  u32 stream size (compressed stream length)
0x10  stream (stream size bytes)
0x10+stream size: 0x100 bytes stored raw
```
Output = those 0x100 raw bytes followed by the decoded body, so total = body + 0x100 = `ExtractSize`.
The stream is read **backwards**: first byte consumed is the last byte of the stream, bits MSB first.
The body is **written backwards**: first decoded byte lands at the end of the body.
Tokens: bit 0 then 8 bits = literal. Bit 1 = back reference: 13 bits `o` (distance `o + 3`), then a
length starting at 3 plus chunks of 2, 3, 5, then 8 bits repeated; each chunk is added, reading stops at
the first chunk that is not all ones. Copy goes byte by byte (overlap allowed): the byte at body index
`n-1-done` takes the value at `n-1-done+distance` (an already produced byte). Distance > bytes produced
or length past the body start is an error.

## Test and oracle
`tests/engine/cpk_unit_test.cpp` builds its own tables, archives and a CRILAYLA encoder from this note.
`tests/golden/cpk/*.txt` hold hashes only, produced by `/tmp/cpk_oracle/oracle.py` (pes-file-tools'
Python reader, run `python3 -I -B`, stdlib only) and compared by `cpk_golden_test` with env `PES_DATA`.
