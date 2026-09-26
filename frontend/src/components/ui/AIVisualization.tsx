import React from 'react';
import { AIConstellationBackground } from './AIConstellationBackground';

interface AIVisualizationProps {
  className?: string;
  height?: number | string;
  interactive?: boolean;
}

export const AIVisualization: React.FC<AIVisualizationProps> = ({
  className = '',
  height = 240,
  interactive = true,
}) => {
  return (
    <AIConstellationBackground
      className={className}
      height={height}
      interactive={interactive}
    />
  );
};
