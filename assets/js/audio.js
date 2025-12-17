export class AudioManager {
    constructor() {
        this.enabled = true;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.1; // Keep it subtle
        this.masterGain.connect(this.ctx.destination);

        this.ambientNodes = [];
        this.isAmbientPlaying = false;
        this.birdIntervals = [];
    }

    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            this.startAmbient();
        } else {
            this.stopAmbient();
        }
        return this.enabled;
    }

    startAmbient() {
        if (!this.enabled || this.isAmbientPlaying) return;

        this.isAmbientPlaying = true;
        const now = this.ctx.currentTime;

        // 1. Very Subtle Morning Atmosphere (High-passed Noise)
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000; // Air/Hiss only

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0;

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start();
        // Reduced background noise level significantly
        noiseGain.gain.linearRampToValueAtTime(0.005, now + 5);
        this.ambientNodes.push(noise, noiseFilter, noiseGain);

        // 2. Active Bird Singing (Increased Frequency)
        // More birds, singing more often
        const bird1 = setInterval(() => { if (Math.random() > 0.3) this.playBird('chirp'); }, 1500);
        const bird2 = setInterval(() => { if (Math.random() > 0.4) this.playBird('tweet'); }, 2800);
        const bird3 = setInterval(() => { if (Math.random() > 0.6) this.playBird('trill'); }, 4500);
        const bird4 = setInterval(() => { if (Math.random() > 0.5) this.playBird('chirp'); }, 2000); // Added 4th bird

        this.birdIntervals.push(bird1, bird2, bird3, bird4);
    }

    playBird(type) {
        if (!this.enabled) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        // Randomize pitch slightly for variety
        const baseFreq = 2000 + Math.random() * 1000;

        // Increased volume for all birds
        const birdVolume = 0.3;

        switch (type) {
            case 'chirp':
                // Quick downward chirp
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.1);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(birdVolume, now + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'tweet':
                // Two-tone tweet
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.setValueAtTime(baseFreq, now + 0.1);
                osc.frequency.setValueAtTime(baseFreq * 1.2, now + 0.15);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(birdVolume, now + 0.05);
                gain.gain.setValueAtTime(birdVolume, now + 0.1);
                gain.gain.linearRampToValueAtTime(0, now + 0.25);

                osc.start(now);
                osc.stop(now + 0.25);
                break;

            case 'trill':
                // FM Synthesis for trilling sound
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, now);

                // Modulator for the trill
                const mod = this.ctx.createOscillator();
                mod.type = 'sine';
                mod.frequency.value = 15 + Math.random() * 5; // Fast vibrato

                const modGain = this.ctx.createGain();
                modGain.gain.value = 500; // Depth of trill

                mod.connect(modGain);
                modGain.connect(osc.frequency);

                mod.start(now);
                mod.stop(now + 0.4);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(birdVolume * 0.8, now + 0.1);
                gain.gain.linearRampToValueAtTime(0, now + 0.4);

                osc.start(now);
                osc.stop(now + 0.4);
                break;
        }
    }

    stopAmbient() {
        this.birdIntervals.forEach(i => clearInterval(i));
        this.birdIntervals = [];

        const now = this.ctx.currentTime;
        this.ambientNodes.forEach(node => {
            if (node.gain && node.gain.cancelScheduledValues) {
                node.gain.cancelScheduledValues(now);
                node.gain.linearRampToValueAtTime(0, now + 1);
            }
            if (node.stop) node.stop(now + 1);
        });

        setTimeout(() => {
            this.ambientNodes = [];
            this.isAmbientPlaying = false;
        }, 1000);
    }

    play(type) {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.ctx.currentTime;

        switch (type) {
            case 'click':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
                gain.gain.setValueAtTime(1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'success':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.1);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;

            case 'delete':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(100, now + 0.15);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;

            case 'hover':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.03);
                osc.start(now);
                osc.stop(now + 0.03);
                break;
        }
    }
}
