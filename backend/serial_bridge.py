import logging
import serial

log = logging.getLogger(__name__)

# Maps D-pad directions to normalized 0.0–1.0 float values.
# Scaled to 0–1023 and sent as a newline-terminated integer string.
# Arduino parses with Serial.parseInt() and maps to servo angle 0–180°.
COMMAND_MAP = {
    "forward":  0.5,
    "backward": 0.5,
    "left":     0.0,
    "right":    1.0,
    "stop":     0.5,
}


class SerialBridge:
    def __init__(self, port: str, baud: int):
        self.port = port
        self.baud = baud
        self._serial: serial.Serial | None = None

    def connect(self):
        try:
            self._serial = serial.Serial(self.port, self.baud, timeout=1)
            log.info("Serial connection opened: %s @ %d baud", self.port, self.baud)
        except serial.SerialException as e:
            log.warning("Could not open serial port %s: %s — running without hardware", self.port, e)
            self._serial = None

    def disconnect(self):
        if self._serial and self._serial.is_open:
            self._serial.close()
            log.info("Serial connection closed")

    def send(self, direction: str):
        value = COMMAND_MAP.get(direction)
        if value is None:
            log.warning("No serial mapping for direction: %s", direction)
            return
        raw = round(value * 1023)
        cmd = f"{raw}\n".encode()
        if self._serial and self._serial.is_open:
            self._serial.write(cmd)
            log.debug("Serial write: %s", cmd)
        else:
            log.info("(no serial) would send: %s -> %d", direction, raw)
