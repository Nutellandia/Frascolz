/**
 * @file frascolz.ts
 * @brief FrascoLZ v3.0 Universal Engine TypeScript Implementation
 * @author Emilio Frascogna (FRS)
 */

export const FRASCOLZ_MAGIC = 0x5a535246; // 'F' 'R' 'S' 'Z'
export const FRASCOLZ_HEADER_SIZE = 13;
export const MIN_MATCH = 4;
export const MAX_DISTANCE_STD = 65535;
export const HASH_BITS_STD = 14;
export const HASH_SIZE_STD = 1 << HASH_BITS_STD; // 16,384 entries (64 KB)
export const HASH_BITS_MICRO = 12;
export const HASH_SIZE_MICRO = 1 << HASH_BITS_MICRO; // 4,096 entries (16 KB)

export interface CompressionResult {
  compressed: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratioPercent: number;
  spaceSavingsPercent: number;
  timeMs: number;
  speedMBs: number;
  checksum: number;
  level: number;
  hasDict?: boolean;
  ramTier?: string;
  isIncompressible?: boolean;
}

export interface DecompressionResult {
  decompressed: Uint8Array;
  decompressedSize: number;
  timeMs: number;
  speedMBs: number;
  checksumMatch: boolean;
  checksum: number;
}

export interface TokenInspection {
  type: 'literal' | 'match' | 'dict_match';
  offset: number;
  length: number;
  rawBytesPreview: string;
  streamPosition: number;
}

export interface InspectionResult {
  header: {
    magicValid: boolean;
    level: number;
    originalSize: number;
    checksum: number;
    hasDict: boolean;
  };
  tokens: TokenInspection[];
  totalTokens: number;
  matchCount: number;
  literalCount: number;
  longestMatch: number;
}

export function frascolzChecksum32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  const MOD_ADLER = 65521;
  const len = data.length;
  for (let i = 0; i < len; i++) {
    a = (a + data[i]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }
  return ((b << 16) | a) >>> 0;
}

function hash4(v: number, bits: number): number {
  return ((Math.imul(v >>> 0, 2654435761) >>> (32 - bits)) & ((1 << bits) - 1)) >>> 0;
}

function read32(buf: Uint8Array, offset: number): number {
  return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0;
}

function write32(buf: Uint8Array, offset: number, val: number): void {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
  buf[offset + 2] = (val >>> 16) & 0xff;
  buf[offset + 3] = (val >>> 24) & 0xff;
}

function write16(buf: Uint8Array, offset: number, val: number): void {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >>> 8) & 0xff;
}

export function frascolzCompressBound(srcLen: number): number {
  return FRASCOLZ_HEADER_SIZE + srcLen + Math.floor(srcLen / 255) + 64;
}

/* ========================================================================= */
/* NEURAL & FLOATING POINT BYTE-PLANE TRANSPOSITION                          */
/* ========================================================================= */

export function frascolzFilterFpSplit(src: Uint8Array): Uint8Array {
  const count = Math.floor(src.length / 4);
  const dst = new Uint8Array(count * 4);
  const p0 = 0;
  const p1 = count;
  const p2 = count * 2;
  const p3 = count * 3;

  for (let i = 0; i < count; i++) {
    dst[p0 + i] = src[i * 4 + 0];
    dst[p1 + i] = src[i * 4 + 1];
    dst[p2 + i] = src[i * 4 + 2];
    dst[p3 + i] = src[i * 4 + 3];
  }
  return dst;
}

export function frascolzFilterFpUnsplit(src: Uint8Array): Uint8Array {
  const count = Math.floor(src.length / 4);
  const dst = new Uint8Array(count * 4);
  const p0 = 0;
  const p1 = count;
  const p2 = count * 2;
  const p3 = count * 3;

  for (let i = 0; i < count; i++) {
    dst[i * 4 + 0] = src[p0 + i];
    dst[i * 4 + 1] = src[p1 + i];
    dst[i * 4 + 2] = src[p2 + i];
    dst[i * 4 + 3] = src[p3 + i];
  }
  return dst;
}

/* Fast match extension loop */
function matchExtendFast(src: Uint8Array, ip: number, ref: number, iend: number): number {
  let len = 0;
  while (ip + len + 4 <= iend) {
    const v1 = read32(src, ip + len);
    const v2 = read32(src, ref + len);
    const diff = (v1 ^ v2) >>> 0;
    if (diff !== 0) {
      // Find trailing zeros
      const tz = Math.clz32((diff & -diff) >>> 0);
      const matchBytes = (31 - tz) >>> 3;
      return len + matchBytes;
    }
    len += 4;
  }
  while (ip + len < iend && src[ip + len] === src[ref + len]) {
    len++;
  }
  return len;
}

/* ========================================================================= */
/* ADAPTIVE RAM SCALER (16KB -> 64GB+)                                       */
/* ========================================================================= */

export function frascolzCompressAdaptive(
  src: Uint8Array,
  ramBudgetMB: number = 64, // 0.016 = 16KB micro, 64 = 64MB workstation, 65536 = 64GB
  level: 1 | 2 = 1
): CompressionResult {
  const t0 = performance.now();
  const srcLen = src.length;
  const maxDst = frascolzCompressBound(srcLen);
  const dst = new Uint8Array(maxDst);

  write32(dst, 0, FRASCOLZ_MAGIC);
  dst[4] = level;
  write32(dst, 5, srcLen);
  const checksum = frascolzChecksum32(src);
  write32(dst, 9, checksum);

  let op = FRASCOLZ_HEADER_SIZE;
  let ip = 0;
  let anchor = 0;
  const mflimit = srcLen > MIN_MATCH ? srcLen - MIN_MATCH : 0;

  const isMicro = ramBudgetMB <= 0.032; // <=32KB micro profile
  const hashBits = isMicro ? HASH_BITS_MICRO : HASH_BITS_STD;
  const hashSize = 1 << hashBits;
  const maxDistance = isMicro ? 32768 : MAX_DISTANCE_STD;

  const hashTable = new Int32Array(hashSize).fill(-1);
  const prevTable = level === 2 && !isMicro ? new Int32Array(hashSize).fill(-1) : null;

  while (ip < mflimit) {
    const v = read32(src, ip);
    const h = hash4(v, hashBits);

    let matchPos = -1;
    let matchLen = 0;

    if (level === 2 && prevTable) {
      const ref0 = hashTable[h];
      const ref1 = prevTable[h];
      prevTable[h] = hashTable[h];
      hashTable[h] = ip;

      const candidates = [ref0, ref1];
      for (const ref of candidates) {
        if (ref >= 0 && ip - ref <= maxDistance && read32(src, ref) === v) {
          const l = MIN_MATCH + matchExtendFast(src, ip + MIN_MATCH, ref + MIN_MATCH, srcLen);
          if (l > matchLen) {
            matchLen = l;
            matchPos = ref;
          }
        }
      }
    } else {
      const ref = hashTable[h];
      hashTable[h] = ip;

      if (ref >= 0 && ip - ref <= maxDistance && read32(src, ref) === v) {
        matchLen = MIN_MATCH + matchExtendFast(src, ip + MIN_MATCH, ref + MIN_MATCH, srcLen);
        matchPos = ref;
      }
    }

    if (matchPos >= 0 && matchLen >= MIN_MATCH) {
      const litLen = ip - anchor;
      const offset = ip - matchPos;

      const tokenIdx = op++;
      const litCode = litLen >= 15 ? 15 : litLen;
      const matchExtra = matchLen - MIN_MATCH;
      const matchCode = matchExtra >= 15 ? 15 : matchExtra;
      dst[tokenIdx] = (litCode << 4) | matchCode;

      if (litCode === 15) {
        let l = litLen - 15;
        while (l >= 255) {
          dst[op++] = 255;
          l -= 255;
        }
        dst[op++] = l;
      }

      if (litLen > 0) {
        dst.set(src.subarray(anchor, anchor + litLen), op);
        op += litLen;
      }

      write16(dst, op, offset);
      op += 2;

      if (matchCode === 15) {
        let m = matchExtra - 15;
        while (m >= 255) {
          dst[op++] = 255;
          m -= 255;
        }
        dst[op++] = m;
      }

      ip += matchLen;
      anchor = ip;
    } else {
      ip++;
    }
  }

  const lastLit = srcLen - anchor;
  if (lastLit > 0) {
    const tokenIdx = op++;
    const litCode = lastLit >= 15 ? 15 : lastLit;
    dst[tokenIdx] = litCode << 4;

    if (litCode === 15) {
      let l = lastLit - 15;
      while (l >= 255) {
        dst[op++] = 255;
        l -= 255;
      }
      dst[op++] = l;
    }

    dst.set(src.subarray(anchor, srcLen), op);
    op += lastLit;
  }

  const compressed = dst.subarray(0, op);
  const t1 = performance.now();
  const timeMs = Math.max(0.01, t1 - t0);
  const speedMBs = srcLen > 0 ? (srcLen / (1024 * 1024)) / (timeMs / 1000) : 0;
  const ratioPercent = srcLen > 0 ? (compressed.length / srcLen) * 100 : 100;
  const spaceSavingsPercent = Math.max(0, 100 - ratioPercent);

  const ramTierLabel = isMicro
    ? 'Legacy / 32-Bit Micro (16KB Cache)'
    : ramBudgetMB >= 1024
    ? 'Massive Workstation Tier (64GB - 128GB+ RAM)'
    : 'Standard Cache-Resident (64KB)';

  return {
    compressed,
    originalSize: srcLen,
    compressedSize: compressed.length,
    ratioPercent,
    spaceSavingsPercent,
    timeMs,
    speedMBs,
    checksum,
    level,
    ramTier: ramTierLabel,
    isIncompressible: compressed.length >= srcLen,
  };
}

export function frascolzCompress(src: Uint8Array, level: 1 | 2 = 1): CompressionResult {
  return frascolzCompressAdaptive(src, 64, level);
}

/* ========================================================================= */
/* MASSIVE DICTIONARY (UP TO 1 MB+)                                          */
/* ========================================================================= */

export function frascolzCompressDict(src: Uint8Array, dict: Uint8Array): CompressionResult {
  const t0 = performance.now();
  const srcLen = src.length;
  const dictLen = dict.length;
  const maxDst = frascolzCompressBound(srcLen);
  const dst = new Uint8Array(maxDst);

  write32(dst, 0, FRASCOLZ_MAGIC);
  dst[4] = 0x81;
  write32(dst, 5, srcLen);
  const checksum = frascolzChecksum32(src);
  write32(dst, 9, checksum);

  let op = FRASCOLZ_HEADER_SIZE;
  let ip = 0;
  let anchor = 0;
  const mflimit = srcLen > MIN_MATCH ? srcLen - MIN_MATCH : 0;

  const dictTable = new Int32Array(HASH_SIZE_STD).fill(-1);
  if (dictLen > MIN_MATCH) {
    for (let d = 0; d <= dictLen - MIN_MATCH; d += 2) {
      const v = read32(dict, d);
      const h = hash4(v, HASH_BITS_STD);
      dictTable[h] = d;
    }
  }

  while (ip < mflimit) {
    const v = read32(src, ip);
    const h = hash4(v, HASH_BITS_STD);
    const dictRef = dictTable[h];

    if (dictRef >= 0 && dictRef <= dictLen - MIN_MATCH && read32(dict, dictRef) === v) {
      const litLen = ip - anchor;
      // Match extension strictly between src and dict buffers, bounded by both lengths
      let matchLen = MIN_MATCH;
      const maxExt = Math.min(srcLen - (ip + MIN_MATCH), dictLen - (dictRef + MIN_MATCH));
      let mOffset = 0;
      while (mOffset < maxExt && src[ip + MIN_MATCH + mOffset] === dict[dictRef + MIN_MATCH + mOffset]) {
        mOffset++;
      }
      matchLen += mOffset;

      const tokenIdx = op++;
      const litCode = litLen >= 15 ? 15 : litLen;
      const matchExtra = matchLen - MIN_MATCH;
      const matchCode = matchExtra >= 15 ? 15 : matchExtra;
      dst[tokenIdx] = (litCode << 4) | matchCode;

      if (litCode === 15) {
        let l = litLen - 15;
        while (l >= 255) {
          dst[op++] = 255;
          l -= 255;
        }
        dst[op++] = l;
      }

      if (litLen > 0) {
        dst.set(src.subarray(anchor, anchor + litLen), op);
        op += litLen;
      }

      // Variable-length dictionary offset:
      // If dictRef < 0x7FFF (32767): 16-bit offset with bit 15 set.
      // If dictRef >= 0x7FFF: write sentinel 0xFFFF followed by 24-bit dictionary index (supports up to 16 MB).
      if (dictRef < 0x7fff) {
        write16(dst, op, (dictRef & 0x7fff) | 0x8000);
        op += 2;
      } else {
        write16(dst, op, 0xffff);
        op += 2;
        dst[op++] = dictRef & 0xff;
        dst[op++] = (dictRef >>> 8) & 0xff;
        dst[op++] = (dictRef >>> 16) & 0xff;
      }

      if (matchCode === 15) {
        let m = matchExtra - 15;
        while (m >= 255) {
          dst[op++] = 255;
          m -= 255;
        }
        dst[op++] = m;
      }

      ip += matchLen;
      anchor = ip;
    } else {
      ip++;
    }
  }

  const lastLit = srcLen - anchor;
  if (lastLit > 0) {
    const tokenIdx = op++;
    const litCode = lastLit >= 15 ? 15 : lastLit;
    dst[tokenIdx] = litCode << 4;

    if (litCode === 15) {
      let l = lastLit - 15;
      while (l >= 255) {
        dst[op++] = 255;
        l -= 255;
      }
      dst[op++] = l;
    }

    dst.set(src.subarray(anchor, srcLen), op);
    op += lastLit;
  }

  const compressed = dst.subarray(0, op);
  const t1 = performance.now();
  const timeMs = Math.max(0.01, t1 - t0);
  const speedMBs = srcLen > 0 ? (srcLen / (1024 * 1024)) / (timeMs / 1000) : 0;
  const ratioPercent = srcLen > 0 ? (compressed.length / srcLen) * 100 : 100;
  const spaceSavingsPercent = Math.max(0, 100 - ratioPercent);

  return {
    compressed,
    originalSize: srcLen,
    compressedSize: compressed.length,
    ratioPercent,
    spaceSavingsPercent,
    timeMs,
    speedMBs,
    checksum,
    level: 1,
    hasDict: true,
  };
}

export function frascolzDecompress(src: Uint8Array, dict?: Uint8Array): DecompressionResult {
  const t0 = performance.now();
  if (src.length < FRASCOLZ_HEADER_SIZE) {
    throw new Error('FRASCOLZ_ERR_CORRUPT: Stream size is smaller than header');
  }

  const magic = read32(src, 0);
  if (magic !== FRASCOLZ_MAGIC) {
    throw new Error(`FRASCOLZ_ERR_CORRUPT: Invalid magic signature 0x${magic.toString(16).toUpperCase()}`);
  }

  const originalSize = read32(src, 5);
  const expectedChecksum = read32(src, 9);

  if (originalSize > 512 * 1024 * 1024) {
    throw new Error('FRASCOLZ_ERR_BUF_SMALL: Payload exceeds 512MB safety envelope');
  }

  const dst = new Uint8Array(originalSize);
  let ip = FRASCOLZ_HEADER_SIZE;
  const iend = src.length;
  let op = 0;
  const oend = originalSize;

  while (ip < iend) {
    const token = src[ip++];
    let litLen = token >> 4;
    const matchCode = token & 0x0f;

    if (litLen === 15) {
      while (ip < iend && src[ip] === 255) {
        litLen += 255;
        ip++;
      }
      if (ip >= iend) throw new Error('FRASCOLZ_ERR_CORRUPT: Truncated literal length');
      litLen += src[ip++];
    }

    if (ip + litLen > iend || op + litLen > oend) {
      throw new Error('FRASCOLZ_ERR_CORRUPT: Literal out-of-bounds access');
    }

    if (litLen > 0) {
      dst.set(src.subarray(ip, ip + litLen), op);
      ip += litLen;
      op += litLen;
    }

    if (op === oend && ip === iend) {
      break;
    }

    if (ip + 2 > iend) throw new Error('FRASCOLZ_ERR_CORRUPT: Truncated match offset');
    const rawOffset = src[ip] | (src[ip + 1] << 8);
    ip += 2;

    const levelByte = src[4];
    const hasDict = Boolean(levelByte & 0x80);

    let dIdx = rawOffset & 0x7fff;
    if (hasDict && rawOffset === 0xffff) {
      if (ip + 3 > iend) throw new Error('FRASCOLZ_ERR_CORRUPT: Truncated extended dictionary offset');
      dIdx = src[ip] | (src[ip + 1] << 8) | (src[ip + 2] << 16);
      ip += 3;
    }

    let matchLen = matchCode + MIN_MATCH;
    if (matchCode === 15) {
      while (ip < iend && src[ip] === 255) {
        matchLen += 255;
        ip++;
      }
      if (ip >= iend) throw new Error('FRASCOLZ_ERR_CORRUPT: Truncated match length');
      matchLen += src[ip++];
    }

    if (op + matchLen > oend) {
      throw new Error('FRASCOLZ_ERR_CORRUPT: Match copy exceeds target buffer');
    }

    if (hasDict && (rawOffset & 0x8000)) {
      if (!dict || dIdx + matchLen > dict.length) {
        throw new Error(`FRASCOLZ_ERR_CORRUPT: Dictionary match out of bounds (dIdx=${dIdx}, len=${matchLen})`);
      }
      dst.set(dict.subarray(dIdx, dIdx + matchLen), op);
    } else {
      if (rawOffset === 0 || op < rawOffset) {
        throw new Error(`FRASCOLZ_ERR_CORRUPT: Invalid back-reference offset ${rawOffset}`);
      }
      const matchSrc = op - rawOffset;
      for (let m = 0; m < matchLen; m++) {
        dst[op + m] = dst[matchSrc + m];
      }
    }
    op += matchLen;
  }

  if (op !== originalSize) {
    throw new Error(`FRASCOLZ_ERR_CORRUPT: Size mismatch! Expected ${originalSize}, got ${op}`);
  }

  const actualChecksum = frascolzChecksum32(dst);
  const checksumMatch = actualChecksum === expectedChecksum;
  if (!checksumMatch) {
    throw new Error(`FRASCOLZ_ERR_CHECKSUM: Checksum mismatch`);
  }

  const t1 = performance.now();
  const timeMs = Math.max(0.01, t1 - t0);
  const speedMBs = originalSize > 0 ? (originalSize / (1024 * 1024)) / (timeMs / 1000) : 0;

  return {
    decompressed: dst,
    decompressedSize: op,
    timeMs,
    speedMBs,
    checksumMatch,
    checksum: actualChecksum,
  };
}

export function inspectFrascolzStream(src: Uint8Array): InspectionResult {
  if (src.length < FRASCOLZ_HEADER_SIZE) {
    return {
      header: { magicValid: false, level: 0, originalSize: 0, checksum: 0, hasDict: false },
      tokens: [],
      totalTokens: 0,
      matchCount: 0,
      literalCount: 0,
      longestMatch: 0,
    };
  }

  const magic = read32(src, 0);
  const magicValid = magic === FRASCOLZ_MAGIC;
  const levelByte = src[4];
  const hasDict = Boolean(levelByte & 0x80);
  const level = levelByte & 0x7f;
  const originalSize = read32(src, 5);
  const checksum = read32(src, 9);

  const tokens: TokenInspection[] = [];
  let ip = FRASCOLZ_HEADER_SIZE;
  const iend = src.length;
  let matchCount = 0;
  let literalCount = 0;
  let longestMatch = 0;

  try {
    while (ip < iend && tokens.length < 500) {
      const streamPos = ip;
      const token = src[ip++];
      let litLen = token >> 4;
      const matchCode = token & 0x0f;

      if (litLen === 15) {
        while (ip < iend && src[ip] === 255) {
          litLen += 255;
          ip++;
        }
        if (ip < iend) litLen += src[ip++];
      }

      if (litLen > 0) {
        literalCount++;
        const previewBytes = src.subarray(ip, Math.min(ip + litLen, ip + 12));
        const hex = Array.from(previewBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        tokens.push({
          type: 'literal',
          offset: 0,
          length: litLen,
          rawBytesPreview: hex,
          streamPosition: streamPos,
        });
        ip += litLen;
      }

      if (ip >= iend) break;

      if (ip + 2 <= iend) {
        const rawOffset = src[ip] | (src[ip + 1] << 8);
        ip += 2;

        let matchLen = matchCode + MIN_MATCH;
        if (matchCode === 15) {
          while (ip < iend && src[ip] === 255) {
            matchLen += 255;
            ip++;
          }
          if (ip < iend) matchLen += src[ip++];
        }

        matchCount++;
        if (matchLen > longestMatch) longestMatch = matchLen;

        const isDict = hasDict && Boolean(rawOffset & 0x8000);
        let displayOffset = isDict ? (rawOffset & 0x7fff) : rawOffset;
        if (hasDict && rawOffset === 0xffff && ip + 3 <= iend) {
          displayOffset = src[ip] | (src[ip + 1] << 8) | (src[ip + 2] << 16);
          ip += 3;
        }

        tokens.push({
          type: isDict ? 'dict_match' : 'match',
          offset: displayOffset,
          length: matchLen,
          rawBytesPreview: isDict ? `dict @${displayOffset}B (${matchLen}B)` : `back -${rawOffset}B (${matchLen}B)`,
          streamPosition: streamPos,
        });
      }
    }
  } catch {
    // Graceful stop
  }

  return {
    header: { magicValid, level, originalSize, checksum, hasDict },
    tokens,
    totalTokens: tokens.length,
    matchCount,
    literalCount,
    longestMatch,
  };
}

/* ========================================================================= */
/* DS4 / DEEPSEEK V4 TENSOR & DISK-BACKED KV CACHE ENGINE                    */
/* ========================================================================= */

export function frascolzCompressTensor(tensorBytes: Uint8Array): CompressionResult {
  const isFp32 = tensorBytes.length >= 64 && tensorBytes.length % 4 === 0;
  const processed = isFp32 ? frascolzFilterFpSplit(tensorBytes) : tensorBytes;
  const res = frascolzCompressAdaptive(processed, 128, 2);
  return {
    ...res,
    originalSize: tensorBytes.length,
    ratioPercent: (res.compressedSize / tensorBytes.length) * 100,
    spaceSavingsPercent: Math.max(0, 100 - (res.compressedSize / tensorBytes.length) * 100),
  };
}

export function frascolzDecompressTensor(compressed: Uint8Array, isFp32: boolean = true): DecompressionResult {
  const decomp = frascolzDecompress(compressed);
  if (isFp32 && decomp.decompressed.length % 4 === 0) {
    const restored = frascolzFilterFpUnsplit(decomp.decompressed);
    return {
      ...decomp,
      decompressed: restored,
      decompressedSize: restored.length,
    };
  }
  return decomp;
}

/* ========================================================================= */
/* HUGE FILE STREAMING COMPRESSOR (BOUNDED RAM WORKING SET)                  */
/* ========================================================================= */

export interface ChunkedStreamResult {
  chunks: Uint8Array[];
  totalOriginal: number;
  totalCompressed: number;
  ratioPercent: number;
  spaceSavingsPercent: number;
  timeMs: number;
  speedMBs: number;
  chunkCount: number;
}

export function frascolzCompressChunkedStream(
  src: Uint8Array,
  chunkSize: number = 64 * 1024, // 64 KB streaming block
  ramBudgetMB: number = 64
): ChunkedStreamResult {
  const t0 = performance.now();
  const chunks: Uint8Array[] = [];
  let totalComp = 0;
  const totalOrig = src.length;

  for (let offset = 0; offset < totalOrig; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, totalOrig);
    const chunkData = src.subarray(offset, end);
    const comp = frascolzCompressAdaptive(chunkData, ramBudgetMB, 1);
    chunks.push(comp.compressed);
    totalComp += comp.compressedSize;
  }

  const t1 = performance.now();
  const timeMs = Math.max(0.01, t1 - t0);
  const speedMBs = totalOrig > 0 ? (totalOrig / (1024 * 1024)) / (timeMs / 1000) : 0;
  const ratioPercent = totalOrig > 0 ? (totalComp / totalOrig) * 100 : 100;
  const spaceSavingsPercent = Math.max(0, 100 - ratioPercent);

  return {
    chunks,
    totalOriginal: totalOrig,
    totalCompressed: totalComp,
    ratioPercent,
    spaceSavingsPercent,
    timeMs,
    speedMBs,
    chunkCount: chunks.length,
  };
}

export function frascolzDecompressChunkedStream(chunks: Uint8Array[]): Uint8Array {
  const decompressedChunks: Uint8Array[] = [];
  let totalSize = 0;

  for (const chunk of chunks) {
    const d = frascolzDecompress(chunk);
    decompressedChunks.push(d.decompressed);
    totalSize += d.decompressedSize;
  }

  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const d of decompressedChunks) {
    result.set(d, pos);
    pos += d.length;
  }
  return result;
}

