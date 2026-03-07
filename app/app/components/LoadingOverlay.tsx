"use client";
import React, { useEffect, useState } from 'react';

/**
 * NCFN Loading Overlay
 * Custom SVG animation for portal transitions and initial load.
 */
export default function LoadingOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        // Check if already loaded in this session
        const hasLoaded = sessionStorage.getItem('ncfn_portal_loaded');

        if (hasLoaded) {
            setShouldRender(false);
            return;
        }

        // First time in session
        setShouldRender(true);
        setIsVisible(true);

        // Minimum display time to ensure animation completes a full cycle (~0.8s)
        const timer = setTimeout(() => {
            setIsVisible(false);
            sessionStorage.setItem('ncfn_portal_loaded', 'true');
            // Remove from DOM after transition
            setTimeout(() => setShouldRender(false), 500);
        }, 800);

        return () => clearTimeout(timer);
    }, []);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-500 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            <div className="w-64 h-64 md:w-80 md:h-80 relative">
                <svg
                    viewBox="0 0 400 400"
                    id="svg_ncfn_loading"
                    className="w-full h-full drop-shadow-[0_0_30px_rgba(0,85,170,0.4)]"
                >
                    <defs id="defs_ncfn_load">
                        <mask id="loading_mask">
                            <circle cx="200" cy="200" r="190" fill="white" stroke="black" stroke-width="15" />
                            <circle cx="200" cy="200" r="190" fill="none" stroke="black" stroke-width="15" stroke-dasharray="10 1194">
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from="0 200 200"
                                    to="360 200 200"
                                    dur="2s"
                                    repeatCount="indefinite" />
                            </circle>
                        </mask>
                    </defs>

                    <rect width="100%" height="100%" fill="#000000" />

                    <g id="emblem_structure">
                        <circle cx="200" cy="200" r="185" fill="none" stroke="#a0a0a0" stroke-width="3" opacity="0.6" />
                        <circle cx="200" cy="200" r="160" fill="none" stroke="#001a33" stroke-width="25" />

                        <path id="portal_path" d="M 90,200 A 110,110 0 0,1 310,200" fill="none" />
                        <text font-family="Verdana, Geneva, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" letter-spacing="8">
                            <textPath xlinkHref="#portal_path" startOffset="50%" textAnchor="middle">PORTAL</textPath>
                        </text>

                        <path id="ncfn_path" d="M 90,200 A 110,110 0 0,0 310,200" fill="none" />
                        <text font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="900" fill="#f0f0f0" letter-spacing="4">
                            <textPath xlinkHref="#ncfn_path" startOffset="50%" textAnchor="middle">NCFN</textPath>
                        </text>

                        <g id="central_icon" transform="translate(145,145) scale(0.55)" fill="#c0c0c0">
                            <path d="M 100,0 L 130,70 L 200,100 L 130,130 L 100,200 L 70,130 L 0,100 L 70,70 Z" opacity="0.8" />
                            <path d="M 20,80 Q 50,20 100,20 Q 150,20 180,80 L 160,100 Q 100,60 40,100 Z" opacity="1" />
                            <path d="M 90,40 Q 100,30 110,40 L 105,60 Q 100,55 95,60 Z" fill="#ffffff" />
                        </g>
                    </g>

                    <circle
                        cx="200"
                        cy="200"
                        r="172.5"
                        fill="none"
                        stroke="#0055aa"
                        stroke-width="8"
                        stroke-dasharray="10 1084"
                        stroke-dashoffset="0"
                        opacity="0.9"
                        mask="url(#loading_mask)">
                    </circle>
                </svg>

                <div className="absolute -bottom-12 left-0 right-0 text-center">
                    <p className="text-[#00f3ff] font-mono text-xs uppercase tracking-[0.4em] animate-pulse">
                        Sincronizando Inteligência...
                    </p>
                </div>
            </div>
        </div>
    );
}
