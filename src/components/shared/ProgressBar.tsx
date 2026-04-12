interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  labels: string[]
}

export default function ProgressBar({ currentStep, totalSteps, labels }: ProgressBarProps) {
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < currentStep
                ? 'bg-primary'
                : i === currentStep
                  ? 'bg-primary-light'
                  : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Step info */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">
          Step {currentStep + 1} of {totalSteps}
        </p>
        <p className="text-sm text-text-secondary">{labels[currentStep]}</p>
      </div>
    </div>
  )
}
