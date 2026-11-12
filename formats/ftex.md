# ftex (Fox Engine texture) format note

Written from reading `pes-file-tools` `ftex.py` (no licence; read only, not copied) and checked
against 7 real PES 2021 entries by comparing the DDS output hash with the oracle. Status: layout
`probable`, `confirmed` for the cases below. All integers little endian.

## Header (64 bytes)
```
0x00 "FTEX"
0x04 f32  version     accepted 2.025 to 2.045 (seen: 2.03, 2.04)
0x08 u16  pixel format id
0x0a u16  width
0x0c u16  height
0x0e u16  depth       0 or 1 = plain 2D; >1 = volume texture
0x10 u8   mip count   must be > 0
0x11 u8   nrt flag    (meaning unknown, ignored)
0x12 u16  flags       (unknown, ignored)
0x14 u32, 0x18 u32    (unknown, ignored)
0x1c u32  texture type  bit 2 (value 4) = cube map; other bits (colour space) ignored. Seen 1, 3, 9.
0x20 u8   .ftexs side-file count   non-zero = textures split across .ftexs files: NOT supported
0x21 u8   unknown
0x22 14 bytes padding, 0x30 two 8-byte hashes (ignored)
```
Pixel format ids: 0 BGRA8 (A8R8G8B8), 1 R8, 2 BC1, 3 BC2, 4 BC3, 8 BC4, 9 BC5, 10 BC6H, 11 BC7,
12 RGBA16F, 13 RGBA32F, 14 RGB10A2, 15 RG11B10F. Other ids are errors. Seen in data: 2, 4, 9, 11.
Block size: 4x4 pixels for BC formats (8 bytes BC1/BC4, 16 otherwise), 1x1 for the rest.

## Mip table
Directly after the header: `faces * mip count` records of 16 bytes (faces = 6 for a cube map, else 1),
face-major. Record: u32 image offset (absolute, from file start), u32 uncompressed size,
u32 compressed size, u8 mip index (must equal the level within its face), u8 ftexs number, u16 chunk count.

Level size = ceil(w/b) * ceil(h/b) * depth * bytes per block, each of w, h, depth halved per level
(minimum 1). Cube maps use depth 1.

## Image data at the image offset
- chunk count 0, compressed size 0: `uncompressed size` raw bytes.
- chunk count 0, compressed size > 0: one zlib stream of `compressed size` bytes.
- chunk count N: table of N 8-byte records at the image offset: u16 compressed size, u16 uncompressed
  size, u32 offset (top bit masked off; relative to the image offset). A chunk is a zlib stream
  when the two sizes differ, else stored. An uncompressed size of 0 means 65536 (u16 wrap; real data uses
  64 KiB chunks). A zlib chunk must inflate to exactly that size, except the last, which is clamped to the level size. Chunks concatenate. (The writer side uses 16 KiB chunks.)
Result is zero padded or truncated to the level size. All 7 test entries use the chunked form.

## DDS output
Matches the oracle byte for byte: 128-byte header with mip count; linear size (of level 0) is set for
every format except BGRA8, which sets PITCH (4 * width) instead; BGRA8 uses a plain pixel-format block with masks; BC1/2/3 use DXT1/3/5 fourcc; every other format
uses a DX10 extension header (DXGI 61, 80, 83, 95, 98, 10, 2, 24, 26). Cube maps set the six face caps
bits; volumes set the depth bits and dimension 3D.

## Unsupported / unverified
- `.ftexs` side files (count > 0), PS4 tiling, texture-type colour-space bits.
- Formats 0, 1, 3, 8, 10 to 15, cube maps and volumes are exercised only by hand-built unit buffers.
- Kit textures in PES 2021: `Asset/model/character/uniform/texture/#windx11/u<id>*.ftex` in `dt34_g4.cpk`.
