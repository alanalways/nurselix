/**
 * Wraps raw 16-bit PCM little-endian mono audio in a minimal WAV header.
 * Gemini TTS returns 24 kHz mono 16-bit PCM bytes; browsers can play
 * the result once it has the standard 44-byte RIFF/WAVE header.
 */
export function pcmToWav(pcm: Buffer, sampleRate = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);              // PCM chunk size
  header.writeUInt16LE(1, 20);               // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

/** Estimate seconds of audio from PCM byte length. */
export function estimateDurationSec(pcmBytes: number, sampleRate = 24000): number {
  // 16-bit mono → 2 bytes per sample
  return pcmBytes / 2 / sampleRate;
}
