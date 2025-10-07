import React from 'react';

interface IndoorNetIconProps {
  className?: string;
  size?: number;
}

export const IndoorNetIcon: React.FC<IndoorNetIconProps> = ({
  className = "",
  size = 24
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Indoor net structure - triangular shape */}
      <path
        d="M12 2 L22 12 L12 22 L2 12 Z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="0.5"
      />

      {/* Net pattern - diagonal lines */}
      <path
        d="M4 4 L20 20 M6 2 L22 18 M8 0 L24 16 M10 2 L20 12"
        stroke="#f59e0b"
        strokeWidth="0.3"
        opacity="0.6"
      />

      {/* Cricket wicket on top */}
      <g transform="translate(12, 8)">
        {/* Left stump */}
        <rect
          x="-2"
          y="-3"
          width="1"
          height="6"
          fill="#1f2937"
          stroke="#111827"
          strokeWidth="0.3"
        />

        {/* Middle stump */}
        <rect
          x="-0.5"
          y="-3"
          width="1"
          height="6"
          fill="#1f2937"
          stroke="#111827"
          strokeWidth="0.3"
        />

        {/* Right stump */}
        <rect
          x="1"
          y="-3"
          width="1"
          height="6"
          fill="#1f2937"
          stroke="#111827"
          strokeWidth="0.3"
        />

        {/* Bails */}
        <rect
          x="-2.5"
          y="-3"
          width="5"
          height="0.5"
          fill="#1f2937"
          stroke="#111827"
          strokeWidth="0.2"
        />
      </g>

      {/* Base line */}
      <rect
        x="2"
        y="20"
        width="20"
        height="1"
        fill="#f59e0b"
        opacity="0.8"
      />
    </svg>
  );
};

export default IndoorNetIcon;