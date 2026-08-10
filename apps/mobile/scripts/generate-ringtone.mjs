// Generates assets/sounds/incoming-call.wav: a classic double-ring that loops
// cleanly. Replace the asset with a branded recording whenever one exists;
// nothing in the app depends on this script at runtime.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 22050;
const DURATION_S = 4;
// Standard ringback pair; the beat between them gives the familiar warble.
const TONE_HZ = [440, 480];
// Ring bursts within the loop, in seconds.
const BURSTS = [
  [0.0, 0.4],
  [0.6, 1.0],
];
// Fade applied to each burst edge so looping never clicks.
const EDGE_FADE_S = 0.015;

function envelopeAt(second) {
  for (const [start, end] of BURSTS) {
    if (second < start || second >= end) continue;
    const intoBurst = second - start;
    const toEnd = end - second;
    const fade = Math.min(intoBurst, toEnd) / EDGE_FADE_S;
    return Math.min(1, Math.max(0, fade));
  }
  return 0;
}

function renderSamples() {
  const total = Math.floor(SAMPLE_RATE * DURATION_S);
  const samples = new Int16Array(total);

  for (let i = 0; i < total; i += 1) {
    const second = i / SAMPLE_RATE;
    const gain = envelopeAt(second);
    if (gain === 0) continue;

    const blended =
      TONE_HZ.reduce(
        (sum, hz) => sum + Math.sin(2 * Math.PI * hz * second),
        0,
      ) / TONE_HZ.length;

    samples[i] = Math.round(blended * gain * 0.6 * 32767);
  }

  return samples;
}

function toWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }

  return buffer;
}

const outputPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "sounds",
  "incoming-call.wav",
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, toWav(renderSamples()));
console.log(`Wrote ${outputPath}`);
