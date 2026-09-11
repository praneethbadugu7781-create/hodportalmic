'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

interface ShaderSubmitButtonProps {
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ShaderSubmitButton({
  label = 'Sign In as Administrator',
  loading = false,
  disabled = false,
  className = '',
}: ShaderSubmitButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  useEffect(() => {
    const styleId = 'shader-canvas-style-submit';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .shader-container-submit canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 16px !important;
        }
        @keyframes shader-ripple-anim {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    let isMounted = true;
    const loadShader = async () => {
      try {
        const { liquidMetalFragmentShader, ShaderMount } = await import('@paper-design/shaders');

        if (shaderRef.current && isMounted) {
          if (shaderMount.current?.destroy) {
            shaderMount.current.destroy();
          }

          shaderMount.current = new ShaderMount(
            shaderRef.current,
            liquidMetalFragmentShader,
            {
              u_repetition: 4,
              u_softness: 0.5,
              u_shiftRed: 0.3,
              u_shiftBlue: 0.3,
              u_distortion: 0,
              u_contour: 0,
              u_angle: 45,
              u_scale: 8,
              u_shape: 1,
              u_offsetX: 0.1,
              u_offsetY: -0.1,
            },
            undefined,
            0.6,
          );
        }
      } catch (error) {
        console.warn('Shader engine fallback applied:', error);
      }
    };

    loadShader();

    return () => {
      isMounted = false;
      if (shaderMount.current?.destroy) {
        shaderMount.current.destroy();
        shaderMount.current = null;
      }
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    shaderMount.current?.setSpeed?.(1.2);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    shaderMount.current?.setSpeed?.(0.6);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    setIsPressed(true);

    if (shaderMount.current?.setSpeed) {
      shaderMount.current.setSpeed(2.5);
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = { x, y, id: rippleId.current++ };

      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    setTimeout(() => {
      if (isHovered) {
        shaderMount.current?.setSpeed?.(1.2);
      } else {
        shaderMount.current?.setSpeed?.(0.6);
      }
    }, 250);
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div
        style={{
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        }}
        className="w-full"
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '48px',
            transformStyle: 'preserve-3d',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Layer 1: Outer Shader & Glow Frame */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '48px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: isPressed
                ? '0px 2px 4px rgba(0, 0, 0, 0.3)'
                : isHovered
                ? '0px 14px 28px -6px rgba(37, 99, 235, 0.35), 0px 8px 16px -4px rgba(0, 0, 0, 0.15)'
                : '0px 8px 20px -4px rgba(37, 99, 235, 0.25), 0px 4px 8px -2px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              transform: `translateZ(0px) ${isPressed ? 'scale(0.99)' : isHovered ? 'scale(1.01)' : 'scale(1)'}`,
              zIndex: 10,
            }}
          >
            <div
              ref={shaderRef}
              className="shader-container-submit w-full h-full"
              style={{
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)',
              }}
            />
          </div>

          {/* Layer 2: Inner Deep Metal Surface */}
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              bottom: '2px',
              borderRadius: '14px',
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(2, 6, 23, 0.94) 100%)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: isPressed
                ? 'inset 0px 2px 4px rgba(0, 0, 0, 0.6)'
                : 'inset 0px 1px 1px rgba(255, 255, 255, 0.15)',
              transform: `translateZ(10px) ${isPressed ? 'scale(0.99)' : isHovered ? 'scale(1.01)' : 'scale(1)'}`,
              transition: 'all 0.3s ease',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          />

          {/* Layer 3: Typography & Icon Content */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transform: 'translateZ(20px)',
              zIndex: 30,
              pointerEvents: 'none',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="font-outfit font-bold text-sm text-white tracking-wide">
                  Authenticating...
                </span>
              </>
            ) : (
              <>
                <span className="font-outfit font-extrabold text-sm text-white tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {label}
                </span>
                <ArrowRight className="w-4 h-4 text-blue-300 transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </div>

          {/* Layer 4: Interactive Native Button with Click Ripples */}
          <button
            ref={buttonRef}
            type="submit"
            disabled={disabled || loading}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '48px',
              background: 'transparent',
              border: 'none',
              cursor: disabled || loading ? 'not-allowed' : 'pointer',
              outline: 'none',
              zIndex: 40,
              transform: 'translateZ(25px)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
            aria-label={label}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                style={{
                  position: 'absolute',
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(96, 165, 250, 0.6) 0%, rgba(255, 255, 255, 0) 70%)',
                  pointerEvents: 'none',
                  animation: 'shader-ripple-anim 0.6s ease-out',
                }}
              />
            ))}
          </button>
        </div>
      </div>
    </div>
  );
}
