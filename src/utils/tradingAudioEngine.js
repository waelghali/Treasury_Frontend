// frontend/src/utils/tradingAudioEngine.js
// Institutional Web Audio API Sound Synthesizer — Zero External Audio Files Required

class TradingAudioEngine {
    constructor() {
        this.ctx = null;
        this.soundEnabled = true;
        this._initStorage();
        this._setupAutoplayUnlock();
    }

    _initStorage() {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('grow_trading_sound_enabled');
            if (saved !== null) {
                this.soundEnabled = saved === 'true';
            }
        }
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = Boolean(enabled);
        if (typeof window !== 'undefined') {
            localStorage.setItem('grow_trading_sound_enabled', String(this.soundEnabled));
        }
    }

    isSoundEnabled() {
        return this.soundEnabled;
    }

    _setupAutoplayUnlock() {
        if (typeof window === 'undefined') return;
        const unlock = () => {
            const ctx = this._getCtx();
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            if (ctx && ctx.state === 'running') {
                window.removeEventListener('click', unlock);
                window.removeEventListener('keydown', unlock);
                window.removeEventListener('touchstart', unlock);
                window.removeEventListener('pointerdown', unlock);
            }
        };
        ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
            window.addEventListener(evt, unlock, { passive: true });
        });
    }

    _getCtx() {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    /**
     * 1. Window Start Sound:
     * Resonant institutional desk chime announcing the quotation window has opened.
     */
    playWindowOpened() {
        if (!this.soundEnabled) return;
        const ctx = this._getCtx();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            // Harmonic desk chime (C5 + G5 + C6) with rich volume
            const chords = [
                { freq: 523.25, time: now, duration: 1.3, gain: 0.32 }, // C5
                { freq: 783.99, time: now + 0.08, duration: 1.2, gain: 0.28 }, // G5
                { freq: 1046.50, time: now + 0.16, duration: 1.1, gain: 0.22 } // C6
            ];

            chords.forEach(({ freq, time, duration, gain }) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, time);

                gainNode.gain.setValueAtTime(0.0001, time);
                gainNode.gain.linearRampToValueAtTime(gain, time + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

                osc.connect(gainNode);
                gainNode.connect(ctx.destination);

                osc.start(time);
                osc.stop(time + duration);
            });
        } catch (err) {
            console.warn('[TradingAudioEngine] playWindowOpened error:', err);
        }
    }

    /**
     * 2. Urgency Warning Sound:
     * High-visibility auditory countdown during final seconds before quotation window closes.
     * Features crisp attack and progressive pitch acceleration.
     */
    playUrgencyTick(secondsRemaining) {
        if (!this.soundEnabled) return;
        const ctx = this._getCtx();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const sec = typeof secondsRemaining === 'number' ? secondsRemaining : 5;
            const isCritical = sec <= 5;

            // Pitch escalates progressively as seconds count down to 0
            // 10s -> 880Hz, 5s -> 1050Hz, 3s -> 1180Hz, 1s -> 1320Hz
            const baseFreq = isCritical 
                ? 1046.50 + ((5 - Math.max(1, sec)) * 70)
                : 880.0;

            const targetGain = isCritical ? 0.48 : 0.32;
            const duration = isCritical ? 0.10 : 0.08;

            // Primary pulse
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = isCritical ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(baseFreq, now);

            if (isCritical) {
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + duration);
            }

            gainNode.gain.setValueAtTime(0.0001, now);
            gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.008);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + duration);

            // In critical seconds (1 to 3), add a snappy high harmonic click for maximum auditory clarity
            if (sec <= 3) {
                const subOsc = ctx.createOscillator();
                const subGain = ctx.createGain();

                subOsc.type = 'sine';
                subOsc.frequency.setValueAtTime(baseFreq * 1.5, now + 0.02);

                subGain.gain.setValueAtTime(0.0001, now + 0.02);
                subGain.gain.linearRampToValueAtTime(targetGain * 0.4, now + 0.025);
                subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

                subOsc.connect(subGain);
                subGain.connect(ctx.destination);

                subOsc.start(now + 0.02);
                subOsc.stop(now + 0.08);
            }
        } catch (err) {
            console.warn('[TradingAudioEngine] playUrgencyTick error:', err);
        }
    }

    /**
     * 3. Result Out Sound:
     * Definite resolution tone announcing that window has concluded and allocation results are ready.
     * @param {'WINNER' | 'PARTIALLY_WON' | 'INDICATIVE' | 'CONCLUDED' | 'NOT_SELECTED' | 'INCONCLUSIVE'} outcomeType
     */
    playResultOut(outcomeType = 'CONCLUDED') {
        if (!this.soundEnabled) return;
        const ctx = this._getCtx();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const isWinner = outcomeType === 'WINNER' || outcomeType === 'PARTIALLY_WON';
            const isIndicative = outcomeType === 'INDICATIVE' || outcomeType === 'INDICATIVE_ONLY';

            let notes;
            if (isWinner) {
                // Triumphant 4-note ascending fanfare with substantial presence (C5 -> E5 -> G5 -> C6)
                notes = [
                    { freq: 523.25, offset: 0.00, gain: 0.40, dur: 0.5 },
                    { freq: 659.25, offset: 0.12, gain: 0.42, dur: 0.5 },
                    { freq: 783.99, offset: 0.24, gain: 0.45, dur: 0.7 },
                    { freq: 1046.50, offset: 0.38, gain: 0.48, dur: 1.2 }
                ];
            } else if (isIndicative) {
                // Clear, harmonious benchmark confirmation (F5 -> A5 -> C6)
                notes = [
                    { freq: 698.46, offset: 0.00, gain: 0.35, dur: 0.5 },
                    { freq: 880.00, offset: 0.12, gain: 0.38, dur: 0.7 },
                    { freq: 1046.50, offset: 0.26, gain: 0.35, dur: 0.9 }
                ];
            } else {
                // Resonant desk conclusion gong (G4 -> C5 -> E5)
                notes = [
                    { freq: 392.00, offset: 0.00, gain: 0.34, dur: 0.5 },
                    { freq: 523.25, offset: 0.12, gain: 0.36, dur: 0.7 },
                    { freq: 659.25, offset: 0.24, gain: 0.32, dur: 0.9 }
                ];
            }

            notes.forEach(({ freq, offset, gain, dur }) => {
                const startTime = now + offset;
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                gainNode.gain.setValueAtTime(0.0001, startTime);
                gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

                osc.connect(gainNode);
                gainNode.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + dur);
            });
        } catch (err) {
            console.warn('[TradingAudioEngine] playResultOut error:', err);
        }
    }
}

export const tradingAudio = new TradingAudioEngine();
export default tradingAudio;
