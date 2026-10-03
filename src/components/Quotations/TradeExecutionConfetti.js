import React, { useEffect, useRef } from 'react';

/**
 * Institutional Celebration Confetti with Gravitational Vortex Absorption.
 * Confetti bursts across the screen for ~1.5s, then in the final second,
 * spirals down and gets sucked directly into the unlocked trophy badge,
 * triggering a triumphant golden absorption pulse!
 */
const TradeExecutionConfetti = ({ durationMs = 2500, targetTrophyId = null, targetTier = null, onComplete }) => {
    const canvasRef = useRef(null);
    const hasTriggeredPulseRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        // Tier-tailored metallic & prestige celebration palette
        let colors = [
            '#F59E0B', // Amber Gold
            '#EAB308', // Bright Gold
            '#10B981', // Emerald Win
            '#06B6D4', // Platinum Cyan
            '#6366F1', // Royal Indigo
            '#FFFFFF'  // Diamond Shimmer
        ];

        const normTier = (targetTier || '').toUpperCase();
        if (normTier.includes('BRONZE')) {
            colors = ['#D97706', '#B45309', '#F59E0B', '#FDE68A', '#FFFFFF', '#92400E'];
        } else if (normTier.includes('SILVER')) {
            colors = ['#FFFFFF', '#E2E8F0', '#CBD5E1', '#94A3B8', '#F1F5F9', '#64748B'];
        } else if (normTier.includes('GOLD')) {
            colors = ['#F59E0B', '#EAB308', '#FDE047', '#FEF08A', '#FFFFFF', '#D97706'];
        } else if (normTier.includes('PLATINUM') || normTier.includes('CYAN') || normTier.includes('DIAMOND')) {
            colors = ['#06B6D4', '#38BDF8', '#BAE6FD', '#E0F2FE', '#FFFFFF', '#0284C7'];
        }

        // Generate ~75 refined confetti ribbons and particles
        const particleCount = 75;
        const particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: width * 0.5 + (Math.random() - 0.5) * (width * 0.7),
                y: -10 - Math.random() * 80,
                w: Math.random() * 10 + 6,
                h: Math.random() * 6 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 4.5,
                vy: Math.random() * 3 + 2.5,
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 8,
                shape: Math.random() > 0.4 ? 'rect' : 'circle',
                radius: Math.random() * 3.5 + 2,
                scale: 1.0
            });
        }

        const startTime = performance.now();
        let animId;

        const render = (now) => {
            const elapsed = now - startTime;
            if (elapsed >= durationMs) {
                ctx.clearRect(0, 0, width, height);
                if (onComplete) onComplete();
                return;
            }

            ctx.clearRect(0, 0, width, height);
            ctx.save();

            // Sucking vortex activation in the final 950ms (from 1550ms to 2500ms)
            const SUCK_START_MS = 1550;
            const isSucking = elapsed >= SUCK_START_MS;
            let targetX = width * 0.65;
            let targetY = 70;

            if (isSucking && targetTrophyId) {
                const badgeElId = targetTrophyId.startsWith('trophy-badge-') 
                    ? targetTrophyId 
                    : `trophy-badge-${targetTrophyId}`;
                const targetEl = document.getElementById(badgeElId);
                if (targetEl) {
                    const pulseTarget = targetEl.firstElementChild || targetEl;
                    const rect = pulseTarget.getBoundingClientRect();
                    targetX = rect.left + rect.width / 2;
                    targetY = rect.top + rect.height / 2;

                    // Trigger the triumphant absorption pulse right as particles enter the trophy
                    const suckProgress = (elapsed - SUCK_START_MS) / (durationMs - SUCK_START_MS);
                    if (suckProgress >= 0.88 && !hasTriggeredPulseRef.current) {
                        hasTriggeredPulseRef.current = true;
                        
                        // Detect exact tier to pulse in the matching metallic hue
                        const detectedTier = (
                            normTier || 
                            pulseTarget.getAttribute('data-tier') || 
                            targetEl.getAttribute('data-tier') || 
                            'GOLD'
                        ).toUpperCase();

                        const absorbClass = detectedTier.includes('BRONZE') ? 'animate-trophy-absorb-bronze'
                            : detectedTier.includes('SILVER') ? 'animate-trophy-absorb-silver'
                            : (detectedTier.includes('PLATINUM') || detectedTier.includes('CYAN') || detectedTier.includes('DIAMOND')) ? 'animate-trophy-absorb-platinum'
                            : 'animate-trophy-absorb-gold';

                        pulseTarget.classList.add(absorbClass);
                        setTimeout(() => {
                            pulseTarget.classList.remove(absorbClass);
                        }, 1250);
                    }
                }
            }

            const suckProgress = isSucking 
                ? Math.min(1.0, (elapsed - SUCK_START_MS) / (durationMs - SUCK_START_MS))
                : 0;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                if (isSucking) {
                    const dx = targetX - p.x;
                    const dy = targetY - p.y;
                    const angle = Math.atan2(dy, dx);
                    
                    // Accelerating magnetic pull towards the trophy
                    const pull = Math.pow(suckProgress, 1.6) * 20;
                    // Dynamic spiral swirl that tightens as it gets closer
                    const swirl = (1 - suckProgress) * 4.5;

                    p.vx += Math.cos(angle) * pull - Math.sin(angle) * swirl;
                    p.vy += Math.sin(angle) * pull + Math.cos(angle) * swirl;
                    p.vx *= 0.87;
                    p.vy *= 0.87;

                    // Shrink size down to zero as it gets sucked in
                    p.scale = Math.max(0, 1 - Math.pow(suckProgress, 1.25));
                } else {
                    p.vy += 0.055; // Gentle flutter gravity
                }

                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.vRot * (1 + suckProgress * 2.5);

                const currentScale = p.scale !== undefined ? p.scale : 1.0;
                if (currentScale <= 0.02) continue;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.scale(currentScale, currentScale);
                ctx.fillStyle = p.color;

                if (p.shape === 'rect') {
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            ctx.restore();
            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animId) cancelAnimationFrame(animId);
        };
    }, [durationMs, targetTrophyId, onComplete]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
};

export default TradeExecutionConfetti;
