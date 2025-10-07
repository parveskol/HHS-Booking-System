import React from 'react';

interface CricketGroundIconProps {
  className?: string;
  size?: number;
}

export const CricketGroundIcon: React.FC<CricketGroundIconProps> = ({
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
      {/* Outer ground circle */}
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="#86efac"
        stroke="#16a34a"
        strokeWidth="1"
      />

      {/* Cricket wicket (stumps) */}
      <g transform="translate(12, 12)">
        {/* Left stump */}
        <rect
          x="-3"
          y="-6"
          width="1.5"
          height="12"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth="0.5"
        />

        {/* Middle stump */}
        <rect
          x="-0.75"
          y="-6"
          width="1.5"
          height="12"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth="0.5"
        />

        {/* Right stump */}
        <rect
          x="1.5"
          y="-6"
          width="1.5"
          height="12"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth="0.5"
        />

        {/* Bails */}
        <rect
          x="-3.5"
          y="-6"
          width="7"
          height="0.8"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth="0.3"
        />
      </g>
    </svg>
  );
};

export default CricketGroundIcon;