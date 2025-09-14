type ProgressBarProps = {
  /** Percentage completion from 0 to 100 */
  percentage: number;
};

export default function ProgressBar({ percentage }: ProgressBarProps) {
  return (
    <div className="w-250 bg-gray-800 h-6 rounded-lg overflow-hidden">
      <div
        className="bg-blue-500 h-6 rounded-lg transition-all duration-500"
        style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
      />
    </div>
  );
}