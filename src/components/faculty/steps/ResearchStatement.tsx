interface Props {
  data: string
  onChange: (data: string) => void
}

export default function ResearchStatementStep({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text mb-1">Research Statement</h3>
        <p className="text-sm text-text-secondary">
          Provide a comprehensive statement of your research agenda, accomplishments, and future directions.
        </p>
      </div>

      <div>
        <textarea
          value={data}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your research statement here. Include your research interests, methodology, key findings, contributions to the field, and future research plans..."
          rows={15}
          className="min-h-[300px]"
        />
        <p className="text-xs text-text-dim mt-1.5">
          {data.length} characters · {data.split(/\s+/).filter(Boolean).length} words
        </p>
      </div>
    </div>
  )
}
