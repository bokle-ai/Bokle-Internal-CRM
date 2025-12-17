
import React, { useState, useEffect } from 'react';

interface BrandLogoProps {
    className?: string;
    variant?: 'full' | 'icon';
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = "w-10 h-10", variant = 'icon' }) => {
    const [imgError, setImgError] = useState(false);
    const [customLogo, setCustomLogo] = useState<string | null>(null);

    useEffect(() => {
        // Check for user-uploaded logo
        const stored = localStorage.getItem('bokle_brand_logo');
        if (stored) setCustomLogo(stored);
    }, []);

    // 1. Priority: User Uploaded
    if (customLogo && !imgError) {
        return (
            <img 
                src={customLogo} 
                alt="Bokle AI" 
                className={`${className} object-contain rounded-lg`} 
                onError={() => setImgError(true)}
            />
        );
    }

    // 2. Priority: Public folder (fallback)
    if (!imgError && !customLogo) {
        return (
            <img 
                src="/logo.png" 
                alt="Bokle AI" 
                className={`${className} object-contain`} 
                onError={() => setImgError(true)}
            />
        );
    }

    // 3. Fallback: Vector Mascot
    return (
        <div className={`${className} bg-[#FBEFD0] rounded-full flex items-center justify-center shadow-sm overflow-hidden border border-white shrink-0 relative group`}>
             <svg viewBox="0 0 120 120" className="w-full h-full transform group-hover:scale-105 transition-transform duration-300">
                {/* Ears */}
                <path d="M15 25 Q5 5 40 10" fill="#373737" /> 
                <path d="M105 25 Q115 5 80 10" fill="#373737" />
                <path d="M22 28 Q15 15 35 18" fill="#E8A996" /> 
                <path d="M98 28 Q105 15 85 18" fill="#E8A996" />
                
                {/* Head */}
                <path d="M20 50 C20 90 40 105 60 105 C80 105 100 90 100 50 C100 25 80 20 60 20 C40 20 20 25 20 50" fill="#FDF6E3" stroke="#373737" strokeWidth="2" />
                
                {/* Forehead Pattern */}
                <path d="M60 20 L40 45 Q60 65 80 45 Z" fill="#373737" />
                
                {/* Tech Lines (Neon) */}
                <path d="M60 25 L60 40" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" /> 
                <path d="M50 32 L55 37" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
                <path d="M70 32 L65 37" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />

                {/* Face Stripes */}
                <path d="M22 60 L35 70 L25 80 Z" fill="#373737" opacity="0.9" />
                <path d="M98 60 L85 70 L95 80 Z" fill="#373737" opacity="0.9" />

                {/* Eyes */}
                <ellipse cx="40" cy="65" rx="12" ry="15" fill="#15803d" stroke="#373737" strokeWidth="2" />
                <ellipse cx="80" cy="65" rx="12" ry="15" fill="#15803d" stroke="#373737" strokeWidth="2" />
                <circle cx="44" cy="60" r="4" fill="white" />
                <circle cx="76" cy="60" r="4" fill="white" />

                {/* Nose/Mouth */}
                <path d="M52 88 Q60 95 68 88" stroke="#373737" strokeWidth="2" fill="none" strokeLinecap="round" />
                <ellipse cx="60" cy="84" rx="5" ry="3" fill="#E8A996" />
            </svg>
        </div>
    );
};

export default BrandLogo;
