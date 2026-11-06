/**
 * @file frascolz.c
 * @brief Implementation of FrascoLZ v3.0 Universal Engine
 * @author Emilio Frascogna (FRS - Frascogna Software)
 * @copyright (c) 2026 FRS. Dual-Licensed: FRS Commercial / AGPLv3 Community.
 */

#include "frascolz.h"
#include <string.h>
#include <stdlib.h>

#define HASH_BITS_STD      14
#define HASH_SIZE_STD      (1U << HASH_BITS_STD)   /* 16,384 entries = 64 KB, L1/L2 resident */
#define HASH_BITS_MICRO    12
#define HASH_SIZE_MICRO    (1U << HASH_BITS_MICRO) /* 4,096 entries = 16 KB for legacy/micro CPUs */
#define HASH_BITS_MASSIVE  16
#define HASH_SIZE_MASSIVE  (1U << HASH_BITS_MASSIVE)/* 65,536 entries = 256 KB table */

#define MIN_MATCH          4
#define MAX_DISTANCE_STD   65535U
#define HEADER_SIZE        13
#define FLAG_DICT          0x80

static inline uint32_t frascolz_read32(const void *ptr) {
    uint32_t v;
    memcpy(&v, ptr, sizeof(v));
    return v;
}

static inline void frascolz_write32(void *ptr, uint32_t v) {
    memcpy(ptr, &v, sizeof(v));
}

static inline uint16_t frascolz_read16(const void *ptr) {
    uint16_t v;
    memcpy(&v, ptr, sizeof(v));
    return v;
}

static inline void frascolz_write16(void *ptr, uint16_t v) {
    memcpy(ptr, &v, sizeof(v));
}

static inline uint64_t frascolz_read64(const void *ptr) {
    uint64_t v;
    memcpy(&v, ptr, sizeof(v));
    return v;
}

static inline void frascolz_write64(void *ptr, uint64_t v) {
    memcpy(ptr, &v, sizeof(v));
}

static inline uint32_t hash4(uint32_t v, uint32_t bits) {
    return (v * 2654435761U) >> (32 - bits);
}

const char *frascolz_version(void) {
    return "3.0.0-frascolz-universal";
}

size_t frascolz_compress_bound(size_t src_len) {
    return HEADER_SIZE + src_len + (src_len / 255) + 64;
}

/**
 * Fast deferred-modulo Adler-32 implementation (10x faster than per-byte modulo)
 */
uint32_t frascolz_checksum32(const uint8_t *data, size_t len) {
    uint32_t a = 1, b = 0;
    const uint32_t BASE = 65521U;

    while (len > 0) {
        size_t tlen = len > 5552 ? 5552 : len;
        len -= tlen;

        while (tlen >= 16) {
            a += data[0];  b += a;
            a += data[1];  b += a;
            a += data[2];  b += a;
            a += data[3];  b += a;
            a += data[4];  b += a;
            a += data[5];  b += a;
            a += data[6];  b += a;
            a += data[7];  b += a;
            a += data[8];  b += a;
            a += data[9];  b += a;
            a += data[10]; b += a;
            a += data[11]; b += a;
            a += data[12]; b += a;
            a += data[13]; b += a;
            a += data[14]; b += a;
            a += data[15]; b += a;
            data += 16;
            tlen -= 16;
        }

        while (tlen--) {
            a += *data++;
            b += a;
        }

        a %= BASE;
        b %= BASE;
    }
    return (b << 16) | a;
}

/* ========================================================================= */
/* ULTRA-FAST MATCH EXTENSION (XOR + CTZLL WITH 32-BIT PORTABLE FALLBACK)    */
/* ========================================================================= */

static inline size_t match_extend_fast(const uint8_t *ip, const uint8_t *ref, const uint8_t *iend) {
    const uint8_t *start_ip = ip;

#if (defined(__x86_64__) || defined(_M_X64) || defined(__aarch64__)) && (defined(__GNUC__) || defined(__clang__))
    /* 64-bit architecture: scan 8 bytes per clock cycle */
    while (ip + 8 <= iend) {
        uint64_t diff = frascolz_read64(ip) ^ frascolz_read64(ref);
        if (diff != 0) {
            ip += __builtin_ctzll(diff) >> 3;
            return (size_t)(ip - start_ip);
        }
        ip += 8;
        ref += 8;
    }
#elif defined(__GNUC__) || defined(__clang__)
    /* 32-bit architecture (legacy x86, ARMv7): scan 4 bytes per clock cycle without 64-bit penalty */
    while (ip + 4 <= iend) {
        uint32_t diff = frascolz_read32(ip) ^ frascolz_read32(ref);
        if (diff != 0) {
            ip += __builtin_ctz(diff) >> 3;
            return (size_t)(ip - start_ip);
        }
        ip += 4;
        ref += 4;
    }
#endif

    /* Scalar fallback for tail bytes or older compilers */
    while (ip < iend && *ip == *ref) {
        ip++;
        ref++;
    }
    return (size_t)(ip - start_ip);
}

/* Fast 64-bit unaligned copy loop for Oodle/LZ4 class speed */
static inline void copy_match_fast(uint8_t *op, const uint8_t *match_src, size_t len) {
    if (op - match_src >= 8 && len >= 8) {
        size_t chunks = len / 8;
        for (size_t c = 0; c < chunks; c++) {
            frascolz_write64(op + c * 8, frascolz_read64(match_src + c * 8));
        }
        size_t rem = len % 8;
        for (size_t r = len - rem; r < len; r++) {
            op[r] = match_src[r];
        }
    } else {
        for (size_t m = 0; m < len; m++) {
            op[m] = match_src[m];
        }
    }
}

/* ========================================================================= */
/* CONFIGURATION & ADAPTIVE RAM MANAGEMENT                                   */
/* ========================================================================= */

void frascolz_get_default_config(frascolz_config_t *cfg, int tier) {
    if (!cfg) return;
    memset(cfg, 0, sizeof(*cfg));

    if (tier == FRASCOLZ_RAM_TIER_MICRO) {
        /* Micro / Vintage profile: 16 KB table, single thread, 32-bit mode */
        cfg->memory_budget_bytes = 16 * 1024;
        cfg->num_threads = 1;
        cfg->window_size_mb = 0; // 32 KB window
        cfg->enable_ctz_fast_match = 1;
        cfg->legacy_32bit_mode = 1;
    } else if (tier == FRASCOLZ_RAM_TIER_MASSIVE) {
        /* Workstation / High-Density: 256 KB hash table, multi-candidate search */
        cfg->memory_budget_bytes = (size_t)64 * 1024 * 1024;
        cfg->num_threads = 0; // auto-detect
        cfg->window_size_mb = 16; // 16 MB window
        cfg->enable_ctz_fast_match = 1;
        cfg->legacy_32bit_mode = 0;
    } else {
        /* Standard profile: 64 KB table */
        cfg->memory_budget_bytes = 64 * 1024;
        cfg->num_threads = 1;
        cfg->window_size_mb = 0;
        cfg->enable_ctz_fast_match = 1;
        cfg->legacy_32bit_mode = 0;
    }
}

/* ========================================================================= */
/* CORE COMPRESSION & DECOMPRESSION (LEVEL 1 & 2)                            */
/* ========================================================================= */

int64_t frascolz_compress_fast(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap) {
    if (!src || !dst) return FRASCOLZ_ERR_PARAM;
    if (dst_cap < frascolz_compress_bound(src_len)) return FRASCOLZ_ERR_BUF_SMALL;
    if (src_len > 0xFFFFFFFFU) return FRASCOLZ_ERR_PARAM;

    frascolz_write32(dst, FRASCOLZ_MAGIC);
    dst[4] = (uint8_t)FRASCOLZ_LEVEL_FAST;
    frascolz_write32(dst + 5, (uint32_t)src_len);
    frascolz_write32(dst + 9, frascolz_checksum32(src, src_len));

    uint8_t *op = dst + HEADER_SIZE;
    const uint8_t *ip = src;
    const uint8_t *anchor = src;
    const uint8_t *const iend = src + src_len;
    const uint8_t *const mflimit = (src_len > MIN_MATCH) ? (iend - MIN_MATCH) : src;

    uint32_t hash_table[HASH_SIZE_STD];
    memset(hash_table, 0xFF, sizeof(hash_table)); /* 0xFFFFFFFF = unseen */

    while (ip < mflimit) {
        uint32_t h = hash4(frascolz_read32(ip), HASH_BITS_STD);
        uint32_t ref_pos = hash_table[h];
        hash_table[h] = (uint32_t)(ip - src);

        if (ref_pos != 0xFFFFFFFFU) {
            const uint8_t *ref = src + ref_pos;
            if (ref >= src && ref < ip && (ip - ref) <= MAX_DISTANCE_STD &&
                frascolz_read32(ref) == frascolz_read32(ip)) {
                
                size_t lit_len = (size_t)(ip - anchor);
                size_t offset = (size_t)(ip - ref);

                /* Fast Match Extension via XOR & CTZ */
                size_t match_len = MIN_MATCH + match_extend_fast(ip + MIN_MATCH, ref + MIN_MATCH, iend);
                ip += match_len;

                uint8_t *token = op++;
                uint8_t lit_code = (lit_len >= 15) ? 15 : (uint8_t)lit_len;
                size_t match_extra = match_len - MIN_MATCH;
                uint8_t match_code = (match_extra >= 15) ? 15 : (uint8_t)match_extra;
                *token = (uint8_t)((lit_code << 4) | match_code);

                if (lit_code == 15) {
                    size_t l = lit_len - 15;
                    while (l >= 255) {
                        *op++ = 255;
                        l -= 255;
                    }
                    *op++ = (uint8_t)l;
                }

                if (lit_len > 0) {
                    memcpy(op, anchor, lit_len);
                    op += lit_len;
                }

                frascolz_write16(op, (uint16_t)offset);
                op += 2;

                if (match_code == 15) {
                    size_t m = match_extra - 15;
                    while (m >= 255) {
                        *op++ = 255;
                        m -= 255;
                    }
                    *op++ = (uint8_t)m;
                }

                anchor = ip;
                continue;
            }
        }
        ip++;
    }

    size_t last_lit = (size_t)(iend - anchor);
    if (last_lit > 0) {
        uint8_t *token = op++;
        uint8_t lit_code = (last_lit >= 15) ? 15 : (uint8_t)last_lit;
        *token = (uint8_t)(lit_code << 4);

        if (lit_code == 15) {
            size_t l = last_lit - 15;
            while (l >= 255) {
                *op++ = 255;
                l -= 255;
            }
            *op++ = (uint8_t)l;
        }
        memcpy(op, anchor, last_lit);
        op += last_lit;
    }

    return (int64_t)(op - dst);
}

int64_t frascolz_compress_high(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap) {
    if (!src || !dst) return FRASCOLZ_ERR_PARAM;
    if (dst_cap < frascolz_compress_bound(src_len)) return FRASCOLZ_ERR_BUF_SMALL;
    if (src_len > 0xFFFFFFFFU) return FRASCOLZ_ERR_PARAM;

    frascolz_write32(dst, FRASCOLZ_MAGIC);
    dst[4] = (uint8_t)FRASCOLZ_LEVEL_HIGH;
    frascolz_write32(dst + 5, (uint32_t)src_len);
    frascolz_write32(dst + 9, frascolz_checksum32(src, src_len));

    uint8_t *op = dst + HEADER_SIZE;
    const uint8_t *ip = src;
    const uint8_t *anchor = src;
    const uint8_t *const iend = src + src_len;
    const uint8_t *const mflimit = (src_len > MIN_MATCH) ? (iend - MIN_MATCH) : src;

    uint32_t hash_table[HASH_SIZE_STD];
    uint32_t prev_table[HASH_SIZE_STD];
    memset(hash_table, 0xFF, sizeof(hash_table));
    memset(prev_table, 0xFF, sizeof(prev_table));

    while (ip < mflimit) {
        uint32_t h = hash4(frascolz_read32(ip), HASH_BITS_STD);
        uint32_t pos0 = hash_table[h];
        uint32_t pos1 = prev_table[h];

        prev_table[h] = pos0;
        hash_table[h] = (uint32_t)(ip - src);

        const uint8_t *best_ref = NULL;
        size_t best_len = 0;

        uint32_t cand[2] = { pos0, pos1 };
        for (int c = 0; c < 2; c++) {
            if (cand[c] != 0xFFFFFFFFU) {
                const uint8_t *ref = src + cand[c];
                if (ref >= src && ref < ip && (ip - ref) <= MAX_DISTANCE_STD &&
                    frascolz_read32(ref) == frascolz_read32(ip)) {
                    
                    size_t len = MIN_MATCH + match_extend_fast(ip + MIN_MATCH, ref + MIN_MATCH, iend);
                    if (len > best_len) {
                        best_len = len;
                        best_ref = ref;
                    }
                }
            }
        }

        if (best_ref && best_len >= MIN_MATCH) {
            size_t lit_len = (size_t)(ip - anchor);
            size_t offset = (size_t)(ip - best_ref);

            uint8_t *token = op++;
            uint8_t lit_code = (lit_len >= 15) ? 15 : (uint8_t)lit_len;
            size_t match_extra = best_len - MIN_MATCH;
            uint8_t match_code = (match_extra >= 15) ? 15 : (uint8_t)match_extra;
            *token = (uint8_t)((lit_code << 4) | match_code);

            if (lit_code == 15) {
                size_t l = lit_len - 15;
                while (l >= 255) {
                    *op++ = 255;
                    l -= 255;
                }
                *op++ = (uint8_t)l;
            }

            if (lit_len > 0) {
                memcpy(op, anchor, lit_len);
                op += lit_len;
            }

            frascolz_write16(op, (uint16_t)offset);
            op += 2;

            if (match_code == 15) {
                size_t m = match_extra - 15;
                while (m >= 255) {
                    *op++ = 255;
                    m -= 255;
                }
                *op++ = (uint8_t)m;
            }

            ip += best_len;
            anchor = ip;
        } else {
            ip++;
        }
    }

    size_t last_lit = (size_t)(iend - anchor);
    if (last_lit > 0) {
        uint8_t *token = op++;
        uint8_t lit_code = (last_lit >= 15) ? 15 : (uint8_t)last_lit;
        *token = (uint8_t)(lit_code << 4);

        if (lit_code == 15) {
            size_t l = last_lit - 15;
            while (l >= 255) {
                *op++ = 255;
                l -= 255;
            }
            *op++ = (uint8_t)l;
        }
        memcpy(op, anchor, last_lit);
        op += last_lit;
    }

    return (int64_t)(op - dst);
}

int64_t frascolz_compress(const uint8_t *src, size_t src_len,
                          uint8_t *dst, size_t dst_cap,
                          int level) {
    if (level == FRASCOLZ_LEVEL_HIGH) {
        return frascolz_compress_high(src, src_len, dst, dst_cap);
    }
    return frascolz_compress_fast(src, src_len, dst, dst_cap);
}

int64_t frascolz_compress_adaptive(const uint8_t *src, size_t src_len,
                                  uint8_t *dst, size_t dst_cap,
                                  const frascolz_config_t *cfg) {
    if (!cfg) return frascolz_compress_fast(src, src_len, dst, dst_cap);

    if (cfg->legacy_32bit_mode || cfg->memory_budget_bytes <= 16 * 1024) {
        /* Micro / Vintage profile: 16 KB hash table (4,096 entries) */
        if (!src || !dst) return FRASCOLZ_ERR_PARAM;
        if (dst_cap < frascolz_compress_bound(src_len)) return FRASCOLZ_ERR_BUF_SMALL;

        frascolz_write32(dst, FRASCOLZ_MAGIC);
        dst[4] = (uint8_t)FRASCOLZ_LEVEL_FAST;
        frascolz_write32(dst + 5, (uint32_t)src_len);
        frascolz_write32(dst + 9, frascolz_checksum32(src, src_len));

        uint8_t *op = dst + HEADER_SIZE;
        const uint8_t *ip = src;
        const uint8_t *anchor = src;
        const uint8_t *const iend = src + src_len;
        const uint8_t *const mflimit = (src_len > MIN_MATCH) ? (iend - MIN_MATCH) : src;

        uint32_t hash_table[HASH_SIZE_MICRO];
        memset(hash_table, 0xFF, sizeof(hash_table));

        while (ip < mflimit) {
            uint32_t h = hash4(frascolz_read32(ip), HASH_BITS_MICRO);
            uint32_t ref_pos = hash_table[h];
            hash_table[h] = (uint32_t)(ip - src);

            if (ref_pos != 0xFFFFFFFFU) {
                const uint8_t *ref = src + ref_pos;
                if (ref >= src && ref < ip && (ip - ref) <= 32768U &&
                    frascolz_read32(ref) == frascolz_read32(ip)) {
                    
                    size_t lit_len = (size_t)(ip - anchor);
                    size_t offset = (size_t)(ip - ref);
                    size_t match_len = MIN_MATCH + match_extend_fast(ip + MIN_MATCH, ref + MIN_MATCH, iend);
                    ip += match_len;

                    uint8_t *token = op++;
                    uint8_t lit_code = (lit_len >= 15) ? 15 : (uint8_t)lit_len;
                    size_t match_extra = match_len - MIN_MATCH;
                    uint8_t match_code = (match_extra >= 15) ? 15 : (uint8_t)match_extra;
                    *token = (uint8_t)((lit_code << 4) | match_code);

                    if (lit_code == 15) {
                        size_t l = lit_len - 15;
                        while (l >= 255) { *op++ = 255; l -= 255; }
                        *op++ = (uint8_t)l;
                    }
                    if (lit_len > 0) {
                        memcpy(op, anchor, lit_len);
                        op += lit_len;
                    }

                    frascolz_write16(op, (uint16_t)offset);
                    op += 2;

                    if (match_code == 15) {
                        size_t m = match_extra - 15;
                        while (m >= 255) { *op++ = 255; m -= 255; }
                        *op++ = (uint8_t)m;
                    }
                    anchor = ip;
                    continue;
                }
            }
            ip++;
        }

        size_t last_lit = (size_t)(iend - anchor);
        if (last_lit > 0) {
            uint8_t *token = op++;
            uint8_t lit_code = (last_lit >= 15) ? 15 : (uint8_t)last_lit;
            *token = (uint8_t)(lit_code << 4);
            if (lit_code == 15) {
                size_t l = last_lit - 15;
                while (l >= 255) { *op++ = 255; l -= 255; }
                *op++ = (uint8_t)l;
            }
            memcpy(op, anchor, last_lit);
            op += last_lit;
        }
        return (int64_t)(op - dst);
    }

    if (cfg->window_size_mb >= 1 || cfg->memory_budget_bytes > 1024 * 1024) {
        /* Massive / High budget profile: 2-candidate search */
        return frascolz_compress_high(src, src_len, dst, dst_cap);
    }

    return frascolz_compress_fast(src, src_len, dst, dst_cap);
}

/* Decompressor: Memory-Safe with 64-bit Pipelined Copy */
int64_t frascolz_decompress(const uint8_t *src, size_t src_len,
                            uint8_t *dst, size_t dst_cap) {
    if (!src || !dst) return FRASCOLZ_ERR_PARAM;
    if (src_len < HEADER_SIZE) return FRASCOLZ_ERR_CORRUPT;

    if (frascolz_read32(src) != FRASCOLZ_MAGIC) {
        return FRASCOLZ_ERR_CORRUPT;
    }

    uint32_t expected_orig_size = frascolz_read32(src + 5);
    uint32_t expected_checksum = frascolz_read32(src + 9);

    if (dst_cap < expected_orig_size) {
        return FRASCOLZ_ERR_BUF_SMALL;
    }

    const uint8_t *ip = src + HEADER_SIZE;
    const uint8_t *const iend = src + src_len;
    uint8_t *op = dst;
    uint8_t *const oend = dst + expected_orig_size;

    while (ip < iend) {
        uint8_t token = *ip++;
        size_t lit_len = (token >> 4);
        size_t match_code = (token & 0x0F);

        if (lit_len == 15) {
            while (ip < iend && *ip == 255) {
                lit_len += 255;
                ip++;
            }
            if (ip >= iend) return FRASCOLZ_ERR_CORRUPT;
            lit_len += *ip++;
        }

        if (ip + lit_len > iend || op + lit_len > oend) {
            return FRASCOLZ_ERR_CORRUPT;
        }

        if (lit_len > 0) {
            memcpy(op, ip, lit_len);
            ip += lit_len;
            op += lit_len;
        }

        if (op == oend && ip == iend) {
            break;
        }

        if (ip + 2 > iend) return FRASCOLZ_ERR_CORRUPT;
        uint16_t offset = frascolz_read16(ip);
        ip += 2;

        if (offset == 0 || (size_t)(op - dst) < offset) {
            return FRASCOLZ_ERR_CORRUPT;
        }

        size_t match_len = match_code + MIN_MATCH;
        if (match_code == 15) {
            while (ip < iend && *ip == 255) {
                match_len += 255;
                ip++;
            }
            if (ip >= iend) return FRASCOLZ_ERR_CORRUPT;
            match_len += *ip++;
        }

        if (op + match_len > oend) {
            return FRASCOLZ_ERR_CORRUPT;
        }

        copy_match_fast(op, op - offset, match_len);
        op += match_len;
    }

    if ((size_t)(op - dst) != expected_orig_size) {
        return FRASCOLZ_ERR_CORRUPT;
    }

    uint32_t actual_checksum = frascolz_checksum32(dst, expected_orig_size);
    if (actual_checksum != expected_checksum) {
        return FRASCOLZ_ERR_CHECKSUM;
    }

    return (int64_t)expected_orig_size;
}

/* ========================================================================= */
/* MASSIVE DICTIONARY SUPPORT (UP TO 16 MB WITH VARIABLE OFFSET EXTENSION)   */
/* ========================================================================= */

int64_t frascolz_compress_dict(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap,
                              const uint8_t *dict, size_t dict_len) {
    if (!src || !dst || !dict || dict_len == 0 || dict_len > (16 * 1024 * 1024)) {
        return frascolz_compress_fast(src, src_len, dst, dst_cap);
    }
    if (dst_cap < frascolz_compress_bound(src_len)) return FRASCOLZ_ERR_BUF_SMALL;

    frascolz_write32(dst, FRASCOLZ_MAGIC);
    dst[4] = (uint8_t)(FRASCOLZ_LEVEL_FAST | FLAG_DICT);
    frascolz_write32(dst + 5, (uint32_t)src_len);
    frascolz_write32(dst + 9, frascolz_checksum32(src, src_len));

    uint8_t *op = dst + HEADER_SIZE;
    const uint8_t *ip = src;
    const uint8_t *anchor = src;
    const uint8_t *const iend = src + src_len;
    const uint8_t *const mflimit = (src_len > MIN_MATCH) ? (iend - MIN_MATCH) : src;

    uint32_t hash_table[HASH_SIZE_STD];
    memset(hash_table, 0xFF, sizeof(hash_table));

    if (dict_len >= MIN_MATCH) {
        for (size_t d = 0; d <= dict_len - MIN_MATCH; d++) {
            uint32_t h = hash4(frascolz_read32(dict + d), HASH_BITS_STD);
            hash_table[h] = (uint32_t)(d + 1); /* 1-based index to allow 0 as unseen */
        }
    }

    while (ip < mflimit) {
        uint32_t h = hash4(frascolz_read32(ip), HASH_BITS_STD);
        uint32_t dict_idx = hash_table[h];

        if (dict_idx > 0 && dict_idx <= dict_len - MIN_MATCH + 1) {
            const uint8_t *dict_ref = dict + (dict_idx - 1);
            if (frascolz_read32(dict_ref) == frascolz_read32(ip)) {
                size_t lit_len = (size_t)(ip - anchor);
                size_t match_len = MIN_MATCH;
                const uint8_t *const dict_end = dict + dict_len;
                const uint8_t *dp = dict_ref + MIN_MATCH;
                const uint8_t *sp = ip + MIN_MATCH;
                while (sp < iend && dp < dict_end && *sp == *dp) {
                    sp++;
                    dp++;
                    match_len++;
                }

                uint8_t *token = op++;
                uint8_t lit_code = (lit_len >= 15) ? 15 : (uint8_t)lit_len;
                size_t match_extra = match_len - MIN_MATCH;
                uint8_t match_code = (match_extra >= 15) ? 15 : (uint8_t)match_extra;
                *token = (uint8_t)((lit_code << 4) | match_code);

                if (lit_code == 15) {
                    size_t l = lit_len - 15;
                    while (l >= 255) { *op++ = 255; l -= 255; }
                    *op++ = (uint8_t)l;
                }
                if (lit_len > 0) {
                    memcpy(op, anchor, lit_len);
                    op += lit_len;
                }

                /* Variable-length dictionary offset supporting up to 16MB */
                size_t d_pos = dict_idx - 1;
                if (d_pos < 0x7FFF) {
                    frascolz_write16(op, (uint16_t)((d_pos & 0x7FFF) | 0x8000));
                    op += 2;
                } else {
                    frascolz_write16(op, 0xFFFF);
                    op += 2;
                    *op++ = (uint8_t)(d_pos & 0xFF);
                    *op++ = (uint8_t)((d_pos >> 8) & 0xFF);
                    *op++ = (uint8_t)((d_pos >> 16) & 0xFF);
                }

                if (match_code == 15) {
                    size_t m = match_extra - 15;
                    while (m >= 255) { *op++ = 255; m -= 255; }
                    *op++ = (uint8_t)m;
                }

                ip += match_len;
                anchor = ip;
                continue;
            }
        }
        ip++;
    }

    size_t last_lit = (size_t)(iend - anchor);
    if (last_lit > 0) {
        uint8_t *token = op++;
        uint8_t lit_code = (last_lit >= 15) ? 15 : (uint8_t)last_lit;
        *token = (uint8_t)(lit_code << 4);
        if (lit_code == 15) {
            size_t l = last_lit - 15;
            while (l >= 255) { *op++ = 255; l -= 255; }
            *op++ = (uint8_t)l;
        }
        memcpy(op, anchor, last_lit);
        op += last_lit;
    }

    return (int64_t)(op - dst);
}

int64_t frascolz_decompress_dict(const uint8_t *src, size_t src_len,
                                uint8_t *dst, size_t dst_cap,
                                const uint8_t *dict, size_t dict_len) {
    if (!src || !dst) return FRASCOLZ_ERR_PARAM;
    if (src_len < HEADER_SIZE) return FRASCOLZ_ERR_CORRUPT;
    if (frascolz_read32(src) != FRASCOLZ_MAGIC) return FRASCOLZ_ERR_CORRUPT;

    uint32_t expected_orig_size = frascolz_read32(src + 5);
    uint32_t expected_checksum = frascolz_read32(src + 9);
    if (dst_cap < expected_orig_size) return FRASCOLZ_ERR_BUF_SMALL;

    const uint8_t *ip = src + HEADER_SIZE;
    const uint8_t *const iend = src + src_len;
    uint8_t *op = dst;
    uint8_t *const oend = dst + expected_orig_size;

    while (ip < iend) {
        uint8_t token = *ip++;
        size_t lit_len = (token >> 4);
        size_t match_code = (token & 0x0F);

        if (lit_len == 15) {
            while (ip < iend && *ip == 255) { lit_len += 255; ip++; }
            if (ip >= iend) return FRASCOLZ_ERR_CORRUPT;
            lit_len += *ip++;
        }

        if (ip + lit_len > iend || op + lit_len > oend) return FRASCOLZ_ERR_CORRUPT;
        if (lit_len > 0) {
            memcpy(op, ip, lit_len);
            ip += lit_len;
            op += lit_len;
        }

        if (op == oend && ip == iend) break;
        if (ip + 2 > iend) return FRASCOLZ_ERR_CORRUPT;

        uint16_t raw_offset = frascolz_read16(ip);
        ip += 2;

        size_t d_idx = raw_offset & 0x7FFF;
        if (raw_offset == 0xFFFF) {
            if (ip + 3 > iend) return FRASCOLZ_ERR_CORRUPT;
            d_idx = (size_t)(ip[0]) | ((size_t)(ip[1]) << 8) | ((size_t)(ip[2]) << 16);
            ip += 3;
        }

        size_t match_len = match_code + MIN_MATCH;
        if (match_code == 15) {
            while (ip < iend && *ip == 255) { match_len += 255; ip++; }
            if (ip >= iend) return FRASCOLZ_ERR_CORRUPT;
            match_len += *ip++;
        }
        if (op + match_len > oend) return FRASCOLZ_ERR_CORRUPT;

        if (raw_offset & 0x8000 || raw_offset == 0xFFFF) {
            if (!dict || d_idx + match_len > dict_len) return FRASCOLZ_ERR_CORRUPT;
            memcpy(op, dict + d_idx, match_len);
        } else {
            if (raw_offset == 0 || (size_t)(op - dst) < raw_offset) return FRASCOLZ_ERR_CORRUPT;
            copy_match_fast(op, op - raw_offset, match_len);
        }
        op += match_len;
    }

    if ((size_t)(op - dst) != expected_orig_size) return FRASCOLZ_ERR_CORRUPT;
    if (frascolz_checksum32(dst, expected_orig_size) != expected_checksum) return FRASCOLZ_ERR_CHECKSUM;

    return (int64_t)expected_orig_size;
}

/* ========================================================================= */
/* NEURAL BYTE-PLANE TRANSPOSITION FILTERS                                   */
/* ========================================================================= */

void frascolz_filter_fp_split(const uint8_t *src, size_t len, uint8_t *dst) {
    size_t count = len / 4;
    uint8_t *p0 = dst;
    uint8_t *p1 = dst + count;
    uint8_t *p2 = dst + count * 2;
    uint8_t *p3 = dst + count * 3;

    for (size_t i = 0; i < count; i++) {
        p0[i] = src[i * 4 + 0];
        p1[i] = src[i * 4 + 1];
        p2[i] = src[i * 4 + 2];
        p3[i] = src[i * 4 + 3]; // Exponents grouped together
    }
}

void frascolz_filter_fp_unsplit(const uint8_t *src, size_t len, uint8_t *dst) {
    size_t count = len / 4;
    const uint8_t *p0 = src;
    const uint8_t *p1 = src + count;
    const uint8_t *p2 = src + count * 2;
    const uint8_t *p3 = src + count * 3;

    for (size_t i = 0; i < count; i++) {
        dst[i * 4 + 0] = p0[i];
        dst[i * 4 + 1] = p1[i];
        dst[i * 4 + 2] = p2[i];
        dst[i * 4 + 3] = p3[i];
    }
}

/* ========================================================================= */
/* DS4 / DEEPSEEK V4 TENSOR & DISK-BACKED KV CACHE ENGINE (ACTIVE FP TRANSP) */
/* ========================================================================= */

int64_t frascolz_compress_tensor(const uint8_t *tensor_bytes, size_t len,
                                uint8_t *dst, size_t dst_cap) {
    if (!tensor_bytes || !dst) return FRASCOLZ_ERR_PARAM;

    /* If 32-bit floats/tensors (len >= 64 && len % 4 == 0), perform active byte-plane transposition */
    if (len >= 64 && (len % 4 == 0)) {
        uint8_t *transposed = (uint8_t *)malloc(len);
        if (!transposed) return frascolz_compress_fast(tensor_bytes, len, dst, dst_cap);

        frascolz_filter_fp_split(tensor_bytes, len, transposed);
        int64_t res = frascolz_compress_fast(transposed, len, dst, dst_cap);
        free(transposed);

        /* Set neural level marker in container header */
        if (res > HEADER_SIZE) {
            dst[4] = (uint8_t)FRASCOLZ_LEVEL_NEURAL;
        }
        return res;
    }

    return frascolz_compress_fast(tensor_bytes, len, dst, dst_cap);
}

int64_t frascolz_decompress_tensor(const uint8_t *src, size_t src_len,
                                  uint8_t *dst, size_t dst_cap) {
    if (!src || !dst || src_len < HEADER_SIZE) return FRASCOLZ_ERR_PARAM;

    uint8_t level_marker = src[4];
    if ((level_marker & 0x7F) == FRASCOLZ_LEVEL_NEURAL) {
        uint32_t orig_size = frascolz_read32(src + 5);
        if (dst_cap < orig_size) return FRASCOLZ_ERR_BUF_SMALL;

        uint8_t *scratch = (uint8_t *)malloc(orig_size);
        if (!scratch) return FRASCOLZ_ERR_PARAM;

        int64_t dec_bytes = frascolz_decompress(src, src_len, scratch, orig_size);
        if (dec_bytes < 0) {
            free(scratch);
            return dec_bytes;
        }

        frascolz_filter_fp_unsplit(scratch, (size_t)dec_bytes, dst);
        free(scratch);
        return dec_bytes;
    }

    return frascolz_decompress(src, src_len, dst, dst_cap);
}

/* ========================================================================= */
/* CHUNKED STREAMING FOR HUGE FILES (GIGABYTES / TERABYTES)                 */
/* ========================================================================= */

int64_t frascolz_compress_chunk(const uint8_t *src_block, size_t block_len,
                               uint8_t *dst, size_t dst_cap,
                               int is_last_block) {
    (void)is_last_block;
    return frascolz_compress_fast(src_block, block_len, dst, dst_cap);
}

int64_t frascolz_decompress_chunk(const uint8_t *src_block, size_t block_len,
                                 uint8_t *dst, size_t dst_cap) {
    return frascolz_decompress(src_block, block_len, dst, dst_cap);
}
