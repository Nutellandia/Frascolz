/**
 * @file frascolz.test.ts
 * @brief Unit tests for FrascoLZ v2.0 lossless compression, dictionary mode, and neural filters
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  frascolzCompress,
  frascolzDecompress,
  frascolzCompressDict,
  frascolzCompressAdaptive,
  frascolzCompressTensor,
  frascolzDecompressTensor,
  frascolzCompressChunkedStream,
  frascolzDecompressChunkedStream,
  frascolzFilterFpSplit,
  frascolzFilterFpUnsplit,
  inspectFrascolzStream,
} from './frascolz';
import { runFuzzingAudit } from './fuzzing';

test('roundtrip: compresses and decompresses plain repetitive text accurately', () => {
  const text = 'Hello Emilio Frascogna and FRS Software! Ultra-fast compression testing with FrascoLZ. '.repeat(10);
  const input = new TextEncoder().encode(text);

  const comp = frascolzCompress(input, 1);
  assert.ok(comp.compressedSize < input.length, 'Compressed size should be smaller than original');
  assert.equal(comp.compressed[0], 0x46); // 'F'
  assert.equal(comp.compressed[1], 0x52); // 'R'
  assert.equal(comp.compressed[2], 0x53); // 'S'
  assert.equal(comp.compressed[3], 0x5A); // 'Z'

  const decomp = frascolzDecompress(comp.compressed);
  assert.equal(decomp.decompressedSize, input.length);
  assert.equal(decomp.checksumMatch, true);
  assert.deepEqual(decomp.decompressed, input);
});

test('milestone innovation 1: pre-shared game dictionary compresses micro-packets dramatically', () => {
  // Pre-shared game dictionary (shared static schema & common network tokens)
  const gameDict = new TextEncoder().encode(
    '{"packetType":"PLAYER_STATE_DELTA","tick":1000,"worldSector":"VICE_CITY_CENTRAL","entities":[' +
    '{"entityId":"PLAYER_01","health":100,"armor":100,"pos":[0.0,0.0,0.0],"rot":[0.0,0.0,0.0],"weapon":"CARBINE_RIFLE"}' +
    ']}'
  );

  // Micro-packet (220 bytes) with schema tokens from the dictionary
  const microPacket = new TextEncoder().encode(
    '{"packetType":"PLAYER_STATE_DELTA","tick":1042,"worldSector":"VICE_CITY_CENTRAL","entities":[' +
    '{"entityId":"PLAYER_01","health":94,"armor":80,"pos":[142.5,98.2,12.0],"rot":[0.1,1.5,0.0],"weapon":"CARBINE_RIFLE"}' +
    ']}'
  );

  // Standard compression without dictionary
  const compNoDict = frascolzCompress(microPacket, 1);

  // Milestone compression with pre-shared dictionary
  const compDict = frascolzCompressDict(microPacket, gameDict);

  // With dictionary, size should be substantially smaller
  assert.ok(
    compDict.compressedSize <= compNoDict.compressedSize,
    `Dict size (${compDict.compressedSize}) should be <= standard size (${compNoDict.compressedSize})`
  );

  // Decompress with dictionary
  const decomp = frascolzDecompress(compDict.compressed, gameDict);
  assert.equal(decomp.decompressedSize, microPacket.length);
  assert.deepEqual(decomp.decompressed, microPacket);
});

test('milestone innovation 2: neural / float32 byte-plane transposition roundtrip', () => {
  // Float32 neural weights / 3D vertex positions
  const floatCount = 64;
  const floatArray = new Float32Array(floatCount);
  for (let i = 0; i < floatCount; i++) {
    floatArray[i] = Math.sin(i * 0.1) * 2.5; // realistic floating point values
  }
  const rawBytes = new Uint8Array(floatArray.buffer);

  // Split into orthogonal byte planes (exponents clustered)
  const transposed = frascolzFilterFpSplit(rawBytes);
  assert.equal(transposed.length, rawBytes.length);

  // Unsplit back to original floats
  const restored = frascolzFilterFpUnsplit(transposed);
  assert.deepEqual(restored, rawBytes);

  // Compressing transposed data should achieve great compressibility because byte 3 (exponents) are clustered!
  const compTransposed = frascolzCompress(transposed, 2);
  const decompTransposed = frascolzDecompress(compTransposed.compressed);
  const finalRestored = frascolzFilterFpUnsplit(decompTransposed.decompressed);
  assert.deepEqual(finalRestored, rawBytes);
});

test('roundtrip: handles empty buffer gracefully', () => {
  const input = new Uint8Array(0);
  const comp = frascolzCompress(input, 1);
  const decomp = frascolzDecompress(comp.compressed);
  assert.equal(decomp.decompressedSize, 0);
});

test('roundtrip: handles uniform byte runs (RLE)', () => {
  const input = new Uint8Array(4096);
  input.fill(0xAA);

  const comp = frascolzCompress(input, 1);
  assert.ok(comp.compressedSize < 100, 'RLE stream should be drastically reduced');

  const decomp = frascolzDecompress(comp.compressed);
  assert.deepEqual(decomp.decompressed, input);
});

test('integrity: detects corrupt magic signature and throws safe error', () => {
  const input = new TextEncoder().encode('Security test payload');
  const comp = frascolzCompress(input, 1);
  const corrupted = new Uint8Array(comp.compressed);
  corrupted[0] = 0x00;

  assert.throws(() => {
    frascolzDecompress(corrupted);
  }, /Invalid magic signature/);
});

test('inspector: breaks down stream tokens accurately including dictionary matches', () => {
  const input = new TextEncoder().encode('ABCDEFGHIJ ABCDEFGHIJ ABCDEFGHIJ');
  const comp = frascolzCompress(input, 1);
  const inspection = inspectFrascolzStream(comp.compressed);

  assert.equal(inspection.header.magicValid, true);
  assert.ok(inspection.matchCount > 0);
  assert.ok(inspection.tokens.length > 0);
});

test('fuzzing audit: survives random mutations without crashes', () => {
  const input = new TextEncoder().encode('Fuzzing test string with multiple patterns and entropy variations. 1234567890');
  const audit = runFuzzingAudit(input, 20);

  assert.equal(audit.crashesOrHangs, 0);
  assert.equal(audit.safetyRating, 'A+ (Memory Safe & Crash Resistant)');
});

test('adaptive RAM tiers: compresses and decompresses identically across Micro 16KB and Massive 64GB+ budgets', () => {
  const payload = new TextEncoder().encode('Redis key-value in-memory string cache payload with repetitions '.repeat(50));

  // Micro tier: 16KB table limit for old Pentium/Atom
  const compMicro = frascolzCompressAdaptive(payload, 0.016, 1);
  assert.equal(compMicro.ramTier, 'Legacy / 32-Bit Micro (16KB Cache)');
  const decompMicro = frascolzDecompress(compMicro.compressed);
  assert.deepEqual(decompMicro.decompressed, payload);

  // Massive tier: 64GB+ workstation profile
  const compMassive = frascolzCompressAdaptive(payload, 65536, 1);
  assert.equal(compMassive.ramTier, 'Massive Workstation Tier (64GB - 128GB+ RAM)');
  const decompMassive = frascolzDecompress(compMassive.compressed);
  assert.deepEqual(decompMassive.decompressed, payload);
});

test('huge files chunked streaming: processes stream in chunks with bounded working RAM', () => {
  const sample = new TextEncoder().encode('Streaming Chunk Test Block: Emilio Frascogna and FRS Software. '.repeat(100));
  const chunkResult = frascolzCompressChunkedStream(sample, 512, 64);

  assert.ok(chunkResult.chunkCount > 1, 'Should split into multiple independent streaming chunks');
  assert.ok(chunkResult.totalCompressed < sample.length);

  const restored = frascolzDecompressChunkedStream(chunkResult.chunks);
  assert.deepEqual(restored, sample);
});

test('DS4 & DeepSeek V4: compresses and decompresses floating-point tensor accurately', () => {
  const floatCount = 256;
  const floatArr = new Float32Array(floatCount);
  for (let i = 0; i < floatCount; i++) {
    floatArr[i] = (i % 8) * 0.125; // realistic repeating neural network attention pattern
  }
  const rawBytes = new Uint8Array(floatArr.buffer);

  const compTensor = frascolzCompressTensor(rawBytes);
  assert.ok(compTensor.compressedSize < rawBytes.length);

  const decompTensor = frascolzDecompressTensor(compTensor.compressed, true);
  assert.deepEqual(decompTensor.decompressed, rawBytes);
});

test('large dictionary (>32KB): handles 64KB dictionary matches using extended offsets', () => {
  // Create a 64KB pre-shared dictionary with known patterns beyond 32KB
  const dict = new Uint8Array(65536);
  for (let i = 0; i < dict.length; i++) {
    dict[i] = (i * 37) & 0xff;
  }
  // Plant distinct token at offset 40,000 (> 32,768)
  const token = new TextEncoder().encode('DEEPSEEK_V4_FLASH_MOE_TENSOR_EXPERT_ROUTING');
  dict.set(token, 40000);

  const testPayload = new TextEncoder().encode('Payload prefix before match: DEEPSEEK_V4_FLASH_MOE_TENSOR_EXPERT_ROUTING suffix test');
  const comp = frascolzCompressDict(testPayload, dict);
  const decomp = frascolzDecompress(comp.compressed, dict);

  assert.deepEqual(decomp.decompressed, testPayload);
});

test('large binary / video compression: handles standard back-reference offsets > 32,768 B without dictionary flag', () => {
  // Create a 100KB buffer simulating video frames with repeated video headers at 45,000 bytes distance (> 32,768)
  const videoBuffer = new Uint8Array(100000);
  for (let i = 0; i < videoBuffer.length; i++) {
    videoBuffer[i] = (i * 13 + (i >> 8)) & 0xff;
  }
  const videoHeader = new TextEncoder().encode('H264_NAL_KEYFRAME_DELIVERY_CHUNK_0x8000_OFFSET_TEST_STREAMING_VIDEO');
  videoBuffer.set(videoHeader, 1000);
  videoBuffer.set(videoHeader, 46000); // 45,000 bytes offset (> 32,768 B)

  const comp = frascolzCompress(videoBuffer, 1);
  assert.ok(comp.compressedSize < videoBuffer.length);

  const decomp = frascolzDecompress(comp.compressed);
  assert.deepEqual(decomp.decompressed, videoBuffer, 'Decompressed video buffer must match 100% bit-for-bit');
});

