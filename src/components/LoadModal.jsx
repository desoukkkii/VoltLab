export default function LoadModal({ circuit }) {
  const names = Object.keys(circuit.savedCircuits)

  return (
    <div
      className="fixed inset-0 bg-[rgba(5,7,12,0.65)] backdrop-blur-md flex items-center justify-center p-5 z-[1000] animate-overlay-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-modal-title"
    >
      <div className="bg-gradient-to-b from-[#161a24] to-[#11141c] border border-white/[0.14] rounded-[16px] p-5 sm:p-7 w-full max-w-[460px] mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-modal-in">
        <h2 id="load-modal-title" className="text-lg font-bold tracking-[-0.01em] mb-1.5">Load Circuit</h2>
        <p className="text-[13px] text-[#93a0bb] mb-[18px] leading-relaxed">Open a previously saved design.</p>
        <div
          id="saved-circuits-list"
          className={`max-h-[380px] overflow-y-auto pr-1 scrollbar-thin ${names.length === 0 ? 'text-center py-9 text-[13px] text-[#6b7794]' : ''}`}
        >
          {names.length === 0 ? (
            'No saved circuits found.'
          ) : (
            names.map(name => {
              const item = circuit.savedCircuits[name]
              const date = item.savedAt ? new Date(item.savedAt).toLocaleDateString() : ''
              return (
                <div
                  key={name}
                  className="flex items-center justify-between gap-3 px-3.5 py-3 bg-[#0f1218] border border-white/[0.07] rounded-[8px] mb-2 transition-all duration-[180ms] hover:border-blue-400 hover:bg-blue-400/[0.04] hover:-translate-y-px"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-[#f4f6fb] overflow-hidden text-ellipsis whitespace-nowrap">
                      {name}
                    </div>
                    {date && (
                      <div className="text-[11.5px] text-[#6b7794] mt-0.5 tabular-nums">{date}</div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => circuit.loadCircuit(item)}
                      className="px-2.5 py-[5px] text-xs font-semibold bg-transparent border border-white/[0.14] rounded-[6px] text-[#93a0bb] cursor-pointer transition-all duration-[180ms] hover:border-blue-400 hover:text-[#f4f6fb]"
                    >
                      Load
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); circuit.deleteCircuit(name) }}
                      className="px-2.5 py-[5px] text-xs font-semibold bg-transparent border border-white/[0.14] rounded-[6px] text-[#93a0bb] cursor-pointer transition-all duration-[180ms] hover:border-red-500 hover:text-red-500 hover:bg-red-500/8"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="flex gap-2 justify-end mt-[22px]">
          <button
            onClick={() => circuit.hideLoad()}
            className="px-[18px] py-[9px] bg-transparent border border-white/[0.14] rounded-[8px] text-[13px] font-semibold text-[#f4f6fb] cursor-pointer transition-all duration-[180ms] hover:bg-white/[0.06] active:translate-y-[1px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
