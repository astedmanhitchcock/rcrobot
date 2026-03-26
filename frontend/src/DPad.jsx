const btnClass =
  "flex items-center justify-center text-3xl bg-[#2a2a2a] text-[#ccc] border-2 border-[#444] rounded-xl cursor-pointer touch-none select-none w-full aspect-square transition-all duration-75 active:bg-[#3a5a3a] active:text-white active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed";

export function DPad({ onCommand, disabled = false }) {
  function makeHandlers(direction) {
    if (disabled) return {};
    return {
      onPointerDown(e) {
        e.currentTarget.setPointerCapture(e.pointerId);
        onCommand(direction);
      },
      onPointerUp() {
        onCommand("stop");
      },
      onPointerLeave() {
        onCommand("stop");
      },
    };
  }

  return (
    <div className="grid [grid-template-columns:repeat(3,6rem)] gap-1.5">
      {/* <button className={`col-start-2 row-start-1 ${btnClass}`} {...makeHandlers('forward')}>▲</button> */}
      <button
        className={`col-start-1 row-start-2 ${btnClass}`}
        disabled={disabled}
        {...makeHandlers("left")}
      >
        ◀
      </button>
      <div className="col-start-2 row-start-2 bg-[#222] rounded-xl" />
      <button
        className={`col-start-3 row-start-2 ${btnClass}`}
        disabled={disabled}
        {...makeHandlers("right")}
      >
        ▶
      </button>
      {/* <button className={`col-start-2 row-start-3 ${btnClass}`} {...makeHandlers('backward')}>▼</button> */}
    </div>
  );
}
