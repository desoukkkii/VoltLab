import { useState } from 'react'

export default function SaveModal({ circuit }) {
  const [name, setName] = useState('')

  return (
    <div
      className="fixed inset-0 bg-[rgba(5,7,12,0.65)] backdrop-blur-md flex items-center justify-center p-5 z-[1000] animate-overlay-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-modal-title"
    >
      <div className="bg-gradient-to-b from-[#161a24] to-[#11141c] border border-white/[0.14] rounded-[16px] p-5 sm:p-7 w-full max-w-[460px] mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-modal-in">
        <h2 id="save-modal-title" className="text-lg font-bold tracking-[-0.01em] mb-1.5">Save Circuit</h2>
        <p className="text-[13px] text-[#93a0bb] mb-[18px] leading-relaxed">
          Give your circuit a memorable name. You'll find it again under{' '}
          <em className="text-[#f4f6fb] not-italic font-semibold">Load</em>.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') circuit.doSave(name) }}
          placeholder="e.g. 4-bit counter"
          autoComplete="off"
          autoFocus
          className="w-full px-3.5 py-[11px] bg-[#0f1218] border border-white/[0.07] rounded-[8px] text-[14px] text-[#f4f6fb] font-inherit outline-none transition-all duration-[180ms] focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(96,165,250,0.18)]"
        />
        <p className="text-[12px] text-red-500 mt-2 min-h-[18px]" role="alert">
          {circuit.saveError}
        </p>
        <div className="flex gap-2 justify-end mt-[22px]">
          <button
            onClick={() => circuit.hideSave()}
            className="px-[18px] py-[9px] bg-transparent border border-white/[0.14] rounded-[8px] text-[13px] font-semibold text-[#f4f6fb] cursor-pointer transition-all duration-[180ms] hover:bg-white/[0.06] active:translate-y-[1px]"
          >
            Cancel
          </button>
          <button
            onClick={() => circuit.doSave(name)}
            className="px-[18px] py-[9px] bg-gradient-to-b from-blue-400 to-violet-600 border-transparent rounded-[8px] text-[13px] font-semibold text-white cursor-pointer shadow-[0_6px_22px_-10px_rgba(124,58,237,0.6)] transition-all duration-[180ms] hover:brightness-110 active:translate-y-[1px]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
