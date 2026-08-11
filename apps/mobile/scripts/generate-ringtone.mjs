// Generates the two ringtone assets: a short loop the app plays itself while
// it is in the foreground, and a long one-shot Android plays from the
// notification channel while the app is backgrounded (channel sounds are not
// looped by the OS, so the file itself has to carry the whole ring).
// Replace either with a branded recording whenever one exists; nothing in the
// app depends on this script at runtime.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Standard ringback pair; the beat between them gives the familiar warble.
const TONE_HZ = [440, 480];
// One ring cycle: two bursts, then silence before the pattern repeats.
const RING_PERIOD_S = 4;
const BURSTS = [
  [0.0, 0.4],
  [0.6, 1.0],
];
// Fade applied to each burst edge so looping never clicks.
const EDGE_FADE_S = 0.015;

function envelopeAt(second) {
  const inCycle = second % RING_PERIOD_S;
  for (const [start, end] of BURSTS) {
    if (inCycle < start || inCycle >= end) continue;
    const intoBurst = inCycle - start;
    const toEnd = end - inCycle;
    const fade = Math.min(intoBurst, toEnd) / EDGE_FADE_S;
    return Math.min(1, Math.max(0, fade));
  }
  return 0;
}

function renderSamples(sampleRate, durationS) {
  const total = Math.floor(sampleRate * durationS);
  const samples = new Int16Array(total);

  for (let i = 0; i < total; i += 1) {
    const second = i / sampleRate;
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

function toWav(samples, sampleRate) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }

  return buffer;
}

const soundsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "sounds",
);

const OUTPUTS = [
  // Played on a loop by the app, so one cycle is enough.
  { file: "incoming-call.wav", sampleRate: 22050, durationS: RING_PERIOD_S },
  // Copied into res/raw and used as the notification channel sound. The name
  // has to be a valid Android resource name, so underscores only. 16 kHz keeps
  // the APK cost down; the tones are well under the Nyquist limit.
  {
    file: "incoming_call_ring.wav",
    sampleRate: 16000,
    durationS: RING_PERIOD_S * 8,
  },
];

fs.mkdirSync(soundsDir, { recursive: true });
for (const { file, sampleRate, durationS } of OUTPUTS) {
  const outputPath = path.join(soundsDir, file);
  const samples = renderSamples(sampleRate, durationS);
  fs.writeFileSync(outputPath, toWav(samples, sampleRate));
  console.log(`Wrote ${outputPath} (${durationS}s @ ${sampleRate} Hz)`);
}
