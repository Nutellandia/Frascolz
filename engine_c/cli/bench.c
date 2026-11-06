/**
 * @file bench.c
 * @brief Standalone Benchmark Suite & Fuzzing Harness for FrascoLZ v3.0
 * @author Emilio Frascogna (FRS - Frascogna Software)
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include "frascolz.h"

static double get_time_sec(void) {
    return (double)clock() / CLOCKS_PER_SEC;
}

static int benchmark_json_text_dataset(void) {
    printf("\n--- 1. BENCHMARK: JSON & Repetitive Text (1.0 MB Buffer) ---\n");
    size_t size = 1024 * 1024;
    uint8_t *src = (uint8_t *)malloc(size);
    const char *sample = "{\"user\":\"emilio_frascogna\",\"role\":\"cto\",\"engine\":\"frascolz_v3\",\"status\":\"active\"},";
    size_t slen = strlen(sample);
    for (size_t i = 0; i < size; i++) {
        src[i] = (uint8_t)sample[i % slen];
    }

    size_t cap = frascolz_compress_bound(size);
    uint8_t *comp = (uint8_t *)malloc(cap);
    uint8_t *decomp = (uint8_t *)malloc(size + 256);

    int iters = 25;

    /* A. FAST Profile (64KB L2 Table) */
    double t0 = get_time_sec();
    int64_t csize_fast = 0;
    for (int i = 0; i < iters; i++) {
        csize_fast = frascolz_compress_fast(src, size, comp, cap);
    }
    double t1 = get_time_sec();
    double fast_c_speed = ((double)size * iters / (1024.0 * 1024.0)) / (t1 - t0);

    t0 = get_time_sec();
    int64_t dsize_fast = 0;
    for (int i = 0; i < iters; i++) {
        dsize_fast = frascolz_decompress(comp, (size_t)csize_fast, decomp, size + 256);
    }
    t1 = get_time_sec();
    double fast_d_speed = ((double)size * iters / (1024.0 * 1024.0)) / (t1 - t0);

    int fast_ok = (dsize_fast == (int64_t)size && memcmp(src, decomp, size) == 0);

    /* B. MASSIVE Profile (256KB 2-Candidate Table) */
    frascolz_config_t massive_cfg;
    frascolz_get_default_config(&massive_cfg, FRASCOLZ_RAM_TIER_MASSIVE);
    t0 = get_time_sec();
    int64_t csize_mas = 0;
    for (int i = 0; i < iters; i++) {
        csize_mas = frascolz_compress_adaptive(src, size, comp, cap, &massive_cfg);
    }
    t1 = get_time_sec();
    double mas_c_speed = ((double)size * iters / (1024.0 * 1024.0)) / (t1 - t0);

    t0 = get_time_sec();
    int64_t dsize_mas = 0;
    for (int i = 0; i < iters; i++) {
        dsize_mas = frascolz_decompress(comp, (size_t)csize_mas, decomp, size + 256);
    }
    t1 = get_time_sec();
    double mas_d_speed = ((double)size * iters / (1024.0 * 1024.0)) / (t1 - t0);

    int mas_ok = (dsize_mas == (int64_t)size && memcmp(src, decomp, size) == 0);

    printf("  [STD 64KB Profile]     Compress: %7.1f MB/s | Decompress: %7.1f MB/s | Ratio: %5.2f%% | Roundtrip: %s\n",
           fast_c_speed, fast_d_speed, (double)csize_fast / size * 100.0, fast_ok ? "PASSED" : "FAILED");
    printf("  [MASSIVE 256KB Tier]   Compress: %7.1f MB/s | Decompress: %7.1f MB/s | Ratio: %5.2f%% | Roundtrip: %s\n",
           mas_c_speed, mas_d_speed, (double)csize_mas / size * 100.0, mas_ok ? "PASSED" : "FAILED");

    free(src); free(comp); free(decomp);
    return fast_ok && mas_ok;
}

static int benchmark_fp32_tensor_dataset(void) {
    printf("\n--- 2. BENCHMARK: Realistic Neural FP32 Weights (1.0 MB / 262,144 Float32s) ---\n");
    size_t count = 262144;
    size_t bytes = count * sizeof(float);
    float *tensor = (float *)malloc(bytes);
    
    for (size_t i = 0; i < count; i++) {
        tensor[i] = (float)(sin((double)i * 0.05) * 0.125 + cos((double)i * 0.01) * 0.5);
    }

    size_t cap = frascolz_compress_bound(bytes);
    uint8_t *comp = (uint8_t *)malloc(cap);
    float *decomp = (float *)malloc(bytes + 256);

    int iters = 25;

    int64_t raw_csize = frascolz_compress_fast((const uint8_t *)tensor, bytes, comp, cap);

    double t0 = get_time_sec();
    int64_t fp_csize = 0;
    for (int i = 0; i < iters; i++) {
        fp_csize = frascolz_compress_tensor((const uint8_t *)tensor, bytes, comp, cap);
    }
    double t1 = get_time_sec();
    double fp_c_speed = ((double)bytes * iters / (1024.0 * 1024.0)) / (t1 - t0);

    t0 = get_time_sec();
    int64_t fp_dsize = 0;
    for (int i = 0; i < iters; i++) {
        fp_dsize = frascolz_decompress_tensor(comp, (size_t)fp_csize, (uint8_t *)decomp, bytes + 256);
    }
    t1 = get_time_sec();
    double fp_d_speed = ((double)bytes * iters / (1024.0 * 1024.0)) / (t1 - t0);

    int fp_ok = (fp_dsize == (int64_t)bytes && memcmp(tensor, decomp, bytes) == 0);

    printf("  [Raw FP32 LZ77]        Compressed Size: %ld bytes (Ratio: %.2f%%)\n",
           (long)raw_csize, (double)raw_csize / bytes * 100.0);
    printf("  [Byte-Plane Transposed] Compress: %7.1f MB/s | Decompress: %7.1f MB/s | Ratio: %5.2f%% | Roundtrip: %s\n",
           fp_c_speed, fp_d_speed, (double)fp_csize / bytes * 100.0, fp_ok ? "PASSED" : "FAILED");

    free(tensor); free(comp); free(decomp);
    return fp_ok;
}

static int benchmark_dictionary_dataset(void) {
    printf("\n--- 3. BENCHMARK: Pre-Shared 1MB Dictionary (Dual-Search Dict+Src) ---\n");
    size_t dict_bytes = 1024 * 1024; // 1 MB Dictionary
    size_t payload_bytes = 256 * 1024; // 256 KB Payload Stream

    uint8_t *dict_buf = (uint8_t *)malloc(dict_bytes);
    uint8_t *payload_buf = (uint8_t *)malloc(payload_bytes);

    const char *schema = "{\"id\":1001,\"schema\":\"frascolz_v3_schema\",\"key\":\"access_token_bearer_signature_2026\"},";
    size_t slen = strlen(schema);

    for (size_t i = 0; i < dict_bytes; i++) dict_buf[i] = (uint8_t)schema[i % slen];
    for (size_t i = 0; i < payload_bytes; i++) payload_buf[i] = (uint8_t)schema[i % slen];

    size_t cap = frascolz_compress_bound(payload_bytes);
    uint8_t *comp = (uint8_t *)malloc(cap);
    uint8_t *decomp = (uint8_t *)malloc(payload_bytes + 256);

    int64_t dict_csize = frascolz_compress_dict(payload_buf, payload_bytes,
                                                comp, cap,
                                                dict_buf, dict_bytes);

    int64_t dict_dsize = frascolz_decompress_dict(comp, (size_t)dict_csize,
                                                  decomp, payload_bytes + 256,
                                                  dict_buf, dict_bytes);

    int dict_ok = (dict_dsize == (int64_t)payload_bytes && memcmp(payload_buf, decomp, payload_bytes) == 0);

    printf("  [Dual-Search 1MB Dict] Payload: %zu KB -> Compressed: %ld B (Ratio: %.2f%% | Roundtrip: %s)\n",
           payload_bytes / 1024, (long)dict_csize, (double)dict_csize / payload_bytes * 100.0,
           dict_ok ? "PASSED" : "FAILED");

    free(dict_buf); free(payload_buf); free(comp); free(decomp);
    return dict_ok;
}

static void run_corruption_fuzzing_audit(void) {
    printf("\n--- 4. MEMORY SAFETY AUDIT: Corrupted Bitstream & Fuzzing Immunity ---\n");
    srand((unsigned int)time(NULL));

    size_t size = 1024;
    uint8_t *src = (uint8_t *)malloc(size);
    for (size_t i = 0; i < size; i++) src[i] = (uint8_t)(i % 256);

    size_t cap = frascolz_compress_bound(size);
    uint8_t *comp = (uint8_t *)malloc(cap);
    uint8_t *decomp = (uint8_t *)malloc(size + 128);

    int64_t csize = frascolz_compress_fast(src, size, comp, cap);

    int safe_rejections = 0;
    int total_mutations = 1000;

    for (int m = 0; m < total_mutations; m++) {
        uint8_t *corrupt_comp = (uint8_t *)malloc((size_t)csize);
        memcpy(corrupt_comp, comp, (size_t)csize);

        size_t idx = (size_t)rand() % (size_t)csize;
        corrupt_comp[idx] ^= (uint8_t)(1 << (rand() % 8));

        int64_t res = frascolz_decompress(corrupt_comp, (size_t)csize, decomp, size + 128);
        if (res < 0) {
            safe_rejections++;
        }
        free(corrupt_comp);
    }

    printf("  [Fuzzing Immunity]     %d / %d corrupted bitstreams cleanly rejected without process crash.\n",
           safe_rejections, total_mutations);

    free(src); free(comp); free(decomp);
}

int main(int argc, char **argv) {
    (void)argc; (void)argv;
    printf("=======================================================================\n");
    printf("  FrascoLZ v3.0 Universal Engine - Standalone Benchmark & Audit Suite  \n");
    printf("  Created by Emilio Frascogna (FRS Software)                          \n");
    printf("=======================================================================\n");

    int json_ok = benchmark_json_text_dataset();
    int fp_ok = benchmark_fp32_tensor_dataset();
    int dict_ok = benchmark_dictionary_dataset();
    run_corruption_fuzzing_audit();

    int all_ok = json_ok && fp_ok && dict_ok;
    printf("\n>>> OVERALL VERDICT: %s <<<\n\n", all_ok ? "PASSED (100% Bit-a-Bit Verified)" : "FAILED");
    return all_ok ? 0 : 1;
}
