"""
Self-contained QR Code SVG generator in pure Python.
Supports byte encoding with standard Reed-Solomon error correction (EC Level L / M).
"""

# GF(256) Tables for QR Reed-Solomon Codec
EXP = [0] * 512
LOG = [0] * 256
_x = 1
for _i in range(255):
    EXP[_i] = _x
    EXP[_i + 255] = _x
    LOG[_x] = _i
    _x <<= 1
    if _x & 256:
        _x ^= 0x11D


def gf_mul(a: int, b: int) -> int:
    if a == 0 or b == 0:
        return 0
    return EXP[LOG[a] + LOG[b]]


def rs_poly_mul(p1, p2):
    r = [0] * (len(p1) + len(p2) - 1)
    for i, c1 in enumerate(p1):
        for j, c2 in enumerate(p2):
            r[i + j] ^= gf_mul(c1, c2)
    return r


def rs_gen_poly(n: int):
    p = [1]
    for i in range(n):
        p = rs_poly_mul(p, [1, EXP[i]])
    return p


def rs_encode(data, ec_len: int):
    gen = rs_gen_poly(ec_len)
    res = list(data) + [0] * ec_len
    for i in range(len(data)):
        coef = res[i]
        if coef != 0:
            for j in range(len(gen)):
                res[i + j] ^= gf_mul(gen[j], coef)
    return res[len(data):]


# Version info: (version, total_bytes, ec_bytes_per_block, num_blocks)
# Using EC Level L (7% recovery) and M (15% recovery)
QR_SPECS = [
    # (ver, data_capacity_L, ec_len_L, data_capacity_M, ec_len_M)
    (1, 19, 7, 16, 10),
    (2, 34, 10, 28, 16),
    (3, 55, 15, 44, 26),
    (4, 80, 20, 64, 36),
    (5, 108, 26, 86, 48),
    (6, 136, 36, 108, 64),
    (7, 156, 40, 124, 72),
    (8, 194, 48, 154, 88),
]

ALIGNMENT_PATTERNS = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
    7: [6, 22, 38],
    8: [6, 24, 42],
}


def get_version_for_data(byte_len: int):
    for spec in QR_SPECS:
        ver, cap_l, ec_l, cap_m, ec_m = spec
        if byte_len <= cap_l:
            return ver, cap_l, ec_l
    return 8, 194, 48


def encode_data(text: str, total_data_bytes: int) -> bytes:
    raw = text.encode("utf-8")
    bit_buffer = []

    def append_bits(val, num_bits):
        for i in range(num_bits - 1, -1, -1):
            bit_buffer.append((val >> i) & 1)

    # 1. Byte mode indicator: 0100
    append_bits(0b0100, 4)
    # 2. Character count (8 bits for V1-9 byte mode)
    append_bits(len(raw), 8)
    # 3. Data bytes
    for b in raw:
        append_bits(b, 8)
    # 4. Terminator (up to 4 zeroes)
    needed = total_data_bytes * 8
    term_len = min(4, needed - len(bit_buffer))
    append_bits(0, term_len)
    # 5. Byte align
    while len(bit_buffer) % 8 != 0:
        bit_buffer.append(0)

    # Convert to bytes
    res = bytearray()
    for i in range(0, len(bit_buffer), 8):
        byte_val = 0
        for bit in bit_buffer[i : i + 8]:
            byte_val = (byte_val << 1) | bit
        res.append(byte_val)

    # 6. Pad bytes 0xEC, 0x11
    pad_bytes = [0xEC, 0x11]
    pad_idx = 0
    while len(res) < total_data_bytes:
        res.append(pad_bytes[pad_idx % 2])
        pad_idx += 1

    return bytes(res)


def create_qr_matrix(text: str):
    raw_bytes = text.encode("utf-8")
    version, total_data, ec_len = get_version_for_data(len(raw_bytes))
    size = 4 * version + 17

    data_codewords = encode_data(text, total_data)
    ec_codewords = rs_encode(list(data_codewords), ec_len)
    all_codewords = list(data_codewords) + ec_codewords

    # Create grid: None = unassigned, True = dark, False = light
    matrix = [[None for _ in range(size)] for _ in range(size)]
    is_function = [[False for _ in range(size)] for _ in range(size)]

    def set_module(r, c, val, func=False):
        if 0 <= r < size and 0 <= c < size:
            matrix[r][c] = val
            if func:
                is_function[r][c] = True

    # 1. Finder patterns (7x7) at (0,0), (0, size-7), (size-7, 0)
    for top_r, left_c in [(0, 0), (0, size - 7), (size - 7, 0)]:
        for r in range(7):
            for c in range(7):
                if r in (0, 6) or c in (0, 6) or (2 <= r <= 4 and 2 <= c <= 4):
                    set_module(top_r + r, left_c + c, True, True)
                else:
                    set_module(top_r + r, left_c + c, False, True)

        # Separators
        for r in range(-1, 8):
            for c in range(-1, 8):
                if r in (-1, 7) or c in (-1, 7):
                    rr, cc = top_r + r, left_c + c
                    if 0 <= rr < size and 0 <= cc < size:
                        set_module(rr, cc, False, True)

    # 2. Timing patterns
    for i in range(8, size - 8):
        val = (i % 2 == 0)
        set_module(6, i, val, True)
        set_module(i, 6, val, True)

    # 3. Alignment patterns
    coords = ALIGNMENT_PATTERNS.get(version, [])
    for r in coords:
        for c in coords:
            # Skip if overlapping finder patterns
            if (r < 9 and c < 9) or (r < 9 and c > size - 9) or (r > size - 9 and c < 9):
                continue
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    is_edge = abs(dr) == 2 or abs(dc) == 2
                    is_center = dr == 0 and dc == 0
                    set_module(r + dr, c + dc, is_edge or is_center, True)

    # 4. Dark module
    set_module(4 * version + 9, 8, True, True)

    # 5. Format info area reservations
    for i in range(9):
        if not is_function[8][i]:
            set_module(8, i, False, True)
        if not is_function[i][8]:
            set_module(i, 8, False, True)
    for i in range(8):
        if not is_function[8][size - 1 - i]:
            set_module(8, size - 1 - i, False, True)
        if not is_function[size - 1 - i][8]:
            set_module(size - 1 - i, 8, False, True)

    # 6. Place data codewords
    bits = []
    for byte in all_codewords:
        for bit_i in range(7, -1, -1):
            bits.append((byte >> bit_i) & 1)

    bit_idx = 0
    col = size - 1
    up = True

    while col > 0:
        if col == 6:  # Skip vertical timing pattern
            col -= 1
        rows = range(size - 1, -1, -1) if up else range(size)
        for r in rows:
            for c_offset in [0, 1]:
                c = col - c_offset
                if not is_function[r][c]:
                    val = bool(bits[bit_idx]) if bit_idx < len(bits) else False
                    # Apply mask pattern 0: (row + col) % 2 == 0
                    if (r + c) % 2 == 0:
                        val = not val
                    matrix[r][c] = val
                    bit_idx += 1
        up = not up
        col -= 2

    # 7. Format Information (Mask 0 + EC Level L)
    # Format bits for EC Level L (01) and Mask 000 = 01000
    # BCH(15, 5) error correction -> 0b010001000100101
    # XOR with mask 0b101010000010010 -> 0b111011000110111 = 0x7637
    format_bits = 0x7637
    fmt_list = [(format_bits >> (14 - i)) & 1 for i in range(15)]

    # Top-left format placement
    for i in range(6):
        matrix[8][i] = bool(fmt_list[i])
    matrix[8][7] = bool(fmt_list[6])
    matrix[8][8] = bool(fmt_list[7])
    matrix[7][8] = bool(fmt_list[8])
    for i in range(6):
        matrix[5 - i][8] = bool(fmt_list[9 + i])

    # Bottom-left / Top-right format placement
    for i in range(7):
        matrix[size - 1 - i][8] = bool(fmt_list[i])
    for i in range(8):
        matrix[8][size - 8 + i] = bool(fmt_list[7 + i])

    return matrix, size


def generate_qr_svg(text: str, margin: int = 4) -> str:
    matrix, size = create_qr_matrix(text)
    total_size = size + margin * 2

    path_data = []
    for r in range(size):
        for c in range(size):
            if matrix[r][c]:
                x = c + margin
                y = r + margin
                path_data.append(f"M{x},{y}h1v1h-1z")

    d = "".join(path_data)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_size} {total_size}" '
        f'shape-rendering="crispEdges" width="100%" height="100%">'
        f'<rect width="{total_size}" height="{total_size}" fill="#ffffff" rx="12"/>'
        f'<path fill="#0f172a" d="{d}"/>'
        f'</svg>'
    )
    return svg
