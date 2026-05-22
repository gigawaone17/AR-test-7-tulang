const QR_LEVEL_L = 1;
const QR_MASK = 0;
const QR_FORMAT_MASK = 0x5412;

const QR_VERSIONS = [
  { version: 1, size: 21, data: 19, ecc: 7, align: [] },
  { version: 2, size: 25, data: 34, ecc: 10, align: [6, 18] },
  { version: 3, size: 29, data: 55, ecc: 15, align: [6, 22] },
  { version: 4, size: 33, data: 80, ecc: 20, align: [6, 26] },
  { version: 5, size: 37, data: 108, ecc: 26, align: [6, 30] }
];

function drawQrCode(canvas, text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const spec = QR_VERSIONS.find((candidate) => bytes.length <= maxByteLength(candidate.data));

  if (!spec) {
    throw new Error('QR URL is too long for the bundled generator.');
  }

  const modules = makeQrModules(spec, bytes);
  const context = canvas.getContext('2d');
  const quiet = 4;
  const moduleCount = spec.size + quiet * 2;
  const cell = Math.floor(canvas.width / moduleCount);
  const offset = Math.floor((canvas.width - cell * moduleCount) / 2);

  context.fillStyle = '#f8f6f1';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#101515';

  for (let y = 0; y < spec.size; y += 1) {
    for (let x = 0; x < spec.size; x += 1) {
      if (modules[y][x]) {
        context.fillRect(offset + (x + quiet) * cell, offset + (y + quiet) * cell, cell, cell);
      }
    }
  }
}

function maxByteLength(dataCodewords) {
  return Math.floor((dataCodewords * 8 - 4 - 8) / 8);
}

function makeQrModules(spec, bytes) {
  const modules = makeMatrix(spec.size, null);
  const reserved = makeMatrix(spec.size, false);

  addFinders(modules, reserved, spec.size);
  addTimings(modules, reserved, spec.size);
  addAlignments(modules, reserved, spec);
  reserveFormatAreas(reserved, spec.size);
  setReserved(modules, reserved, 8, spec.size - 8, true);

  const data = makeDataCodewords(spec, bytes);
  const ecc = makeErrorCorrection(data, spec.ecc);
  drawData(modules, reserved, [...data, ...ecc], spec.size);
  drawFormatBits(modules, reserved, spec.size);

  return modules;
}

function makeMatrix(size, value) {
  return Array.from({ length: size }, () => Array(size).fill(value));
}

function setReserved(modules, reserved, x, y, value) {
  if (x < 0 || y < 0 || y >= modules.length || x >= modules.length) return;
  modules[y][x] = value;
  reserved[y][x] = true;
}

function addFinders(modules, reserved, size) {
  [
    [0, 0],
    [size - 7, 0],
    [0, size - 7]
  ].forEach(([left, top]) => {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const xx = left + x;
        const yy = top + y;
        if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;

        const dark = (x >= 0 && x <= 6 && (y === 0 || y === 6))
          || (y >= 0 && y <= 6 && (x === 0 || x === 6))
          || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
        setReserved(modules, reserved, xx, yy, dark);
      }
    }
  });
}

function addTimings(modules, reserved, size) {
  for (let i = 8; i < size - 8; i += 1) {
    setReserved(modules, reserved, i, 6, i % 2 === 0);
    setReserved(modules, reserved, 6, i, i % 2 === 0);
  }
}

function addAlignments(modules, reserved, spec) {
  spec.align.forEach((x) => {
    spec.align.forEach((y) => {
      const nearFinder = (x === 6 && y === 6)
        || (x === 6 && y === spec.size - 7)
        || (x === spec.size - 7 && y === 6);
      if (nearFinder) return;

      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const dark = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
          setReserved(modules, reserved, x + dx, y + dy, dark);
        }
      }
    });
  });
}

function reserveFormatAreas(reserved, size) {
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }

  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
}

function makeDataCodewords(spec, bytes) {
  const bits = [];
  appendBits(bits, 0x4, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const capacity = spec.data * 8;
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
  }

  for (let pad = 0xec; codewords.length < spec.data; pad = pad === 0xec ? 0x11 : 0xec) {
    codewords.push(pad);
  }

  return codewords;
}

function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function makeErrorCorrection(data, degree) {
  const generator = makeGenerator(degree);
  const result = Array(degree).fill(0);

  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);
    generator.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  });

  return result;
}

function makeGenerator(degree) {
  let result = [1];

  for (let i = 0; i < degree; i += 1) {
    result = multiplyPoly(result, [1, gfPow(2, i)]);
  }

  return result.slice(1);
}

function multiplyPoly(left, right) {
  const result = Array(left.length + right.length - 1).fill(0);

  left.forEach((leftValue, leftIndex) => {
    right.forEach((rightValue, rightIndex) => {
      result[leftIndex + rightIndex] ^= gfMultiply(leftValue, rightValue);
    });
  });

  return result;
}

function gfPow(value, power) {
  let result = 1;
  for (let i = 0; i < power; i += 1) result = gfMultiply(result, value);
  return result;
}

function gfMultiply(left, right) {
  let result = 0;

  for (let i = 0; i < 8; i += 1) {
    if ((right & 1) !== 0) result ^= left;
    const carry = (left & 0x80) !== 0;
    left = (left << 1) & 0xff;
    if (carry) left ^= 0x1d;
    right >>>= 1;
  }

  return result;
}

function drawData(modules, reserved, codewords, size) {
  const bits = [];
  codewords.forEach((codeword) => appendBits(bits, codeword, 8));

  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;

    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;

      for (let offset = 0; offset < 2; offset += 1) {
        const x = right - offset;
        if (reserved[y][x]) continue;

        const bit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        modules[y][x] = shouldMask(x, y) ? !bit : bit;
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function shouldMask(x, y) {
  return (x + y) % 2 === QR_MASK;
}

function drawFormatBits(modules, reserved, size) {
  const bits = makeFormatBits();

  for (let i = 0; i <= 5; i += 1) setReserved(modules, reserved, 8, i, getBit(bits, i));
  setReserved(modules, reserved, 8, 7, getBit(bits, 6));
  setReserved(modules, reserved, 8, 8, getBit(bits, 7));
  setReserved(modules, reserved, 7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i += 1) setReserved(modules, reserved, 14 - i, 8, getBit(bits, i));

  for (let i = 0; i < 8; i += 1) setReserved(modules, reserved, size - 1 - i, 8, getBit(bits, i));
  for (let i = 8; i < 15; i += 1) setReserved(modules, reserved, 8, size - 15 + i, getBit(bits, i));
  setReserved(modules, reserved, 8, size - 8, true);
}

function makeFormatBits() {
  const data = (QR_LEVEL_L << 3) | QR_MASK;
  let remainder = data << 10;

  for (let i = 14; i >= 10; i -= 1) {
    if (((remainder >>> i) & 1) !== 0) {
      remainder ^= 0x537 << (i - 10);
    }
  }

  return ((data << 10) | remainder) ^ QR_FORMAT_MASK;
}

function getBit(value, index) {
  return ((value >>> index) & 1) !== 0;
}
