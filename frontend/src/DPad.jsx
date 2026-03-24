export function DPad({ onCommand }) {
  function makeHandlers(direction) {
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
    <div className="dpad">
      {/* <button className="dpad-up" {...makeHandlers('forward')}>▲</button> */}
      <button className="dpad-left" {...makeHandlers("left")}>
        ◀
      </button>
      <div className="dpad-center" />
      <button className="dpad-right" {...makeHandlers("right")}>
        ▶
      </button>
      {/* <button className="dpad-down" {...makeHandlers('backward')}>▼</button> */}
    </div>
  );
}
