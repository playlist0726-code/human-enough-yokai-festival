"""R13 synthesis toolkit: original instruments for a Japanese-festival (matsuri) sound, rendered offline.

Everything here is generated from code (no samples, no generated-audio credits), so every file in
public/assets/audio can be rebuilt bit-for-bit by build_audio.py. Instruments are stylised, not
emulations of any recording:
  flute()    shinobue-like transverse flute: breathy sine stack, pitch scoop, delayed vibrato
  pluck()    shamisen/koto-like Karplus-Strong string with a bright "sawari" buzz
  taiko()    big drum "don" (pitch-swept body + skin noise), rim()  "ka" rim click
  shime()    high tight drum, kane()  small hand gong (FM metallic), bell() soft temple bell
  voice()    formant "babble" for cartoon character vocalisations
"""
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 44100
rng = np.random.default_rng(2026)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def env_adsr(n, a=.01, d=.1, s=.7, r=.2, dur=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.ones(n) * s
    a = min(a, n); e[:a] = np.linspace(0, 1, a, endpoint=False)
    d = min(d, n - a); e[a:a + d] = np.linspace(1, s, d, endpoint=False)
    if r and n > r: e[n - r:] *= np.linspace(1, 0, r)
    return e


def bandpass(x, lo, hi, order=2):
    sos = butter(order, [max(lo, 20) / (SR / 2), min(hi, SR / 2 - 200) / (SR / 2)], btype='band', output='sos'); return sosfilt(sos, x)


def lowpass(x, f, order=2):
    sos = butter(order, min(f, SR / 2 - 200) / (SR / 2), btype='low', output='sos'); return sosfilt(sos, x)


def highpass(x, f, order=2):
    sos = butter(order, f / (SR / 2), btype='high', output='sos'); return sosfilt(sos, x)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


# ---------------------------------------------------------------- instruments
def flute(midi, dur, vel=.8, vib=.012, scoop=True, breath=.08):
    t = t_(dur + .12); f0 = hz(midi)
    pitch = np.ones_like(t)
    if scoop: pitch *= 2 ** ((-.6 * np.exp(-t / .035)) / 12)                 # scoop up into the note
    vib_amt = vib * np.clip((t - .18) / .25, 0, 1)                              # delayed vibrato
    pitch *= 1 + vib_amt * np.sin(2 * np.pi * 5.6 * t)
    ph = 2 * np.pi * np.cumsum(f0 * pitch) / SR
    tone = np.sin(ph) + .22 * np.sin(2 * ph) + .07 * np.sin(3 * ph) + .03 * np.sin(4 * ph)
    noise = bandpass(rng.normal(0, 1, len(t)), f0 * .8, f0 * 3.5) * breath
    chiff = bandpass(rng.normal(0, 1, len(t)), 2000, 7000) * np.exp(-t / .02) * .25
    e = env_adsr(len(t), .03, .12, .85, .1)
    return (tone * .9 + noise + chiff) * e * vel


def pluck(midi, dur, vel=.8, bright=.6, decay=.996, buzz=.15):
    f0 = hz(midi); n = int((dur + .3) * SR); p = max(2, int(SR / f0))
    buf = rng.uniform(-1, 1, p) * vel
    buf = lowpass(buf, 1500 + 7000 * bright) if p > 12 else buf
    out = np.zeros(n); b = buf.copy(); idx = 0
    for i in range(n):
        out[i] = b[idx]; nxt = (idx + 1) % p
        b[idx] = decay * .5 * (b[idx] + b[nxt]); idx = nxt
    out += buzz * np.tanh(out * 6) * np.exp(-np.arange(n) / SR / .15)         # sawari buzz on the attack
    out *= env_adsr(n, .001, .05, 1, .08)
    return out


def taiko(vel=1., size=1.):
    t = t_(1.4 * size); f = 52 / size + 70 / size * np.exp(-t / .045)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (.32 * size))
    skin = lowpass(rng.normal(0, 1, len(t)), 900) * np.exp(-t / .03) * .6
    thump = lowpass(rng.normal(0, 1, len(t)), 180) * np.exp(-t / .12) * .8
    return np.tanh((body * 1.1 + skin + thump) * 1.3) * vel


def rim(vel=.6):
    t = t_(.12); click = bandpass(rng.normal(0, 1, len(t)), 1800, 5200) * np.exp(-t / .012)
    wood = np.sin(2 * np.pi * 820 * t) * np.exp(-t / .03) * .5
    return (click + wood) * vel


def shime(vel=.7):
    t = t_(.35); f = 260 + 140 * np.exp(-t / .02)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .07)
    skin = bandpass(rng.normal(0, 1, len(t)), 800, 4000) * np.exp(-t / .015) * .5
    return (body + skin) * vel


def kane(vel=.5, f=1350, dur=.6):
    t = t_(dur)
    m1 = np.sin(2 * np.pi * f * 1.414 * t) * 2.2 * np.exp(-t / .08)
    m2 = np.sin(2 * np.pi * f * 2.76 * t) * 1.2 * np.exp(-t / .05)
    tone = np.sin(2 * np.pi * f * t + m1 + m2) * np.exp(-t / (dur * .35))
    hit = bandpass(rng.normal(0, 1, len(t)), 4000, 12000) * np.exp(-t / .006) * .4
    return (tone + hit) * vel


def bell(midi, dur=3., vel=.5):
    t = t_(dur); f = hz(midi)
    partials = [(1, 1, 1.0), (2.0, .5, .6), (2.76, .35, .45), (5.4, .2, .25), (8.9, .1, .12)]
    out = sum(a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t / (dur * d)) for r, a, d in partials)
    return out * vel * env_adsr(len(t), .002, .05, 1, .05)


def chappa(vel=.4):
    t = t_(.25); n = bandpass(rng.normal(0, 1, len(t)), 3000, 11000)
    ring = sum(np.sin(2 * np.pi * f * t) for f in (3120, 4470, 6910)) * .15
    return (n * .7 + ring) * np.exp(-t / .045) * vel


FORMANTS = {'a': (800, 1150, 2800), 'e': (400, 1900, 2600), 'i': (300, 2300, 3000), 'o': (450, 800, 2830), 'u': (325, 700, 2530)}


def voice(syllables, base=330, rate=.11, vel=.6, bend=0.):
    """Cartoon babble: glottal pulse train through 3 formants per vowel. syllables e.g. 'ha ha ha' or 'e i!'."""
    out = []
    sylls = syllables.split()
    for k, s in enumerate(sylls):
        v = next((c for c in s if c in FORMANTS), 'a'); dur = rate * (1.6 if s.endswith('!') else 1)
        t = t_(dur); f0 = base * (1 + bend * k / max(1, len(sylls) - 1)) * (1 + .06 * np.sin(2 * np.pi * 7 * t))
        if s.endswith('!'): f0 = f0 * (1 + .5 * np.clip(t / dur, 0, 1))         # surprised upward yelp
        ph = np.cumsum(f0) / SR; src = (ph % 1.0) * 2 - 1; src = np.sign(src) * np.abs(src) ** 3   # buzzy pulse
        if s.startswith('h'): src = src * .4 + rng.normal(0, .5, len(t)) * np.exp(-t / .03)
        y = sum(bandpass(src, f * .85, f * 1.15) * g for f, g in zip(FORMANTS[v], (1, .7, .35)))
        y *= env_adsr(len(y), .012, .03, .9, .03)
        out.append(y); out.append(np.zeros(int(.025 * SR)))
    return np.concatenate(out) * vel * 3


# ---------------------------------------------------------------- mixing helpers
def place(buf, x, at, gain=1., pan=0.):
    """Add mono x into stereo buf at time `at` (seconds) with equal-power pan."""
    i = max(0, int(at * SR)); n = min(len(x), buf.shape[0] - i)
    if n <= 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + n, 0] += x[:n] * gain * l; buf[i:i + n, 1] += x[:n] * gain * r


def reverb_ir(rt60=1.6, predelay=.02, seconds=2.4, bright=6000):
    n = int(seconds * SR); t = np.arange(n) / SR
    ir = np.stack([lowpass(rng.normal(0, 1, n), bright), lowpass(rng.normal(0, 1, n), bright)], 1)
    ir *= np.exp(-6.9 * t / rt60)[:, None]; ir[:int(predelay * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))


def reverb(buf, wet=.18, **kw):
    ir = reverb_ir(**kw)
    wetsig = np.stack([fftconvolve(buf[:, c], ir[:, c])[:len(buf)] for c in range(2)], 1)
    return buf * (1 - wet * .5) + wetsig * wet


def loop_wrap(buf, tail):
    """Fold the last `tail` seconds (reverb ring-out) back onto the start so the loop is seamless."""
    n = int(tail * SR); body = buf[:-n].copy(); body[:n] += buf[-n:]; return body


def normalize_peak(buf, peak_db=-1.):
    p = np.max(np.abs(buf)) + 1e-9; return buf * (10 ** (peak_db / 20) / p)


def soft_limit(buf, drive=1.2):
    return np.tanh(buf * drive) / np.tanh(drive)


def stereo(x):
    return np.stack([x, x], 1)
