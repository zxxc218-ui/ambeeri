// Helper utility for Web Bluetooth Thermal Printer (ESC/POS) with basic Arabic shaping and CP1256 encoding

// Simple CP1256 Arabic character mapping and shaping (isolated/connected forms)
const ARABIC_GLYPHS: { [key: string]: { isolated: number, initial: number, medial: number, final: number } } = {
  'ا': { isolated: 0xC7, initial: 0xC7, medial: 0xC7, final: 0xC7 },
  'أ': { isolated: 0xC3, initial: 0xC3, medial: 0xC3, final: 0xC3 },
  'إ': { isolated: 0xC5, initial: 0xC5, medial: 0xC5, final: 0xC5 },
  'آ': { isolated: 0xC2, initial: 0xC2, medial: 0xC2, final: 0xC2 },
  'ب': { isolated: 0xC8, initial: 0x86, medial: 0x86, final: 0xC8 },
  'ت': { isolated: 0xCA, initial: 0x8E, medial: 0x8E, final: 0xCA },
  'ث': { isolated: 0xCB, initial: 0x8F, medial: 0x8F, final: 0xCB },
  'ج': { isolated: 0xCC, initial: 0x90, medial: 0x90, final: 0xCC },
  'ح': { isolated: 0xCD, initial: 0x91, medial: 0x91, final: 0xCD },
  'خ': { isolated: 0xCE, initial: 0x92, medial: 0x92, final: 0xCE },
  'د': { isolated: 0xCF, initial: 0xCF, medial: 0xCF, final: 0xCF },
  'ذ': { isolated: 0xD0, initial: 0xD0, medial: 0xD0, final: 0xD0 },
  'ر': { isolated: 0xD1, initial: 0xD1, medial: 0xD1, final: 0xD1 },
  'ز': { isolated: 0xD2, initial: 0xD2, medial: 0xD2, final: 0xD2 },
  'س': { isolated: 0xD3, initial: 0x93, medial: 0x93, final: 0xD3 },
  'ش': { isolated: 0xD4, initial: 0x94, medial: 0x94, final: 0xD4 },
  'ص': { isolated: 0xD5, initial: 0x95, medial: 0x95, final: 0xD5 },
  'ض': { isolated: 0xD6, initial: 0x96, medial: 0x96, final: 0xD6 },
  'ط': { isolated: 0xD7, initial: 0x97, medial: 0x97, final: 0xD7 },
  'ظ': { isolated: 0xD8, initial: 0x98, medial: 0x98, final: 0xD8 },
  'ع': { isolated: 0xD9, initial: 0x99, medial: 0x9A, final: 0x9B },
  'غ': { isolated: 0xDA, initial: 0x9C, medial: 0x9D, final: 0x9E },
  'ف': { isolated: 0xDD, initial: 0xA1, medial: 0xA1, final: 0xDD },
  'ق': { isolated: 0xDE, initial: 0xA2, medial: 0xA2, final: 0xDE },
  'ك': { isolated: 0xDF, initial: 0xA3, medial: 0xA3, final: 0xDF },
  'ل': { isolated: 0xE0, initial: 0xA4, medial: 0xA4, final: 0xE0 },
  'م': { isolated: 0xE1, initial: 0xA5, medial: 0xA5, final: 0xE1 },
  'ن': { isolated: 0xE2, initial: 0xA6, medial: 0xA6, final: 0xE2 },
  'ه': { isolated: 0xE4, initial: 0xA7, medial: 0xA7, final: 0xE4 },
  'و': { isolated: 0xE5, initial: 0xE5, medial: 0xE5, final: 0xE5 },
  'ي': { isolated: 0xEA, initial: 0xAD, medial: 0xAD, final: 0xEA },
  'ى': { isolated: 0xE9, initial: 0xE9, medial: 0xE9, final: 0xE9 },
  'ة': { isolated: 0xC9, initial: 0xC9, medial: 0xC9, final: 0xC9 },
  'ء': { isolated: 0xC1, initial: 0xC1, medial: 0xC1, final: 0xC1 },
  'ئ': { isolated: 0xC6, initial: 0x8C, medial: 0x8C, final: 0xC6 },
  'ؤ': { isolated: 0xC4, initial: 0xC4, medial: 0xC4, final: 0xC4 },
  'لا': { isolated: 0xFB, initial: 0xFB, medial: 0xFB, final: 0xFB }
};

// Check if character can connect to the left
function connectsLeft(char: string): boolean {
  return ['ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'ي', 'ئ'].includes(char);
}

// Check if character can connect to the right
function connectsRight(char: string): boolean {
  return ['ا', 'أ', 'إ', 'آ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ة', 'ى', 'ئ', 'ؤ'].includes(char);
}

// Shapes Arabic text and encodes it to CP1256 bytes (reversed for RTL layout)
export function encodeArabic(text: string): Uint8Array {
  const bytes: number[] = [];
  
  // Basic character shaping
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prev = i > 0 ? text[i - 1] : '';
    const next = i < text.length - 1 ? text[i + 1] : '';
    
    // Check if it's a special Lam-Alef ligature
    if (char === 'ل' && (next === 'ا' || next === 'أ' || next === 'إ' || next === 'آ')) {
      // We will output 'لا' ligature later and skip 'ا'
      const connPrev = prev && connectsLeft(prev);
      // Lam-Alef doesn't connect medial/initial on CP1256 easily, treat as isolated/final
      const code = connPrev ? 0xFC : 0xFB;
      bytes.push(code);
      i++; // skip ALEF
      continue;
    }

    const glyph = ARABIC_GLYPHS[char];
    if (glyph) {
      const connPrev = prev && connectsLeft(prev);
      const connNext = next && connectsRight(next);
      
      let code = glyph.isolated;
      if (connPrev && connNext) {
        code = glyph.medial;
      } else if (connPrev) {
        code = glyph.final;
      } else if (connNext) {
        code = glyph.initial;
      }
      bytes.push(code);
    } else {
      // Standard ASCII or number
      bytes.push(char.charCodeAt(0));
    }
  }

  // Reverse Arabic words for RTL printing on ESC/POS printers
  // Split words by space, reverse characters in Arabic words, but keep numbers and English LTR
  const words = text.split(' ');
  const processedBytes: number[] = [];

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const wordBytes: number[] = [];
    let isArabic = false;

    for (let c = 0; c < word.length; c++) {
      const char = word[c];
      if (ARABIC_GLYPHS[char]) {
        isArabic = true;
      }
      
      // Look up code or ASCII code
      const glyph = ARABIC_GLYPHS[char];
      if (glyph) {
        // We already shaped it, but we need to re-fetch the code in standard CP1256 sequence
        // Actually, let's just encode it here
        const prev = c > 0 ? word[c - 1] : '';
        const next = c < word.length - 1 ? word[c + 1] : '';
        
        if (char === 'ل' && (next === 'ا' || next === 'أ' || next === 'إ' || next === 'آ')) {
          const code = (prev && connectsLeft(prev)) ? 0xFC : 0xFB;
          wordBytes.push(code);
          c++;
          continue;
        }
        
        const connPrev = prev && connectsLeft(prev);
        const connNext = next && connectsRight(next);
        let code = glyph.isolated;
        if (connPrev && connNext) code = glyph.medial;
        else if (connPrev) code = glyph.final;
        else if (connNext) code = glyph.initial;
        
        wordBytes.push(code);
      } else {
        wordBytes.push(char.charCodeAt(0));
      }
    }

    if (isArabic) {
      wordBytes.reverse();
    }
    
    if (w > 0) {
      processedBytes.push(32); // space
    }
    processedBytes.push(...wordBytes);
  }

  // Reverse the entire line for RTL printer alignment if the printer is LTR-only
  // Wait! Standard printer prints left-to-right, so we reverse the entire line of bytes
  // to ensure right alignment!
  processedBytes.reverse();

  return new Uint8Array(processedBytes);
}

// Connect to Bluetooth thermal printer and print receipt directly as a bitmap
export async function connectToDevice(deviceId?: string | null): Promise<any> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error('الطباعة المباشرة من المتصفح غير مدعومة لهذه الطابعة. استخدم تطبيق الطابعة أو نسخة APK.');
  }

  let device: any = null;
  if (deviceId) {
    try {
      const devices = await nav.bluetooth.getDevices();
      device = devices.find((d: any) => d.id === deviceId);
    } catch (e) {
      console.warn('getDevices failed or not supported:', e);
    }
  }

  if (!device) {
    device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000e911-0000-1000-8000-00805f9b34fb']
    });
  }

  return device;
}

export async function printImageToDevice(device: any, canvas: HTMLCanvasElement): Promise<{ success: boolean, error?: string }> {
  try {
    console.log('Connecting to GATT server...');
    const server = await device.gatt.connect();

    console.log('Getting primary services...');
    const services = await server.getPrimaryServices();
    let writeChar: any = null;

    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      return { success: false, error: 'Could not find a write characteristic on the printer.' };
    }

    console.log('Generating ESC/POS raster image...');
    const H = canvas.height;
    const W = canvas.width; // should be 576
    const widthBytes = Math.floor((W + 7) / 8); // 72 bytes for 576px

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false, error: 'Could not get 2d context from canvas.' };
    }
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    // Pack bits into bytes
    const rasterData = new Uint8Array(widthBytes * H);
    let byteIdx = 0;

    for (let y = 0; y < H; y++) {
      for (let xByte = 0; xByte < widthBytes; xByte++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = xByte * 8 + bit;
          if (x < W) {
            const idx = (y * W + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            let isBlack = false;
            if (a >= 128) {
              const grey = 0.299 * r + 0.587 * g + 0.114 * b;
              isBlack = grey < 128; // black threshold
            }

            if (isBlack) {
              byteVal |= (1 << (7 - bit));
            }
          }
        }
        rasterData[byteIdx++] = byteVal;
      }
    }

    // ESC/POS commands
    const ESC = 0x1B;
    const GS = 0x1D;

    const INIT = new Uint8Array([ESC, 0x40]); // ESC @ (Init)
    // GS v 0 m xL xH yL yH
    const GS_v_0 = new Uint8Array([
      GS, 0x76, 0x30, 0,
      widthBytes % 256, Math.floor(widthBytes / 256),
      H % 256, Math.floor(H / 256)
    ]);
    const LF = new Uint8Array([10]);
    const FEED_AND_CUT = new Uint8Array([GS, 0x56, 0x42, 0x00]); // GS V 66 0

    // Send logic
    const sendBuffer = async (bytes: Uint8Array) => {
      const chunkSize = 100;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        if (writeChar.properties.writeWithoutResponse) {
          await writeChar.writeValueWithoutResponse(chunk);
        } else {
          await writeChar.writeValue(chunk);
        }
        await new Promise(resolve => setTimeout(resolve, 10)); // short delay to prevent BLE congestion
      }
    };

    console.log('Sending print buffer...');
    await sendBuffer(INIT);
    await sendBuffer(GS_v_0);
    await sendBuffer(rasterData);
    await sendBuffer(LF);
    await sendBuffer(new Uint8Array([10, 10, 10])); // extra spacing
    await sendBuffer(FEED_AND_CUT);

    console.log('Printed image successfully!');
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: err.message || 'Bluetooth connection failed.' };
  }
}

export async function printReceiptDirectBluetooth(
  paymentData: any,
  deviceId: string | null
): Promise<{ success: boolean, device?: any, error?: string }> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    return { success: false, error: 'الطباعة المباشرة من المتصفح غير مدعومة لهذه الطابعة. استخدم تطبيق الطابعة أو نسخة APK.' };
  }

  // 1. Get receipt HTML template
  const element = document.getElementById('receipt-pdf-template');
  if (!element) {
    return { success: false, error: 'حدث خطأ أثناء العثور على قالب الوصل' };
  }

  // 2. Clone it and format for 80mm printer (576px width)
  const width = 576;
  const clone = element.cloneNode(true) as HTMLDivElement;
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.width = width + 'px';
  clone.style.maxWidth = width + 'px';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';
  clone.style.padding = '10px';
  clone.style.margin = '0';
  
  // Make it high contrast black and white
  clone.style.filter = 'grayscale(1) contrast(2)';
  clone.style.color = '#000';
  clone.style.backgroundColor = '#fff';
  
  document.body.appendChild(clone);

  let canvas: HTMLCanvasElement;
  try {
    const html2canvasLib = (await import('html2canvas')).default;
    canvas = await html2canvasLib(clone, {
      width: width,
      scale: 1, // scale 1 for 576px direct bitmap printing
      useCORS: true,
      backgroundColor: '#ffffff'
    });
  } catch (err: any) {
    document.body.removeChild(clone);
    return { success: false, error: 'فشل تحويل الوصل لصورة: ' + err.message };
  }

  document.body.removeChild(clone);

  // 3. Connect to printer
  let device: any;
  try {
    device = await connectToDevice(deviceId);
  } catch (err: any) {
    return { success: false, error: 'الطباعة المباشرة من المتصفح غير مدعومة لهذه الطابعة. استخدم تطبيق الطابعة أو نسخة APK.' };
  }

  if (!device) {
    return { success: false, error: 'لم يتم اختيار طابعة.' };
  }

  // 4. Print bitmap
  const printRes = await printImageToDevice(device, canvas);
  return { success: printRes.success, device, error: printRes.error };
}

