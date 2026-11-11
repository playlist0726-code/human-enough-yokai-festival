# Credits and licenses

Every shipped third-party or generated asset is listed here with its source and license (ASSET_CONTRACT §9).
Non-commercial licenses (CC-BY-NC etc.) are not allowed.

## UI (R05)
| Asset | Path | Source | License |
|---|---|---|---|
| Fredoka (variable, latin) | `public/assets/ui/fonts/fredoka-latin-wght.woff2` | Fredoka by Milena Brandão and Hafontia, via npm `@fontsource-variable/fredoka@5.3.0` | SIL OFL 1.1 (`public/assets/ui/fonts/OFL-fredoka.txt`) |
| Nunito (variable, latin) | `public/assets/ui/fonts/nunito-latin-wght.woff2` | Nunito by Vernon Adams, Cyreal and Jacques Le Bailly, via npm `@fontsource-variable/nunito@5.3.0` | SIL OFL 1.1 (`public/assets/ui/fonts/OFL-nunito.txt`) |
| Paper and wood textures, 9-slices | `public/assets/ui/*.png`, `*.webp` | Procedural, `source/v2/ui/build_ui_textures.py` (seed 20261108) | Original (project) |
| Icon family (17 SVG) | `public/assets/ui/icons/` | Hand-drawn `potion.svg` + `source/v2/ui/build_icons.py` | Original (project) |
| Title wordmark | `public/assets/ui/logo-wordmark*.webp` | Matted from the project key art `public/assets/human-enough-title.png` by `source/v2/ui/build_logo.py` | Same as the key art (project) |

## Audio (R13)
| Asset | Path | Source | License |
|---|---|---|---|
| Music: title, festival, boss, victory, defeat | `public/assets/audio/music/` | Original compositions, synthesized by `source/v2/audio/build_audio.py` (no samples) | Original (project) |
| Ambience: crowd, insects, wind | `public/assets/audio/amb/` | Synthesized (formant babble, sine crickets, filtered noise) | Original (project) |
| Sound effects (31 cues) | `public/assets/audio/sfx/` | Synthesized (`synth.py` instruments) | Original (project) |
| Character voices (7 x laugh / surprise) | `public/assets/audio/voice/` | Formant synthesis, nonsense syllables | Original (project) |

No third-party audio, no generated-audio services. Every file can be rebuilt with `python3 -I source/v2/audio/build_audio.py public/assets/audio`.
