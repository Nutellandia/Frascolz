# Makefile for FrascoLZ - High Performance Pure C Compression Engine
# Emilio Frascogna (FRS)

CC ?= gcc
CFLAGS ?= -O3 -Wall -Wextra -pedantic -std=c99 -Iinclude
SAN_FLAGS = -fsanitize=address,undefined -g -O1 -Iinclude

SRCS = src/frascolz.c
OBJS = $(SRCS:.c=.o)
LIB = libfrascolz.a
CLI = frascolz

.PHONY: all clean test bench sanitize

all: $(LIB) $(CLI)

$(LIB): $(OBJS)
	ar rcs $@ $(OBJS)

src/%.o: src/%.c
	$(CC) $(CFLAGS) -c $< -o $@

$(CLI): cli/main.c $(LIB)
	$(CC) $(CFLAGS) cli/main.c -L. -lfrascolz -o $@

test: $(CLI)
	./$(CLI) -t

bench: $(CLI)
	./$(CLI) -b-synthetic

sanitize:
	$(CC) $(SAN_FLAGS) src/frascolz.c cli/main.c -o frascolz_san
	./frascolz_san -t
	@echo "All sanitizers passed cleanly! Zero memory leaks or undefined behavior."

clean:
	rm -f src/*.o $(LIB) $(CLI) frascolz_san test_out.frz test_decomp.bin

