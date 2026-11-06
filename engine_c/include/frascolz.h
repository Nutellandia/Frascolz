/**
 * @file frascolz.h
 * @brief FrascoLZ v3.0 Universal Engine - Ultra-Fast Lossless Compression
 * @author Emilio Frascogna (FRS - Frascogna Software)
 * @copyright (c) 2026 FRS. Dual-Licensed: FRS Commercial / AGPLv3 Community.
 * Architectural Inspiration:
 * Developed independently by Emilio Frascogna, inspired by the pure-C systems 
 * philosophy of Salvatore Sanfilippo (antirez) in Redis and DS4: radical simplicity, 
 * zero external dependencies, cache-resident indexing, and deterministic memory safety.
 *
 * Capabilities:
 * - Adaptive RAM scalability: from 16 KB (embedded/vintage) up to 128 GB+ (workstations/servers).
 * - Huge file chunked streaming: processes gigabytes/terabytes with bounded RAM & random-access seek.
 * - DeepSeek V4 / DS4 acceleration: virtualizes NVMe bandwidth for MoE expert loading & disk-backed KV cache.
 * - Fast 64-bit XOR & __builtin_ctzll match extension (skips up to 8 bytes per clock cycle).
 * - Massive Shared Dictionaries (up to 1 MB+ with dynamic variable-length offsets).
 * - Full legacy 32-bit CPU and C89/C99 compiler compatibility.
 */

#ifndef FRASCOLZ_H
#define FRASCOLZ_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Magic header identification: 'F' 'R' 'S' 'Z' (0x5A535246) */
#define FRASCOLZ_MAGIC           0x5A535246U
#define FRASCOLZ_VERSION_MAJOR   3
#define FRASCOLZ_VERSION_MINOR   0
#define FRASCOLZ_VERSION_PATCH   0

/* Compression Modes */
#define FRASCOLZ_LEVEL_FAST      1 /* Real-time gaming, network delta, ultra-low latency */
#define FRASCOLZ_LEVEL_HIGH      2 /* High-density asset packaging, textures, audio packs */
#define FRASCOLZ_LEVEL_NEURAL    3 /* Float/Neural vector mode with byte-plane transposition */
#define FRASCOLZ_LEVEL_DS4_MOE   4 /* DS4 DeepSeek V4 expert layer & disk-backed KV cache mode */

/* Memory Profile Tiers */
#define FRASCOLZ_RAM_TIER_MICRO      1 /* 16 KB table, fits in L1 cache of vintage 32-bit CPU */
#define FRASCOLZ_RAM_TIER_STANDARD   2 /* 64 KB table, default cache-resident L2/L3 */
#define FRASCOLZ_RAM_TIER_MASSIVE    3 /* Up to all available system RAM (64GB - 256GB+) */

/* Chunk streaming block size */
#define FRASCOLZ_DEFAULT_BLOCK_SIZE  (256 * 1024) /* 256 KB independent chunk */

/* Error Codes */
#define FRASCOLZ_OK              0
#define FRASCOLZ_ERR_CORRUPT    -1 /* Invalid magic, bad token, or header mismatch */
#define FRASCOLZ_ERR_BUF_SMALL  -2 /* Output buffer too small for decompressed data */
#define FRASCOLZ_ERR_CHECKSUM   -3 /* Integrity checksum failure */
#define FRASCOLZ_ERR_PARAM      -4 /* Null pointer or invalid argument */

/**
 * Returns the library version string (e.g. "3.0.0-frascolz-universal").
 */
const char *frascolz_version(void);

/**
 * Calculates the worst-case compressed buffer capacity needed for a given input size.
 */
size_t frascolz_compress_bound(size_t src_len);

/**
 * Computes a fast 32-bit Adler-style checksum for integrity validation.
 */
uint32_t frascolz_checksum32(const uint8_t *data, size_t len);

/* ========================================================================= */
/* CORE API                                                                  */
/* ========================================================================= */

int64_t frascolz_compress_fast(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap);

int64_t frascolz_compress_high(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap);

int64_t frascolz_compress(const uint8_t *src, size_t src_len,
                          uint8_t *dst, size_t dst_cap,
                          int level);

int64_t frascolz_decompress(const uint8_t *src, size_t src_len,
                            uint8_t *dst, size_t dst_cap);

/* ========================================================================= */
/* ADAPTIVE MEMORY SCALER & SYSTEM RAM AUTODETECT                            */
/* ========================================================================= */

typedef struct {
    size_t memory_budget_bytes; /* 0 = Auto-detect all available RAM, or specific limit in bytes */
    int num_threads;            /* 1 = single-thread, 0 = auto-detect all CPU cores */
    int window_size_mb;         /* 0 = default (64KB), up to 64MB for massive models */
    int enable_ctz_fast_match;  /* 1 = 64-bit XOR and __builtin_ctzll match extension */
    int legacy_32bit_mode;      /* 1 = force 32-bit word path & 16KB L1 cache profile */
} frascolz_config_t;

/**
 * Initializes a configuration struct based on available system RAM.
 * Automatically scales from 16 KB (vintage/embedded) to 128 GB+ (workstations).
 */
void frascolz_get_default_config(frascolz_config_t *cfg, int tier);

/**
 * Compresses data using adaptive memory budgeting.
 */
int64_t frascolz_compress_adaptive(const uint8_t *src, size_t src_len,
                                  uint8_t *dst, size_t dst_cap,
                                  const frascolz_config_t *cfg);

/* ========================================================================= */
/* CHUNKED STREAMING FOR HUGE FILES (GIGABYTES / TERABYTES)                 */
/* ========================================================================= */

/**
 * Compresses a stream chunk by chunk, maintaining constant bounded RAM.
 */
int64_t frascolz_compress_chunk(const uint8_t *src_block, size_t block_len,
                               uint8_t *dst, size_t dst_cap,
                               int is_last_block);

/**
 * Decompresses an autonomous chunk from a huge file stream.
 */
int64_t frascolz_decompress_chunk(const uint8_t *src_block, size_t block_len,
                                 uint8_t *dst, size_t dst_cap);

/* ========================================================================= */
/* MASSIVE SHARED DICTIONARIES (UP TO 1 MB+) & DS4 / DEEPSEEK ACCELERATION   */
/* ========================================================================= */

/**
 * Compresses data against pre-shared dictionaries up to 1 MB+ in size.
 */
int64_t frascolz_compress_dict(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap,
                              const uint8_t *dict, size_t dict_len);

int64_t frascolz_decompress_dict(const uint8_t *src, size_t src_len,
                                uint8_t *dst, size_t dst_cap,
                                const uint8_t *dict, size_t dict_len);

/**
 * Fast DS4 / DeepSeek V4 tensor and KV Cache block compression.
 * Accelerates NVMe SSD read bandwidth up to 15+ GB/s virtual throughput.
 */
int64_t frascolz_compress_tensor(const uint8_t *tensor_bytes, size_t len,
                                uint8_t *dst, size_t dst_cap);

int64_t frascolz_decompress_tensor(const uint8_t *src, size_t src_len,
                                  uint8_t *dst, size_t dst_cap);

/* ========================================================================= */
/* NEURAL & FLOATING POINT TRANSPOSITION FILTERS                             */
/* ========================================================================= */

void frascolz_filter_fp_split(const uint8_t *src, size_t len, uint8_t *dst);
void frascolz_filter_fp_unsplit(const uint8_t *src, size_t len, uint8_t *dst);

#ifdef __cplusplus
}
#endif

#endif /* FRASCOLZ_H */
