#!/usr/bin/env python3
"""R13 audio build: composes and renders every game sound from code, then encodes OGG Vorbis + AAC (m4a).

Re-run:  python3 -I source/v2/audio/build_audio.py public/assets/audio [--only festival,sfx,...] [--wav /tmp/r13]
Outputs public/assets/audio/{music,amb,sfx,voice}/<name>.{ogg,m4a} and manifest.json.
All music is original (yo / in pentatonic scales, matsuri-bayashi style patterns). Deterministic seed.
Loudness: music -20 LUFS, ambience -30 LUFS (layered under the mix), one-shots peak-normalised to -3 dBFS,
true peak <= -1 dBTP everywhere (ASWG-R001 guidance for PC/handheld sits around -18..-24 LUFS).
"""
import argparse, json, os, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from scipy.io import wavfile
sys.path.insert(0, str(Path(__file__).resolve().parent))
import synth as S
from synth import SR

YO = [0, 2, 5, 7, 9]          # D E G A B (bright festival)
IN = [0, 1, 5, 7, 8]          # D Eb G A Bb (yokai / boss)


def scale(root, steps, octaves=3):
    return [root + 12 * o + s for o in range(octaves) for s in steps]


def humanize(t, amt=.008):
    return t + S.rng.uniform(-amt, amt)


# ---------------------------------------------------------------- music
def festival():
    bpm, bars = 112, 24; beat = 60 / bpm; L = bars * 4 * beat
    buf = np.zeros((int((L + 3) * SR), 2))
    sc = scale(62, YO)        # sc[5] = D5
    A = [(5,1),(5,.5),(6,.5),(7,1),(6,1),(5,.5),(4,.5),(3,1),(4,2),(5,1),(7,.5),(8,.5),(7,1),(6,1),(5,1),(4,1),(5,2)]
    B = [(7,1),(8,1),(9,1.5),(8,.5),(7,1),(6,.5),(5,.5),(6,2),(4,1),(5,1),(6,1),(7,1),(6,.5),(5,.5),(4,1),(3,2)]
    A2 = A[:-3] + [(4,.5),(3,.5),(4,1),(5,2)]
    C = [(8,.5),(9,.5),(10,1),(9,1),(8,1),(7,2),(8,1),(7,1),(6,.5),(7,.5),(8,1),(7,1),(6,1),(5,3),(None,1)]
    B2 = B[:-2] + [(4,1),(5,2)][:1] + [(5,2)]
    form = [A, B, A2, C, A, B2]
    t = 0
    for pi, phrase in enumerate(form):
        start = pi * 16 * beat; t = start
        for deg, d in phrase:
            if deg is not None:
                S.place(buf, S.flute(sc[deg], d * beat * .95, vel=.5 * S.rng.uniform(.9, 1.05)), humanize(t), .55, -.1)
                if phrase in (B, C, B2) and deg - 2 >= 0:          # second flute a scale-third below in B/C
                    S.place(buf, S.flute(sc[deg - 2], d * beat * .95, vel=.32, breath=.05), humanize(t + .012), .4, .25)
            t += d * beat
        # little grace-note flourish into the next phrase
        S.place(buf, S.flute(sc[7], .07, vel=.3, scoop=False), start + 16 * beat - .16, .4, -.1)
    # shamisen ostinato (D / G / A colours by phrase)
    roots = {0: 50, 1: 55, 2: 50, 3: 57, 4: 50, 5: 55}
    for bar in range(bars):
        r = roots[bar // 4]; b0 = bar * 4 * beat
        for off, iv, v in [(0, 0, .8), (1, 7, .5), (1.5, 12, .45), (2, 0, .6), (3, 7, .5), (3.5, 5, .4)]:
            S.place(buf, S.pluck(r + iv, .45 * beat * 2, vel=v, bright=.55), humanize(b0 + off * beat, .005), .32, .2)
    # drums: odaiko don/ka, shime 8ths, kane chan-chiki, chappa at phrase heads
    for bar in range(bars):
        b0 = bar * 4 * beat; end = bar % 4 == 3
        S.place(buf, S.taiko(.95), b0, .55, 0)
        S.place(buf, S.taiko(.6), b0 + 2 * beat, .5, 0)
        for k in (1, 3): S.place(buf, S.rim(.5), humanize(b0 + k * beat), .22, -.3)
        if end:
            for k in (2.5, 3, 3.5): S.place(buf, S.taiko(.8), b0 + k * beat, .5, 0)
        for k in range(8):
            v = [.8, .35, .55, .35, .75, .35, .55, .45][k]
            S.place(buf, S.shime(v), humanize(b0 + k * beat / 2, .006), .2, .35)
            if end and k >= 6: S.place(buf, S.shime(.4), b0 + (k + .5) * beat / 2, .16, .35)
        for k, v in [(0, .6), (.5, .25), (1.5, .45), (2, .55), (2.5, .25), (3.5, .45)]:
            S.place(buf, S.kane(v), humanize(b0 + k * beat, .004), .12, -.45)
        if bar % 4 == 0: S.place(buf, S.chappa(.5), b0, .25, .1)
    buf = S.reverb(buf, wet=.2, rt60=1.4)
    return S.loop_wrap(buf, len(buf) / SR - L), {'bpm': bpm, 'bars': bars, 'loop': True}


def boss():
    bpm, bars = 132, 16; beat = 60 / bpm; L = bars * 4 * beat
    buf = np.zeros((int((L + 3) * SR), 2)); sc = scale(50, IN)        # D3 in-scale
    for bar in range(bars):
        b0 = bar * 4 * beat; r = [50, 50, 51, 48][bar // 4 % 4]
        for k in range(16):                                            # shamisen tremolo ostinato
            iv = [0, 0, 7, 0, 8, 0, 7, 0, 0, 0, 7, 0, 5, 7, 8, 7][k]
            S.place(buf, S.pluck(r + iv, .14, vel=.55 if k % 4 == 0 else .35, bright=.75, buzz=.3), humanize(b0 + k * beat / 4, .004), .3, .15)
        for k in (0, 1.5, 2, 3, 3.5): S.place(buf, S.taiko(.95 if k in (0, 2) else .7, 1.15), b0 + k * beat, .6, 0)
        for k in range(8): S.place(buf, S.shime(.5 if k % 2 else .8), b0 + k * beat / 2, .17, .35)
        S.place(buf, S.kane(.5, f=1180), b0 + 1 * beat, .1, -.4); S.place(buf, S.kane(.5, f=1180), b0 + 3 * beat, .1, -.4)
    stabs = [(0, 13, 2), (2, 12, 1), (3, 11, 1), (4, 13, 2), (6, 14, 1), (7, 13, 1)]   # flute stabs (scale index, beats)
    for rep in range(bars // 8):
        for b, deg, d in stabs:
            S.place(buf, S.flute(sc[deg], d * beat * .8, vel=.5, vib=.02), humanize(rep * 32 * beat + b * 4 * beat), .5, -.15)
    for bar in range(0, bars, 4): S.place(buf, S.bell(38, 3.5, .5), bar * 4 * beat, .35, 0)
    buf = S.reverb(buf, wet=.22, rt60=1.8)
    return S.loop_wrap(buf, len(buf) / SR - L), {'bpm': bpm, 'bars': bars, 'loop': True}


def title():
    bpm, bars = 84, 16; beat = 60 / bpm; L = bars * 4 * beat
    buf = np.zeros((int((L + 4) * SR), 2)); sc = scale(62, YO)
    chords = [[50, 57, 62, 66 - 1], [55, 62, 67, 71], [57, 64, 69, 71], [50, 57, 62, 64]]
    for bar in range(bars):
        ch = chords[bar % 4]; b0 = bar * 4 * beat
        for k, n in enumerate(ch + ch[::-1][1:3]):                    # koto-like arpeggio
            S.place(buf, S.pluck(n + 12, 1.2, vel=.45, bright=.4, decay=.998, buzz=.05), humanize(b0 + k * beat * .66), .28, -.3 + k * .12)
    mel = [(7,2),(6,1),(5,1),(6,3),(None,1),(8,2),(7,1),(6,1),(5,4),(4,2),(5,1),(6,1),(7,3),(None,1),(6,2),(5,1),(3,1),(5,4)]
    for rep in range(2):
        t = rep * 32 * beat
        for deg, d in mel:
            if deg is not None: S.place(buf, S.flute(sc[deg], d * beat * .95, vel=.38, vib=.016), humanize(t), .5, .05)
            t += d * beat
    for bar in range(0, bars, 2): S.place(buf, S.taiko(.35, 1.4), bar * 4 * beat, .35, 0)
    buf = S.reverb(buf, wet=.3, rt60=2.4)
    return S.loop_wrap(buf, len(buf) / SR - L), {'bpm': bpm, 'bars': bars, 'loop': True}


def victory():
    buf = np.zeros((int(5 * SR), 2)); sc = scale(62, YO)
    for k, deg in enumerate([3, 4, 5, 6, 7, 8, 10]): S.place(buf, S.flute(sc[deg], .12, vel=.5, scoop=False), .06 * k * 1.6, .5, -.1)
    S.place(buf, S.flute(sc[10], 1.6, vel=.55, vib=.02), .7, .55, -.1); S.place(buf, S.flute(sc[8], 1.6, vel=.35), .7, .4, .2)
    for k in range(10): S.place(buf, S.shime(.4 + k * .05), k * .06, .2, .3)
    S.place(buf, S.taiko(1), .7, .6); S.place(buf, S.kane(.6), .7, .2, -.4); S.place(buf, S.chappa(.6), .7, .3)
    return S.reverb(buf, wet=.25, rt60=1.8), {'loop': False}


def defeat():
    buf = np.zeros((int(5 * SR), 2)); sc = scale(62, IN)
    for k, deg in enumerate([8, 7, 6, 5]): S.place(buf, S.flute(sc[deg], .5, vel=.42, vib=.025), k * .45, .5)
    S.place(buf, S.taiko(.7, 1.3), 1.8, .5); S.place(buf, S.bell(50, 3, .4), 1.8, .35)
    return S.reverb(buf, wet=.3, rt60=2.2), {'loop': False}


# ---------------------------------------------------------------- ambience (seamless loops)
def amb_crowd(L=24.):
    n = int(L * SR); out = np.zeros((n, 2))
    for k in range(70):                                                    # many murmuring voices
        f0 = S.rng.uniform(110, 260); start = S.rng.uniform(0, L); syl = ' '.join(S.rng.choice(['a', 'e', 'o', 'u', 'i', 'ha'], 6))
        v = S.voice(syl, base=f0, rate=S.rng.uniform(.08, .14), vel=S.rng.uniform(.05, .12))
        v = S.lowpass(v, 1800)
        i = int(start * SR); idx = (np.arange(len(v)) + i) % n; pan = S.rng.uniform(-.8, .8)
        out[idx, 0] += v * np.cos((pan + 1) * np.pi / 4); out[idx, 1] += v * np.sin((pan + 1) * np.pi / 4)
    bed = S.lowpass(S.rng.normal(0, 1, n), 700) * .05
    out += S.stereo(bed)
    return S.reverb(out, wet=.35, rt60=1.2)


def amb_insects(L=20.):
    n = int(L * SR); out = np.zeros((n, 2)); t = np.arange(n) / SR
    for k in range(6):                                                     # bell crickets: "riiin" pulse trains
        f = S.rng.uniform(3900, 4700); rate = S.rng.uniform(18, 26); pan = S.rng.uniform(-1, 1)
        gate = (np.sin(2 * np.pi * rate * t) > .2).astype(float) * (np.sin(2 * np.pi * t / S.rng.uniform(2.5, 4.5) + k) > -.2)
        gate = S.lowpass(gate, 120)
        s = np.sin(2 * np.pi * f * t) * gate * .05
        out[:, 0] += s * np.cos((pan + 1) * np.pi / 4); out[:, 1] += s * np.sin((pan + 1) * np.pi / 4)
    return out


def amb_wind(L=24.):
    n = int(L * SR); t = np.arange(n) / SR
    mod = .6 + .4 * np.sin(2 * np.pi * t / L * 2) * np.sin(2 * np.pi * t / L * 3 + 1)
    l = S.lowpass(S.rng.normal(0, 1, n), 500) * mod; r = S.lowpass(S.rng.normal(0, 1, n), 500) * mod
    return np.stack([l, r], 1) * .2


# ---------------------------------------------------------------- one-shot SFX (cue name -> list of variants)
def sweep(f0, f1, dur, vel=.5, shape='sine'):
    t = S.t_(dur); f = f0 * (f1 / f0) ** (t / dur); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) if shape == 'sine' else np.sign(np.sin(ph)) * .5
    return x * S.env_adsr(len(t), .005, .05, .8, dur * .5) * vel


def sparkle(n=6, base=1800, spread=1.6, dur=.5):
    out = np.zeros(int((dur + .4) * SR))
    for k in range(n):
        f = base * spread ** (k / n) * S.rng.uniform(.97, 1.03); x = S.bell(69, .35, .25); t = S.t_(.35)
        x = np.sin(2 * np.pi * f * t) * np.exp(-t / .08) * .3
        i = int(k * dur / n * SR); out[i:i + len(x)] += x
    return out


def poof(dur=.45, vel=.6, lo=300, hi=2500):
    t = S.t_(dur); n = S.bandpass(S.rng.normal(0, 1, len(t)), lo, hi) * np.exp(-t / (dur * .3)) * vel
    return n * S.env_adsr(len(t), .004, .05, 1, .1)


def boom(dist=1.):
    t = S.t_(2.2); body = S.lowpass(S.rng.normal(0, 1, len(t)), 160 / dist) * np.exp(-t / .5)
    crack = S.bandpass(S.rng.normal(0, 1, len(t)), 2000, 7000) * np.exp(-t / .02) * (1 / dist)
    out = body * 1.2 + crack
    for k in range(int(14 / dist)):                                        # crackle tail
        i = int(S.rng.uniform(.5, 1.8) * SR); c = S.bandpass(S.rng.normal(0, 1, 400), 3000, 9000) * np.exp(-np.arange(400) / 80) * .3
        out[i:i + 400] += c
    return out


def mix(*parts):
    """Layer mono parts: each item is an array or (array, delay_seconds[, gain])."""
    items = [(p, 0., 1.) if isinstance(p, np.ndarray) else (p[0], p[1], p[2] if len(p) > 2 else 1.) for p in parts]
    n = max(int(d * SR) + len(x) for x, d, g in items); out = np.zeros(n)
    for x, d, g in items: i = int(d * SR); out[i:i + len(x)] += x * g
    return out


def build_sfx():
    V = lambda f, k=3: [f() for _ in range(k)]
    u = S.rng.uniform
    return {
        'potion_pickup': V(lambda: mix(sparkle(5, u(1700, 2100), 1.5, .25), (poof(.08, .2, 2500, 7000), 0))),
        'potion_drink': V(lambda: mix(*[(poof(.09, .3, 250, 900), k * .11) for k in range(3)], (sweep(400, 900, .4, .15), .3)), 2),
        'charm_cast': V(lambda: mix(sweep(u(480, 540), 1400, .55, .3), (sparkle(7, 1500, 2, .5), .05, .8)), 2),
        'charm_end': [sweep(900, 450, .35, .22)],
        'cover_ward': [mix(S.bell(81, 1.6, .5), sweep(300, 900, .6, .2), (S.bell(86, 1.2, .25), .12))],
        'reveal_pop': V(lambda: mix(poof(.25, .9, 400, 3000), sweep(u(280, 330), 1200, .12, .5))),
        'reveal_hide': [poof(.3, .4, 300, 1500)],
        'guest_delivered': [mix(S.bell(74, 2.5, .5), (S.bell(81, 2.2, .35), .12), (sparkle(10, 1200, 2.2, 1.2), .05))],
        'stall_win': [sparkle(9, 1100, 2.4, .6)],
        'stall_fail': [sweep(400, 220, .4, .3, 'square') * .6],
        'stall_reward': [sparkle(6, 1600, 1.8, .35)],
        'stall_enter': [poof(.2, .3, 600, 3000)],
        'hit': V(lambda: mix(S.taiko(.7, .7)[:int(.5 * SR)], poof(.12, .6, 1500, 6000)), 2),
        'sealed': [mix(S.bell(45, 2.2, .5), poof(.6, .5, 150, 900))],
        'rescued': [mix(sweep(400, 1600, .5, .25), (sparkle(6, 1400, 2, .4), .1))],
        'boss_omen': [mix(S.taiko(1, 1.6)[:int(1.6 * SR)], sweep(90, 45, 1.2, .5))],
        'spirit_bolt': V(lambda: mix(sweep(u(700, 900), 2400, .22, .3), poof(.12, .3, 2000, 8000))),
        'ward_block': [S.kane(.7, 1500, .5)],
        'seal_break': [mix(S.kane(.6, 900, .7), poof(.3, .5, 800, 5000))],
        'boss_banished': [mix(S.taiko(1, 1.8)[:int(2.5 * SR)], S.bell(62, 2.5, .5), (sparkle(12, 900, 3, 1.4), .1))],
        'ping': [mix(S.bell(88, 1.0, .4), (S.bell(88, .8, .25), .18))],
        'footstep': [S.lowpass(poof(.09, u(.3, .45), 200, 1800), 1600) for _ in range(5)],
        'jump': [mix(sweep(220, 520, .16, .25), poof(.1, .2, 400, 2000))],
        'land': V(lambda: S.lowpass(poof(.14, .55, 120, 1200), 900), 2),
        'round_start': [mix(S.kane(.7), (S.kane(.6), .18))],
        'firework': [boom(1.), boom(1.6), boom(2.2)],
        'transform_gather': [mix(sweep(180, 720, 1.6, .25), (sparkle(10, 900, 2.5, 1.5), .05))],
        'transform_pop': [mix(poof(.6, 1., 200, 4000), S.taiko(.6, .8)[:int(1.0 * SR)], (sparkle(8, 1600, 2, .5), .05))],
        'transform_reveal': [S.bell(79, 1.8, .35)],
        'ui_click': [S.rim(.4)[:int(.08 * SR)] * .8],
        'ui_open': [sweep(500, 800, .12, .2)],
    }


VOICES = {   # character: (base pitch Hz, laugh syllables, surprise syllables)
    'mizu': (420, 'hi hi hi', 'e i!'), 'pon': (210, 'ho ho ho ho', 'o u!'), 'kon': (360, 'ko ko ko', 'a!'),
    'sumi': (300, 'ka ka ka ka', 'ga a!'), 'nemu': (330, 'hu hu hu', 'u!'), 'akari': (390, 'ha ha ha', 'a o!'), 'kasa': (470, 'ke ke ke', 'i i!')}


def build_voices():
    out = {}
    for c, (f0, laugh, wow) in VOICES.items():
        out[f'{c}_laugh'] = [S.voice(laugh, base=f0, rate=.1, vel=.5, bend=-.15)]
        out[f'{c}_surprise'] = [S.voice(wow, base=f0 * 1.15, rate=.13, vel=.55)]
    return out


# ---------------------------------------------------------------- render + encode
def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    import re
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]); tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)
    return I, float(tp[-1]) if tp else 0.


def write(name, buf, outdir, wavdir, target_lufs=None, peak_db=-3., mono=False, q=3, aac='96k'):
    buf = np.asarray(buf, float)
    if buf.ndim == 1: buf = S.stereo(buf) if not mono else buf[:, None]
    if mono and buf.shape[1] == 2: buf = buf.mean(1, keepdims=True)
    buf = S.normalize_peak(buf, -1.)
    wav = os.path.join(wavdir, name.replace('/', '_') + '.wav'); wavfile.write(wav, SR, (buf * 32767).astype(np.int16))
    if target_lufs is not None:
        I, _ = lufs(wav); gain = 10 ** ((target_lufs - I) / 20)
    else:
        gain = 10 ** (peak_db / 20) / (np.max(np.abs(buf)) + 1e-9)
    buf = buf * gain
    if np.max(np.abs(buf)) > 10 ** (-1 / 20): buf = S.soft_limit(buf / 10 ** (-1.2 / 20), 1.05) * 10 ** (-1.2 / 20)
    wavfile.write(wav, SR, (np.clip(buf, -1, 1) * 32767).astype(np.int16))
    dst = Path(outdir) / name; dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', str(q), str(dst) + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', aac, '-movflags', '+faststart', str(dst) + '.m4a'], check=True)
    return wav, len(buf) / SR


def main(a):
    only = set(a.only.split(',')) if a.only else None
    want = lambda k: only is None or k in only
    os.makedirs(a.wav, exist_ok=True)
    manifest_path = Path(a.out) / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'version': 1, 'formats': ['ogg', 'm4a'], 'music': {}, 'ambience': {}, 'sfx': {}, 'voice': {}}
    for key, fn, target in [('festival', festival, -20), ('boss', boss, -19), ('title', title, -22), ('victory', victory, -18), ('defeat', defeat, -20)]:
        if not want(key) and not want('music'): continue
        buf, meta = fn(); _, dur = write(f'music/{key}', buf, a.out, a.wav, target_lufs=target, q=2, aac='96k')
        manifest['music'][key] = {**meta, 'file': f'music/{key}', 'duration': round(dur, 3)}; print('music', key, round(dur, 1), 's')
    for key, fn in [('crowd', amb_crowd), ('insects', amb_insects), ('wind', amb_wind)]:
        if not want(key) and not want('amb'): continue
        _, dur = write(f'amb/{key}', fn(), a.out, a.wav, target_lufs=-30, q=1, aac='64k')
        manifest['ambience'][key] = {'file': f'amb/{key}', 'duration': round(dur, 3), 'loop': True}; print('amb', key)
    if want('sfx'):
        manifest['sfx'] = {}
        for cue, variants in build_sfx().items():
            files = []
            for i, v in enumerate(variants):
                _, dur = write(f'sfx/{cue}_{i}', v, a.out, a.wav, peak_db=-3, mono=True, q=3, aac='80k'); files.append(f'sfx/{cue}_{i}')
            if files: manifest['sfx'][cue] = files
        print('sfx', len(manifest['sfx']))
    if want('voice'):
        manifest['voice'] = {}
        for cue, variants in build_voices().items():
            _, dur = write(f'voice/{cue}', variants[0], a.out, a.wav, peak_db=-4, mono=True, q=3, aac='80k'); manifest['voice'][cue] = f'voice/{cue}'
        print('voice', len(manifest['voice']))
    manifest_path.write_text(json.dumps(manifest, indent=1) + '\n')
    total = sum(f.stat().st_size for f in Path(a.out).rglob('*') if f.suffix in ('.ogg', '.m4a'))
    print(f'total audio {total / 1024 / 1024:.2f} MB (ogg+m4a)')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('out', nargs='?', default='public/assets/audio')
    ap.add_argument('--only', default=''); ap.add_argument('--wav', default=tempfile.gettempdir() + '/r13wav')
    main(ap.parse_args())
