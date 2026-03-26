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
    <div className={`dpad${disabled ? " dpad-disabled" : ""}`}>
      {/* <button className="dpad-up" {...makeHandlers('forward')}>▲</button> */}
      <button
        className="dpad-left"
        disabled={disabled}
        {...makeHandlers("left")}
      >
        ◀
      </button>
      <div className="dpad-center" />
      <button
        className="dpad-right"
        disabled={disabled}
        {...makeHandlers("right")}
      >
        ▶
      </button>
      {/* <button className="dpad-down" {...makeHandlers('backward')}>▼</button> */}
    </div>
  );
}
