# Contributing to FrascoLZ

Thank you for your interest in contributing to **FrascoLZ**!

FrascoLZ is an independent engineering project created by **Emilio Frascogna (FRS Software)**. To maintain high code quality, radical simplicity, and the integrity of our dual-licensing business model, all contributions must adhere to the following guidelines.

---

## 1. Radical Architectural Simplicity (Inspired by the "antirez" Philosophy)

- **Pure Standard C99:** Code in `engine_c/` must compile with standard C99 (`-std=c99 -Wall -Wextra -pedantic`).
- **Zero Dependencies:** Never add external libraries or runtime dependencies. Everything must be self-contained.
- **Portability:** Code must execute safely on 32-bit and 64-bit architectures, big-endian and little-endian, without unaligned memory access crashes.
- **Bounds Checking:** Every read and write pointer must be rigorously bounded. Buffer overruns will be immediately rejected.

---

## 2. Contributor License Agreement (CLA)

Because FrascoLZ is distributed under a **Dual-License Model** (Community Source-Available + Commercial Enterprise):

By submitting a Pull Request, issue, or code contribution to this repository, you agree that:
1. You grant **Emilio Frascogna (FRS Software)** an irrevocable, perpetual, worldwide, royalty-free, transferable license to use, modify, relicense, sublicense, and commercially distribute your contribution.
2. You confirm that the contribution is your original work and does not infringe upon any third-party copyrights, patents, or trade secrets.

This protects the project from patent trolls and enables FRS Software to continue offering dual-licensing to commercial studios.

---

## 3. Running the Test Suite Before Submitting

Always run the full test suite to guarantee 100% lossless bitstream parity:

```bash
# 1. Native C benchmark & memory sanitizers
cd engine_c
make
./build/frascolz_bench

# 2. TypeScript unit tests & fuzzing suite
npm test
# Or: npx --yes tsx --test src/core/frascolz.test.ts
```

All 12 unit tests must pass before opening a Pull Request.

---

**Questions or Security Disclosures:** Contact `Nos_1@icloud.com`.
