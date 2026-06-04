import React from 'react';

interface DiagnosisLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export const DiagnosisLogo: React.FC<DiagnosisLogoProps> = ({ 
  className = '', 
  size = 40,
  color = '#4EA5D9'
}) => {
  return (
    <svg 
      width={size || "100%"} 
      height={size || "100%"} 
      viewBox="5 15 90 70" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Linhas conectando os nós ao centro */}
      <line x1="50" y1="50" x2="50" y2="25" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="50" y1="50" x2="75" y2="32" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="50" y1="50" x2="87" y2="50" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="50" y1="50" x2="75" y2="75" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="50" y1="50" x2="25" y2="75" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="50" y1="50" x2="13" y2="50" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="50" y1="50" x2="25" y2="32" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

      {/* Linhas do perímetro externo */}
      <line x1="50" y1="25" x2="75" y2="32" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="75" y1="32" x2="87" y2="50" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="87" y1="50" x2="75" y2="75" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="75" y1="75" x2="25" y2="75" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="25" y1="75" x2="13" y2="50" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="13" y1="50" x2="25" y2="32" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="25" y1="32" x2="50" y2="25" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

      {/* Nó Central */}
      <circle cx="50" cy="50" r="10" fill={color} />

      {/* Nós Externos */}
      <circle cx="50" cy="25" r="7.5" fill={color} />
      <circle cx="75" cy="32" r="7.5" fill={color} />
      <circle cx="87" cy="50" r="7.5" fill={color} />
      <circle cx="75" cy="75" r="7.5" fill={color} />
      <circle cx="25" cy="75" r="7.5" fill={color} />
      <circle cx="13" cy="50" r="7.5" fill={color} />
      <circle cx="25" cy="32" r="7.5" fill={color} />
    </svg>
  );
};
