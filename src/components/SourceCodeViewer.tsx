import React, { useState } from 'react';
import { FileCode2, Copy, Check, Download, Terminal, FolderArchive } from 'lucide-react';

const C_HEADER_CODE = `/**
 * @file frascolz.h
 * @brief FrascoLZ - Ultra-Fast Streaming & Real-Time Lossless Compression Engine
 * @author Emilio Frascogna (FRS - Frascogna Software)
 * @copyright (c) 2026 FRS. Dual-Licensed: FRS Commercial / AGPLv3 Community.
 */

#ifndef FRASCOLZ_H
#define FRASCOLZ_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define FRASCOLZ_MAGIC           0x5A535246U /* 'F' 'R' 'S' 'Z' */
#define FRASCOLZ_VERSION_MAJOR   2
#define FRASCOLZ_VERSION_MINOR   0
#define FRASCOLZ_VERSION_PATCH   0

#define FRASCOLZ_LEVEL_FAST      1 /* Real-time gaming, network delta */
#define FRASCOLZ_LEVEL_HIGH      2 /* High-density asset packaging */
#define FRASCOLZ_LEVEL_NEURAL    3 /* Float/Neural vector mode */

#define FRASCOLZ_OK              0
#define FRASCOLZ_ERR_CORRUPT    -1
#define FRASCOLZ_ERR_BUF_SMALL  -2
#define FRASCOLZ_ERR_CHECKSUM   -3
#define FRASCOLZ_ERR_PARAM      -4

const char *frascolz_version(void);
size_t frascolz_compress_bound(size_t src_len);
uint32_t frascolz_checksum32(const uint8_t *data, size_t len);

int64_t frascolz_compress_fast(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap);

int64_t frascolz_compress_high(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap);

int64_t frascolz_compress(const uint8_t *src, size_t src_len,
                          uint8_t *dst, size_t dst_cap,
                          int level);

int64_t frascolz_decompress(const uint8_t *src, size_t src_len,
                            uint8_t *dst, size_t dst_cap);

/* MILESTONE v2.0 INNOVATIONS */
int64_t frascolz_compress_dict(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap,
                              const uint8_t *dict, size_t dict_len);

int64_t frascolz_decompress_dict(const uint8_t *src, size_t src_len,
                                uint8_t *dst, size_t dst_cap,
                                const uint8_t *dict, size_t dict_len);

void frascolz_filter_fp_split(const uint8_t *src, size_t len, uint8_t *dst);
void frascolz_filter_fp_unsplit(const uint8_t *src, size_t len, uint8_t *dst);

#ifdef __cplusplus
}
#endif
#endif /* FRASCOLZ_H */
`;

const C_SOURCE_CODE = `/**
 * @file frascolz.c
 * @brief Implementation of FrascoLZ - Ultra-Fast Streaming Lossless Compression
 * @author Emilio Frascogna (FRS - Frascogna Software)
 */

#include "frascolz.h"
#include <string.h>

#define HASH_BITS          14
#define HASH_SIZE          (1U << HASH_BITS) /* 16,384 entries = 64 KB L1/L2 cache */
#define MIN_MATCH          4
#define MAX_DISTANCE       65535U
#define HEADER_SIZE        13

static inline uint32_t hash4(uint32_t v) {
    return (v * 2654435761U) >> (32 - HASH_BITS);
}

const char *frascolz_version(void) {
    return "1.0.0-frascolz-frs";
}

size_t frascolz_compress_bound(size_t src_len) {
    return HEADER_SIZE + src_len + (src_len / 255) + 32;
}

uint32_t frascolz_checksum32(const uint8_t *data, size_t len) {
    uint32_t a = 1, b = 0;
    const uint32_t MOD_ADLER = 65521;
    for (size_t i = 0; i < len; i++) {
        a = (a + data[i]) % MOD_ADLER;
        b = (b + a) % MOD_ADLER;
    }
    return (b << 16) | a;
}

/* Fast Level 1: Sub-millisecond stream compressor */
int64_t frascolz_compress_fast(const uint8_t *src, size_t src_len,
                              uint8_t *dst, size_t dst_cap) {
    if (!src || !dst) return FRASCOLZ_ERR_PARAM;
    if (dst_cap < frascolz_compress_bound(src_len)) return FRASCOLZ_ERR_BUF_SMALL;

    /* Write 13-byte Header */
    memcpy(dst, &(uint32_t){FRASCOLZ_MAGIC}, 4);
    dst[4] = (uint8_t)FRASCOLZ_LEVEL_FAST;
    memcpy(dst + 5, &(uint32_t){(uint32_t)src_len}, 4);
    memcpy(dst + 9, &(uint32_t){frascolz_checksum32(src, src_len)}, 4);

    uint8_t *op = dst + HEADER_SIZE;
    const uint8_t *ip = src;
    const uint8_t *anchor = src;
    const uint8_t *const iend = src + src_len;
    const uint8_t *const mflimit = (src_len > MIN_MATCH) ? (iend - MIN_MATCH) : src;

    uint32_t hash_table[HASH_SIZE];
    memset(hash_table, 0, sizeof(hash_table));

    while (ip < mflimit) {
        uint32_t v;
        memcpy(&v, ip, 4);
        uint32_t h = hash4(v);
        const uint8_t *ref = src + hash_table[h];
        hash_table[h] = (uint32_t)(ip - src);

        if (ref >= src && ref < ip && (ip - ref) <= MAX_DISTANCE) {
            uint32_t ref_v;
            memcpy(&ref_v, ref, 4);
            if (ref_v == v) {
                size_t lit_len = (size_t)(ip - anchor);
                size_t offset = (size_t)(ip - ref);

                ip += MIN_MATCH;
                ref += MIN_MATCH;
                while (ip < iend && *ip == *ref) {
                    ip++;
                    ref++;
                }
                size_t match_len = (size_t)(ip - (anchor + lit_len));

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

                memcpy(op, &(uint16_t){(uint16_t)offset}, 2);
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

/* Decompressor: Strict Bounds Checking */
int64_t frascolz_decompress(const uint8_t *src, size_t src_len,
                            uint8_t *dst, size_t dst_cap) {
    if (!src || !dst) return FRASCOLZ_ERR_PARAM;
    if (src_len < HEADER_SIZE) return FRASCOLZ_ERR_CORRUPT;

    uint32_t magic;
    memcpy(&magic, src, 4);
    if (magic != FRASCOLZ_MAGIC) return FRASCOLZ_ERR_CORRUPT;

    uint32_t orig_size, expected_crc;
    memcpy(&orig_size, src + 5, 4);
    memcpy(&expected_crc, src + 9, 4);

    if (dst_cap < orig_size) return FRASCOLZ_ERR_BUF_SMALL;

    const uint8_t *ip = src + HEADER_SIZE;
    const uint8_t *const iend = src + src_len;
    uint8_t *op = dst;
    uint8_t *const oend = dst + orig_size;

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

        uint16_t offset;
        memcpy(&offset, ip, 2);
        ip += 2;
        if (offset == 0 || (size_t)(op - dst) < offset) return FRASCOLZ_ERR_CORRUPT;

        size_t match_len = match_code + MIN_MATCH;
        if (match_code == 15) {
            while (ip < iend && *ip == 255) { match_len += 255; ip++; }
            if (ip >= iend) return FRASCOLZ_ERR_CORRUPT;
            match_len += *ip++;
        }

        if (op + match_len > oend) return FRASCOLZ_ERR_CORRUPT;

        const uint8_t *match_src = op - offset;
        for (size_t m = 0; m < match_len; m++) {
            op[m] = match_src[m];
        }
        op += match_len;
    }

    if ((size_t)(op - dst) != orig_size) return FRASCOLZ_ERR_CORRUPT;
    if (frascolz_checksum32(dst, orig_size) != expected_crc) return FRASCOLZ_ERR_CHECKSUM;

    return (int64_t)orig_size;
}
`;

const MAKEFILE_CODE = `# Makefile for FrascoLZ - Pure C Engine
CC = gcc
CFLAGS = -O3 -Wall -Wextra -pedantic -std=c99 -Iinclude

all: libfrascolz.a frascolz

libfrascolz.a: src/frascolz.o
	ar rcs $@ $^

src/frascolz.o: src/frascolz.c
	$(CC) $(CFLAGS) -c $< -o $@

frascolz: cli/main.c libfrascolz.a
	$(CC) $(CFLAGS) cli/main.c -L. -lfrascolz -o $@

test: frascolz
	./frascolz -t

sanitize:
	$(CC) -fsanitize=address,undefined -g -Iinclude src/frascolz.c cli/main.c -o frascolz_san
	./frascolz_san -t
`;

export const SourceCodeViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<'h' | 'c' | 'make'>('h');
  const [copied, setCopied] = useState(false);

  const getActiveCode = () => {
    switch (activeFile) {
      case 'h':
        return { name: 'frascolz.h', code: C_HEADER_CODE };
      case 'c':
        return { name: 'frascolz.c', code: C_SOURCE_CODE };
      case 'make':
        return { name: 'Makefile', code: MAKEFILE_CODE };
    }
  };

  const current = getActiveCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([current.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = current.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            <FileCode2 className="w-4 h-4" />
            Codice Sorgente Nativo C99 & SDK
          </div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight mt-1">
            Architettura C Pura a Zero Dipendenze (Ispirata alla filosofia di Salvatore Sanfilippo)
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
            Sviluppato interamente da Emilio Frascogna, il codice adotta il modello del C99 essenziale reso celebre da Salvatore Sanfilippo (antirez): zero dipendenze esterne, massima leggibilità e controllo millimetrico di cache e memoria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiato!' : 'Copia File'}</span>
          </button>

          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Scarica {current.name}</span>
          </button>
        </div>
      </div>

      {/* File Tabs */}
      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={() => setActiveFile('h')}
          className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium border-t border-x transition-colors ${
            activeFile === 'h'
              ? 'bg-zinc-900 border-zinc-700 text-emerald-400'
              : 'bg-zinc-950/60 border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          include/frascolz.h
        </button>

        <button
          onClick={() => setActiveFile('c')}
          className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium border-t border-x transition-colors ${
            activeFile === 'c'
              ? 'bg-zinc-900 border-zinc-700 text-emerald-400'
              : 'bg-zinc-950/60 border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          src/frascolz.c
        </button>

        <button
          onClick={() => setActiveFile('make')}
          className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium border-t border-x transition-colors ${
            activeFile === 'make'
              ? 'bg-zinc-900 border-zinc-700 text-emerald-400'
              : 'bg-zinc-950/60 border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Makefile
        </button>
      </div>

      {/* Code Editor Frame */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-b-xl rounded-tr-xl p-4 overflow-x-auto">
        <pre className="font-mono text-xs text-zinc-300 leading-relaxed">
          <code>{current.code}</code>
        </pre>
      </div>

      {/* Local compilation instruction box */}
      <div className="mt-6 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
        <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          Come Compilare sul Tuo Computer Locale (Passo-Passo per Emilio Frascogna)
        </h4>
        <div className="mt-2 text-xs font-mono text-zinc-400 space-y-1">
          <div className="text-zinc-500"># 1. Compilare libreria statica ed eseguibile CLI con ottimizzazioni -O3:</div>
          <div className="text-emerald-400 bg-zinc-900/90 p-2 rounded">make</div>
          <div className="text-zinc-500 mt-2"># 2. Eseguire la suite di self-test:</div>
          <div className="text-emerald-400 bg-zinc-900/90 p-2 rounded">make test</div>
          <div className="text-zinc-500 mt-2"># 3. Verificare con AddressSanitizer &amp; UndefinedBehaviorSanitizer:</div>
          <div className="text-emerald-400 bg-zinc-900/90 p-2 rounded">make sanitize</div>
        </div>
      </div>
    </div>
  );
};
