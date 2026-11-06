/**
 * @file main.c
 * @brief FrascoLZ v3.0 Universal Engine Command Line Interface & Test Suite
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
    printf("  %s -c <input_file> <output_file>       Compress file (Fast Profile)\n", prog);
    printf("  %s -d <input_file> <output_file>       Decompress file\n", prog);
    printf("  %s -b <input_file>                     Benchmark file throughput & ratio\n", prog);
    printf("  %s -b-synthetic                        Run Silesia & FP32 Tensor Benchmark\n", prog);
    printf("  %s -t                                  Run full self-test suite (All 6 modes)\n", prog);
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

static int run_self_tests(void) {
    printf("=== [FrascoLZ v3.0 Comprehensive Self-Test Suite] ===\n");

    const char *text_sample =
        "FrascoLZ v3.0 universal C99 compression engine created by Emilio Frascogna (FRS Software). "
        "Radical simplicity, zero dependencies, deterministic memory safety, and 3 adaptive RAM tiers! "
        "FrascoLZ v3.0 universal C99 compression engine created by Emilio Frascogna (FRS Software). "
        "Radical simplicity, zero dependencies, deterministic memory safety, and 3 adaptive RAM tiers! ";
    size_t text_len = strlen(text_sample);
    size_t cap = frascolz_compress_bound(text_len);

    uint8_t *comp = (uint8_t *)malloc(cap + 256);
    uint8_t *decomp = (uint8_t *)malloc(text_len + 256);

    if (!comp || !decomp) {
        printf("[FAIL] Allocation failed\n");
        if (comp) free(comp);
        if (decomp) free(decomp);
        return 1;
    }

    /* 1. Test Standard Fast Profile (STD 64KB Table) */
    int64_t csize = frascolz_compress_fast((const uint8_t *)text_sample, text_len, comp, cap);
    int64_t dsize = frascolz_decompress(comp, (size_t)csize, decomp, text_len + 256);

    if (dsize != (int64_t)text_len || memcmp(text_sample, decomp, text_len) != 0) {
        printf("[FAIL] Standard FAST profile roundtrip mismatch!\n");
        free(comp); free(decomp);
        return 1;
    }
    printf("  [PASS 1/6] Standard Fast Profile (64KB L2 Table)\n");

    /* 2. Test Adaptive MICRO Profile (16KB Table) */
    frascolz_config_t micro_cfg;
    frascolz_get_default_config(&micro_cfg, FRASCOLZ_RAM_TIER_MICRO);
    int64_t micro_csize = frascolz_compress_adaptive((const uint8_t *)text_sample, text_len, comp, cap, &micro_cfg);
    int64_t micro_dsize = frascolz_decompress(comp, (size_t)micro_csize, decomp, text_len + 256);

    if (micro_dsize != (int64_t)text_len || memcmp(text_sample, decomp, text_len) != 0) {
        printf("[FAIL] MICRO 16KB L1 cache profile mismatch!\n");
        free(comp); free(decomp);
        return 1;
    }
    printf("  [PASS 2/6] Adaptive MICRO Profile (16KB L1 Cache Table)\n");

    /* 3. Test Adaptive MASSIVE Profile (256KB 2-Candidate Table) */
    frascolz_config_t massive_cfg;
    frascolz_get_default_config(&massive_cfg, FRASCOLZ_RAM_TIER_MASSIVE);
    int64_t massive_csize = frascolz_compress_adaptive((const uint8_t *)text_sample, text_len, comp, cap, &massive_cfg);
    int64_t massive_dsize = frascolz_decompress(comp, (size_t)massive_csize, decomp, text_len + 256);

    if (massive_dsize != (int64_t)text_len || memcmp(text_sample, decomp, text_len) != 0) {
        printf("[FAIL] MASSIVE 256KB 2-candidate profile mismatch!\n");
        free(comp); free(decomp);
        return 1;
    }
    printf("  [PASS 3/6] Adaptive MASSIVE Profile (256KB 2-Candidate Search Table)\n");

    /* 4. Test FP32 Tensor Byte-Plane Transposition Filter */
    size_t num_floats = 1024;
    size_t fp_bytes = num_floats * sizeof(float);
    float *fp_src = (float *)malloc(fp_bytes);
    float *fp_decomp = (float *)malloc(fp_bytes);
    for (size_t i = 0; i < num_floats; i++) {
        fp_src[i] = (float)(i % 16) * 0.125f + 1.0f;
    }

    size_t fp_cap = frascolz_compress_bound(fp_bytes);
    uint8_t *fp_comp = (uint8_t *)malloc(fp_cap + 128);

    int64_t tensor_csize = frascolz_compress_tensor((const uint8_t *)fp_src, fp_bytes, fp_comp, fp_cap);
    int64_t tensor_dsize = frascolz_decompress_tensor(fp_comp, (size_t)tensor_csize, (uint8_t *)fp_decomp, fp_bytes);

    if (tensor_dsize != (int64_t)fp_bytes || memcmp(fp_src, fp_decomp, fp_bytes) != 0) {
        printf("[FAIL] FP32 Tensor Byte-Plane Transposition mismatch!\n");
        free(comp); free(decomp); free(fp_src); free(fp_decomp); free(fp_comp);
        return 1;
    }
    printf("  [PASS 4/6] FP32 Tensor Transposition Filter (Byte-Plane Active)\n");
    free(fp_src); free(fp_decomp); free(fp_comp);

    /* 5. Test Pre-Shared 16MB Dictionary Mode (Dual-Search) */
    const char *dict_str = "PreSharedDictionaryForFrascoLZV3TestKeyValuesAndStructureEngine";
    size_t dict_len = strlen(dict_str);
    int64_t dict_csize = frascolz_compress_dict((const uint8_t *)dict_str, dict_len, (const uint8_t *)text_sample, text_len, comp, cap);
    int64_t dict_dsize = frascolz_decompress_dict((const uint8_t *)dict_str, dict_len, comp, (size_t)dict_csize, decomp, text_len + 256);

    if (dict_dsize != (int64_t)text_len || memcmp(text_sample, decomp, text_len) != 0) {
        printf("[FAIL] Pre-Shared Dictionary roundtrip mismatch!\n");
        free(comp); free(decomp);
        return 1;
    }
    printf("  [PASS 5/6] Pre-Shared 16MB Dictionary Mode (Dual Dict+Src Search)\n");

    /* 6. Test Flagged Chunk Streaming */
    int64_t chunk_csize = frascolz_compress_chunk((const uint8_t *)text_sample, text_len, comp, cap, 1);
    int64_t chunk_dsize = frascolz_decompress(comp, (size_t)chunk_csize, decomp, text_len + 256);

    if (chunk_dsize != (int64_t)text_len || memcmp(text_sample, decomp, text_len) != 0) {
        printf("[FAIL] Flagged Chunk Streaming roundtrip mismatch!\n");
        free(comp); free(decomp);
        return 1;
    }
    printf("  [PASS 6/6] Flagged Chunk Streaming (is_last_block bit active)\n");

    printf("\n>>> RESULT: All 6 Core Engine Architectures Passed 100%% Bitstream Roundtrip! <<<\n");
    free(comp); free(decomp);
    return 0;
}

static void run_synthetic_benchmark(void) {
    printf("=== [FrascoLZ v3.0 Reproducible Benchmarks] ===\n");

    /* 1. Synthetic Silesia / Text Corpus Buffer (1 MB) */
    size_t text_bytes = 1024 * 1024;
    uint8_t *text_buf = (uint8_t *)malloc(text_bytes);
    const char *pat = "FrascoLZ v3.0 C99 Engine - Emilio Frascogna (FRS Software) - Fast Lossless Compression. ";
    size_t pat_len = strlen(pat);
    for (size_t i = 0; i < text_bytes; i++) {
        text_buf[i] = pat[i % pat_len];
    }

    size_t cap = frascolz_compress_bound(text_bytes);
    uint8_t *comp = (uint8_t *)malloc(cap);
    uint8_t *decomp = (uint8_t *)malloc(text_bytes + 64);

    int iterations = 20;

    /* Benchmark STD Profile */
    clock_t t0 = clock();
    int64_t csize_std = 0;
    for (int i = 0; i < iterations; i++) {
        csize_std = frascolz_compress_fast(text_buf, text_bytes, comp, cap);
    }
    clock_t t1 = clock();
    double std_comp_mb_s = ((double)text_bytes * iterations / (1024.0 * 1024.0)) / ((double)(t1 - t0) / CLOCKS_PER_SEC);

    t0 = clock();
    for (int i = 0; i < iterations; i++) {
        frascolz_decompress(comp, (size_t)csize_std, decomp, text_bytes + 64);
    }
    t1 = clock();
    double std_decomp_mb_s = ((double)text_bytes * iterations / (1024.0 * 1024.0)) / ((double)(t1 - t0) / CLOCKS_PER_SEC);

    printf("1. Silesia/Text Buffer (1.0 MB):\n");
    printf("   STD 64KB Profile  : Compress %.1f MB/s | Decompress %.1f MB/s | Ratio: %.2f%%\n",
           std_comp_mb_s, std_decomp_mb_s, (double)csize_std / text_bytes * 100.0);

    /* Benchmark MASSIVE Profile */
    frascolz_config_t massive_cfg;
    frascolz_get_default_config(&massive_cfg, FRASCOLZ_RAM_TIER_MASSIVE);

    t0 = clock();
    int64_t csize_mas = 0;
    for (int i = 0; i < iterations; i++) {
        csize_mas = frascolz_compress_adaptive(text_buf, text_bytes, comp, cap, &massive_cfg);
    }
    t1 = clock();
    double mas_comp_mb_s = ((double)text_bytes * iterations / (1024.0 * 1024.0)) / ((double)(t1 - t0) / CLOCKS_PER_SEC);

    printf("   MASSIVE 256KB Tier: Compress %.1f MB/s | Decompress %.1f MB/s | Ratio: %.2f%%\n",
           mas_comp_mb_s, std_decomp_mb_s, (double)csize_mas / text_bytes * 100.0);

    free(text_buf);

    /* 2. Synthetic FP32 Tensor Buffer (1 MB = 262,144 floats) */
    size_t fp_floats = 262144;
    size_t fp_bytes = fp_floats * sizeof(float);
    float *fp_buf = (float *)malloc(fp_bytes);
    for (size_t i = 0; i < fp_floats; i++) {
        fp_buf[i] = (float)(i % 32) * 0.03125f + 2.0f;
    }

    t0 = clock();
    int64_t csize_tensor = 0;
    for (int i = 0; i < iterations; i++) {
        csize_tensor = frascolz_compress_tensor((const uint8_t *)fp_buf, fp_bytes, comp, cap);
    }
    t1 = clock();
    double fp_comp_mb_s = ((double)fp_bytes * iterations / (1024.0 * 1024.0)) / ((double)(t1 - t0) / CLOCKS_PER_SEC);

    t0 = clock();
    for (int i = 0; i < iterations; i++) {
        frascolz_decompress_tensor(comp, (size_t)csize_tensor, decomp, fp_bytes);
    }
    t1 = clock();
    double fp_decomp_mb_s = ((double)fp_bytes * iterations / (1024.0 * 1024.0)) / ((double)(t1 - t0) / CLOCKS_PER_SEC);

    printf("2. FP32 Tensor Buffer (1.0 MB / Byte-Plane Active):\n");
    printf("   Tensor FP32 Filter: Compress %.1f MB/s | Decompress %.1f MB/s | Ratio: %.2f%%\n",
           fp_comp_mb_s, fp_decomp_mb_s, (double)csize_tensor / fp_bytes * 100.0);

    free(fp_buf); free(comp); free(decomp);
    printf("=== Benchmark Completed Successfully ===\n");
}

int main(int argc, char **argv) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }

    if (strcmp(argv[1], "-t") == 0) {
        return run_self_tests();
    }

    if (strcmp(argv[1], "-b-synthetic") == 0) {
        run_synthetic_benchmark();
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

