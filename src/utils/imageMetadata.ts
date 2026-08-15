import LZString from 'lz-string';

const METADATA_KEYWORD = 'YADA_DIAGRAM';
const SVG_METADATA_ID = 'yada-scene-data';

// ── CRC32 Table & Computation for PNG Chunks ─────────────────────────────────
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function calculateCrc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── PNG Metadata Injection & Extraction ──────────────────────────────────────

/**
 * Creates a PNG `tEXt` chunk from a keyword and text payload.
 */
function createTextChunk(keyword: string, text: string): Uint8Array {
  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode(keyword);
  const textBytes = encoder.encode(text);

  // Chunk Data: Keyword + null separator (0x00) + Text
  const dataLength = keywordBytes.length + 1 + textBytes.length;
  const chunkData = new Uint8Array(dataLength);
  chunkData.set(keywordBytes, 0);
  chunkData[keywordBytes.length] = 0; // null separator
  chunkData.set(textBytes, keywordBytes.length + 1);

  // Chunk Type: 'tEXt' (0x74, 0x45, 0x58, 0x74)
  const typeBytes = new Uint8Array([0x74, 0x45, 0x58, 0x74]);

  // CRC calculated over Type + Data
  const crcInput = new Uint8Array(4 + dataLength);
  crcInput.set(typeBytes, 0);
  crcInput.set(chunkData, 4);
  const crc = calculateCrc32(crcInput);

  // Full Chunk: 4 bytes length + 4 bytes type + data + 4 bytes crc
  const fullChunk = new Uint8Array(4 + 4 + dataLength + 4);
  const view = new DataView(fullChunk.buffer);

  view.setUint32(0, dataLength, false); // Big-endian
  fullChunk.set(typeBytes, 4);
  fullChunk.set(chunkData, 8);
  view.setUint32(8 + dataLength, crc, false); // Big-endian

  return fullChunk;
}

/**
 * Injects project JSON metadata into a PNG buffer or Data URL.
 */
export function injectPngMetadata(pngBuffer: ArrayBuffer, projectData: unknown): Uint8Array {
  const jsonStr = JSON.stringify(projectData);
  const compressed = LZString.compressToBase64(jsonStr);
  const textChunk = createTextChunk(METADATA_KEYWORD, compressed);

  const src = new Uint8Array(pngBuffer);

  // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    src[0] !== 0x89 ||
    src[1] !== 0x50 ||
    src[2] !== 0x4e ||
    src[3] !== 0x47 ||
    src[4] !== 0x0d ||
    src[5] !== 0x0a ||
    src[6] !== 0x1a ||
    src[7] !== 0x0a
  ) {
    throw new Error('Invalid PNG signature.');
  }

  // Find the end of the IHDR chunk (typically offset 8 + 4(len) + 4(type) + 13(IHDR data) + 4(crc) = 33)
  const ihdrLenView = new DataView(pngBuffer, 8, 4);
  const ihdrDataLen = ihdrLenView.getUint32(0, false);
  const ihdrEndOffset = 8 + 4 + 4 + ihdrDataLen + 4;

  // Insert our tEXt chunk immediately after IHDR
  const output = new Uint8Array(src.length + textChunk.length);
  output.set(src.subarray(0, ihdrEndOffset), 0);
  output.set(textChunk, ihdrEndOffset);
  output.set(src.subarray(ihdrEndOffset), ihdrEndOffset + textChunk.length);

  return output;
}

/**
 * Injects project JSON metadata into a PNG base64 Data URL and returns the updated Data URL.
 */
export function injectPngDataUrlMetadata(pngDataUrl: string, projectData: unknown): string {
  const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const enriched = injectPngMetadata(bytes.buffer, projectData);

  let binary = '';
  const len = enriched.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(enriched[i]);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

/**
 * Extracts and decodes project JSON metadata from a PNG ArrayBuffer.
 */
export function extractPngMetadata(pngBuffer: ArrayBuffer): unknown | null {
  const bytes = new Uint8Array(pngBuffer);
  const view = new DataView(pngBuffer);

  // Check PNG signature
  if (
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return null;
  }

  let offset = 8;
  const decoder = new TextDecoder();

  while (offset < bytes.length - 8) {
    const chunkLen = view.getUint32(offset, false);
    const chunkType = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );

    if (chunkType === 'tEXt') {
      const dataBytes = bytes.subarray(offset + 8, offset + 8 + chunkLen);
      // Find null separator
      let nullIndex = -1;
      for (let i = 0; i < dataBytes.length; i++) {
        if (dataBytes[i] === 0) {
          nullIndex = i;
          break;
        }
      }

      if (nullIndex !== -1) {
        const keyword = decoder.decode(dataBytes.subarray(0, nullIndex));
        if (keyword === METADATA_KEYWORD) {
          const text = decoder.decode(dataBytes.subarray(nullIndex + 1));
          try {
            // Try decompressing LZ-string first
            const decompressed = LZString.decompressFromBase64(text);
            if (decompressed) {
              return JSON.parse(decompressed);
            }
            return JSON.parse(text);
          } catch (err) {
            console.warn('Failed to parse PNG metadata text payload:', err);
          }
        }
      }
    }

    // Advance to next chunk: 4 len + 4 type + dataLen + 4 crc
    offset += 8 + chunkLen + 4;
  }

  return null;
}

// ── SVG Metadata Injection & Extraction ──────────────────────────────────────

/**
 * Injects project JSON metadata into an SVG XML string.
 */
export function injectSvgMetadata(svgString: string, projectData: unknown): string {
  const jsonStr = JSON.stringify(projectData);
  const compressed = LZString.compressToBase64(jsonStr);

  const metadataTag = `\n  <metadata id="${SVG_METADATA_ID}">\n    <![CDATA[${compressed}]]>\n  </metadata>\n`;

  // Insert before closing </svg>
  if (svgString.includes('</svg>')) {
    return svgString.replace('</svg>', `${metadataTag}</svg>`);
  }
  return svgString + metadataTag;
}

export function extractSvgMetadata(svgString: string): unknown | null {
  const regex = new RegExp(`<metadata[^>]*id=["']${SVG_METADATA_ID}["'][^>]*>([\\s\\S]*?)<\\/metadata>`, 'i');
  const match = svgString.match(regex);
  if (match && match[1]) {
    let raw = match[1].trim();
    if (raw.startsWith('<![CDATA[') && raw.endsWith(']]>')) {
      raw = raw.slice(9, -3).trim();
    }
    try {
      const decompressed = LZString.decompressFromBase64(raw);
      if (decompressed) {
        return JSON.parse(decompressed);
      }
      return JSON.parse(raw);
    } catch (err) {
      console.warn('Failed to parse SVG metadata payload:', err);
    }
  }
  return null;
}
