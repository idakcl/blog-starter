export type ZipEntryInput = {
  path: string;
  data: string | Uint8Array | ArrayBuffer;
};

type ZipEntry = {
  path: string;
  data: Uint8Array;
  crc32: number;
  localHeaderOffset: number;
};

const encoder = new TextEncoder();

let crcTable: Uint32Array | undefined;

export function createZip(entries: ZipEntryInput[], modifiedAt = new Date()) {
  const normalizedEntries: ZipEntry[] = entries.map((entry) => {
    const data = toBytes(entry.data);

    return {
      path: normalizeZipPath(entry.path),
      data,
      crc32: crc32(data),
      localHeaderOffset: 0,
    };
  });

  const fileParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of normalizedEntries) {
    entry.localHeaderOffset = offset;
    const localHeader = createLocalFileHeader(entry, modifiedAt);
    fileParts.push(localHeader, entry.data);
    offset += localHeader.byteLength + entry.data.byteLength;
  }

  const centralDirectoryOffset = offset;
  const centralDirectoryParts = normalizedEntries.map((entry) =>
    createCentralDirectoryHeader(entry, modifiedAt),
  );
  const centralDirectorySize = centralDirectoryParts.reduce(
    (size, part) => size + part.byteLength,
    0,
  );
  const endRecord = createEndOfCentralDirectoryRecord(
    normalizedEntries.length,
    centralDirectorySize,
    centralDirectoryOffset,
  );

  return concatBytes([...fileParts, ...centralDirectoryParts, endRecord]);
}

function createLocalFileHeader(entry: ZipEntry, modifiedAt: Date) {
  const name = encoder.encode(entry.path);
  const header = new Uint8Array(30 + name.byteLength);
  const view = new DataView(header.buffer);
  const { dosDate, dosTime } = toDosDateTime(modifiedAt);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, dosTime, true);
  view.setUint16(12, dosDate, true);
  view.setUint32(14, entry.crc32, true);
  view.setUint32(18, entry.data.byteLength, true);
  view.setUint32(22, entry.data.byteLength, true);
  view.setUint16(26, name.byteLength, true);
  view.setUint16(28, 0, true);
  header.set(name, 30);

  return header;
}

function createCentralDirectoryHeader(entry: ZipEntry, modifiedAt: Date) {
  const name = encoder.encode(entry.path);
  const header = new Uint8Array(46 + name.byteLength);
  const view = new DataView(header.buffer);
  const { dosDate, dosTime } = toDosDateTime(modifiedAt);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, dosTime, true);
  view.setUint16(14, dosDate, true);
  view.setUint32(16, entry.crc32, true);
  view.setUint32(20, entry.data.byteLength, true);
  view.setUint32(24, entry.data.byteLength, true);
  view.setUint16(28, name.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, entry.localHeaderOffset, true);
  header.set(name, 46);

  return header;
}

function createEndOfCentralDirectoryRecord(
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return record;
}

function toBytes(data: string | Uint8Array | ArrayBuffer) {
  if (typeof data === "string") {
    return encoder.encode(data);
  }

  if (data instanceof Uint8Array) {
    return data;
  }

  return new Uint8Array(data);
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.byteLength, 0);
  const output = new Uint8Array(size);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }

  return output;
}

function normalizeZipPath(path: string) {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim().replace(/[^\w!#$%&'()+,;=@[\]^`{}~.-]+/g, "-"))
    .filter(Boolean)
    .join("/");
}

function toDosDateTime(date: Date) {
  const year = Math.max(1980, date.getUTCFullYear());
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = Math.floor(date.getUTCSeconds() / 2);

  return {
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
    dosTime: (hours << 11) | (minutes << 5) | seconds,
  };
}

function crc32(data: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }

  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  crcTable = table;
  return table;
}
