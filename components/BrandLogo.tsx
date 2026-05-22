import React from 'react';

interface BrandLogoProps {
    className?: string;
    variant?: 'white' | 'black' | 'mascot';
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = "h-8", variant = 'white' }) => {
    if (variant === 'mascot') {
        return <img src="/mascot.png" alt="Bokle AI" className={`${className} object-contain`} />;
    }
    const src = variant === 'white' ? '/logo-white.png' : '/logo-black.png';
    return <img src={src} alt="Bokle AI" className={`${className} object-contain`} />;
};

export default BrandLogo;
