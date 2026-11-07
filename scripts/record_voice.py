"""
Records the natural read-aloud voice with Kokoro (open-source, Apache-2.0).

    python scripts/record_voice.py --sentences voice/sentences.json --out public/voice [--shard 0 --shards 8] [--limit 10]

Only sentences without an existing recording are recorded. Voice settings live in voice/config.json.
Model files: https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
"""
import argparse
import json
import os
import sys
import time

import lameenc
import numpy as np
from kokoro_onnx import Kokoro


def trim(audio: np.ndarray, sr: int, thresh: float = 0.01, pad: float = 0.05) -> np.ndarray:
    loud = np.where(np.abs(audio) > thresh)[0]
    if len(loud) == 0:
        return audio
    a = max(0, loud[0] - int(sr * pad))
    b = min(len(audio), loud[-1] + int(sr * pad))
    return audio[a:b]


def to_mp3(audio: np.ndarray, sr: int) -> bytes:
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(pcm.tobytes()) + enc.flush()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sentences", default="voice/sentences.json")
    ap.add_argument("--config", default="voice/config.json")
    ap.add_argument("--out", default="public/voice")
    ap.add_argument("--existing", default="public/voice", help="folder of recordings that already exist")
    ap.add_argument("--model", default="kokoro-v1.0.int8.onnx")
    ap.add_argument("--voices", default="voices-v1.0.bin")
    ap.add_argument("--shard", type=int, default=0)
    ap.add_argument("--shards", type=int, default=1)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    cfg = json.load(open(args.config))
    sentences = json.load(open(args.sentences))
    have = set()
    if os.path.isdir(args.existing):
        have = {f[:-4] for f in os.listdir(args.existing) if f.endswith(".mp3")}
    todo = [s for i, s in enumerate(sentences) if i % args.shards == args.shard and s["id"] not in have]
    if args.limit:
        todo = todo[: args.limit]
    print(f"shard {args.shard}/{args.shards}: {len(todo)} to record ({cfg['voice']})", flush=True)
    if not todo:
        return

    os.makedirs(args.out, exist_ok=True)
    k = Kokoro(args.model, args.voices)
    t0 = time.time()
    for n, s in enumerate(todo, 1):
        audio, sr = k.create(s["text"], voice=cfg["voice"], speed=cfg.get("speed", 0.95), lang=cfg.get("lang", "en-us"))
        with open(os.path.join(args.out, s["id"] + ".mp3"), "wb") as f:
            f.write(to_mp3(trim(audio, sr), sr))
        if n % 20 == 0 or n == len(todo):
            print(f"  {n}/{len(todo)}  ({time.time() - t0:.0f}s)", flush=True)


if __name__ == "__main__":
    sys.exit(main())
