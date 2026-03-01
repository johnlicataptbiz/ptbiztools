interface PLParsePreviewProps {
  tablePreview: string[][]
  textPreview: string
  sourceType: string
}

export default function PLParsePreview({ tablePreview, textPreview, sourceType }: PLParsePreviewProps) {
  return (
    <div className="pl-import-preview">
      <h4>Parse Preview ({sourceType.toUpperCase()})</h4>

      {tablePreview.length > 0 ? (
        <div className="pl-import-preview-table-wrap">
          <table className="pl-import-preview-table">
            <tbody>
              {tablePreview.slice(0, 12).map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.slice(0, 5).map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <pre className="pl-import-preview-text">{textPreview || 'No text preview available.'}</pre>
    </div>
  )
}
