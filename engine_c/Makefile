# Makefile for FrascoLZ - High Performance Pure C Compression Engine
# Emilio Frascogna (FRS)

CC ?= gcc
CFLAGS ?= -O3 -Wall -Wextra -pedantic -std=c99 -Iinclude
SAN_FLAGS = -fsanitize=address,undefined -g -O1 -Iinclude

SRCS = src/frascolz.c
OBJS = $(SRCS:.c=.o)
LIB = libfrascolz.a
CLI = frascolz
BENCH = frascolz_bench

.PHONY: all clean test bench sanitize

all: $(LIB) $(CLI) $(BENCH)

$(LIB): $(OBJS)
	ar rcs $@ $(OBJS)

src/%.o: src/%.c
	$(CC) $(CFLAGS) -c $< -o $@

$(CLI): cli/main.c $(LIB)
	$(CC) $(CFLAGS) cli/main.c -L. -lfrascolz -o $@

$(BENCH): cli/bench.c $(LIB)
	$(CC) $(CFLAGS) cli/bench.c -L. -lfrascolz -o $@

test: $(CLI)
	./$(CLI) -t

bench: $(BENCH)
	./$(BENCH)

sanitize:
	$(CC) $(SAN_FLAGS) src/frascolz.c cli/main.c -o frascolz_san
	./frascolz_san -t
	$(CC) $(SAN_FLAGS) src/frascolz.c cli/bench.c -o frascolz_bench_san
	./frascolz_bench_san
	@echo "All sanitizers passed cleanly! Zero memory leaks or undefined behavior."

clean:
	rm -f src/*.o $(LIB) $(CLI) $(BENCH) frascolz_san frascolz_bench_san test_out.frz test_decomp.bin


