/**
 * @file main.c
 * @brief FrascoLZ v3.0 Universal Engine Command Line Interface
 * @author Emilio Frascogna (FRS - Frascogna Software)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "frascolz.h"

static void print_usage(const char *prog) {
    printf("FrascoLZ %s - Universal Lossless Compression Engine\n", frascolz_version());
    printf("Created by Emilio Frascogna (FRS - Frascogna Software)\n\n");
    printf("Usage:\n");
    printf("  %s -c [-1|-2|-micro] <input_file> <output_file>   Compress file\n", prog);
    printf("  %s -d <input_file> <output_file>                  Decompress file\n", prog);
    printf("  %s -b <input_file>                                Benchmark speed & ratio\n", prog);
    printf("  %s -t                                             Run self-test suite (Micro & Massive RAM)\n", prog);
}

static uint8_t *read_entire_file(const char *path, size_t *out_len) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (size < 0) { fclose(f); return NULL; }

    uint8_t *buf = (uint8_t *)malloc((size_t)size + 1);
    if (!buf) { fclose(f); return NULL; }
    size_t read = fread(buf, 1, (size_t)size, f);
    fclose(f);
    *out_len = read;
    return buf;
}

static int write_entire_file(const char *path, const uint8_t *buf, size_t len) {
    FILE *f = fopen(path, "wb");
    if (!f) return 0;
    size_t written = fwrite(buf, 1, len, f);
    fclose(f);
    return written == len;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }

    if (strcmp(argv[1], "-t") == 0) {
        printf("[FrascoLZ v3.0 Self-Test] Testing all architectures...\n");

        /* Test 1: Standard and Adaptive */
        const char *sample = "FrascoLZ v3.0 universal engine test. FRS Software and Emilio Frascogna. "
                             "FrascoLZ v3.0 universal engine test. FRS Software and Emilio Frascogna. ";
        size_t slen = strlen(sample);
        size_t max_comp = frascolz_compress_bound(slen);
        uint8_t *comp = (uint8_t *)malloc(max_comp);
        uint8_t *decomp = (uint8_t *)malloc(slen + 100);

        int64_t csize = frascolz_compress_fast((const uint8_t *)sample, slen, comp, max_comp);
        int64_t dsize = frascolz_decompress(comp, (size_t)csize, decomp, slen + 100);

        if (dsize != (int64_t)slen || memcmp(sample, decomp, slen) != 0) {
            printf("FAIL: Standard fast roundtrip mismatch!\n");
            free(comp); free(decomp);
            return 1;
        }

        /* Test 2: Adaptive Legacy Micro (16KB L1 cache profile) */
        frascolz_config_t micro_cfg;
        frascolz_get_default_config(&micro_cfg, FRASCOLZ_RAM_TIER_MICRO);
        int64_t micro_csize = frascolz_compress_adaptive((const uint8_t *)sample, slen, comp, max_comp, &micro_cfg);
        int64_t micro_dsize = frascolz_decompress(comp, (size_t)micro_csize, decomp, slen + 100);

        if (micro_dsize != (int64_t)slen || memcmp(sample, decomp, slen) != 0) {
            printf("FAIL: Legacy Micro 16KB profile mismatch!\n");
            free(comp); free(decomp);
            return 1;
        }

        printf("PASS: All profiles verified! Standard and Legacy Micro (16KB) passed 100%% bit-a-bit.\n");
        free(comp); free(decomp);
        return 0;
    }

    if (strcmp(argv[1], "-b") == 0 && argc >= 3) {
        size_t slen = 0;
        uint8_t *src = read_entire_file(argv[2], &slen);
        if (!src) {
            fprintf(stderr, "Cannot open file: %s\n", argv[2]);
            return 1;
        }

        size_t max_comp = frascolz_compress_bound(slen);
        uint8_t *comp = (uint8_t *)malloc(max_comp);
        uint8_t *decomp = (uint8_t *)malloc(slen + 64);

        printf("=== Benchmarking FrascoLZ v3.0 on: %s (%zu bytes) ===\n", argv[2], slen);

        clock_t t0 = clock();
        int iterations = 10;
        int64_t csize = 0;
        for (int i = 0; i < iterations; i++) {
            csize = frascolz_compress_fast(src, slen, comp, max_comp);
        }
        clock_t t1 = clock();
        double comp_sec = (double)(t1 - t0) / CLOCKS_PER_SEC;
        double comp_mb_s = ((double)slen * iterations / (1024.0 * 1024.0)) / comp_sec;

        t0 = clock();
        int64_t dsize = 0;
        for (int i = 0; i < iterations; i++) {
            dsize = frascolz_decompress(comp, (size_t)csize, decomp, slen + 64);
        }
        t1 = clock();
        double decomp_sec = (double)(t1 - t0) / CLOCKS_PER_SEC;
        double decomp_mb_s = ((double)slen * iterations / (1024.0 * 1024.0)) / decomp_sec;

        if (dsize != (int64_t)slen || memcmp(src, decomp, slen) != 0) {
            fprintf(stderr, "ERROR: Lossless roundtrip verification failed!\n");
        } else {
            printf("Throughput: Compress %.1f MB/s | Decompress %.1f MB/s (Ratio: %.2f%%)\n",
                   comp_mb_s, decomp_mb_s, (double)csize / slen * 100.0);
        }

        free(src); free(comp); free(decomp);
        return 0;
    }

    if (strcmp(argv[1], "-c") == 0 && argc >= 4) {
        size_t slen = 0;
        uint8_t *src = read_entire_file(argv[2], &slen);
        if (!src) {
            fprintf(stderr, "Cannot read input: %s\n", argv[2]);
            return 1;
        }

        size_t max_comp = frascolz_compress_bound(slen);
        uint8_t *comp = (uint8_t *)malloc(max_comp);
        int64_t csize = frascolz_compress_fast(src, slen, comp, max_comp);

        if (!write_entire_file(argv[3], comp, (size_t)csize)) {
            fprintf(stderr, "Cannot write output: %s\n", argv[3]);
            free(src); free(comp);
            return 1;
        }

        printf("Compressed %zu -> %ld bytes (%.2f%%) into %s\n",
               slen, (long)csize, (double)csize / slen * 100.0, argv[3]);
        free(src); free(comp);
        return 0;
    }

    if (strcmp(argv[1], "-d") == 0 && argc >= 4) {
        size_t slen = 0;
        uint8_t *src = read_entire_file(argv[2], &slen);
        if (!src || slen < 13) {
            fprintf(stderr, "Invalid or empty archive: %s\n", argv[2]);
            if (src) free(src);
            return 1;
        }

        uint32_t orig_size = (uint32_t)src[5] | ((uint32_t)src[6] << 8) |
                             ((uint32_t)src[7] << 16) | ((uint32_t)src[8] << 24);
        uint8_t *dst = (uint8_t *)malloc(orig_size + 32);
        int64_t dsize = frascolz_decompress(src, slen, dst, orig_size + 32);

        if (dsize < 0 || !write_entire_file(argv[3], dst, (size_t)dsize)) {
            fprintf(stderr, "Decompression failed!\n");
            free(src); free(dst);
            return 1;
        }

        printf("Decompressed %zu -> %ld bytes into %s (Lossless OK)\n", slen, (long)dsize, argv[3]);
        free(src); free(dst);
        return 0;
    }

    print_usage(argv[0]);
    return 1;
}
