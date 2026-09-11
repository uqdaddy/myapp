export function MoveLegend({ placement = false }: { placement?: boolean }) {
  return <div className="move-legend" aria-label="착수 표시 안내">
    {!placement && <span><i className="legend-from" />출발</span>}
    <span><i className="legend-to" />{placement ? '마지막 돌' : '도착'}</span>
    {!placement && <span><i className="legend-selected" />선택 · <i className="legend-target" />이동 가능</span>}
  </div>;
}
