import logging
import serial

log = logging.getLogger(__name__)

COMMAND_MAP = {
    "forward":  b"S\n",
    "backward": b"S\n",
    "left":     b"L\n",
    "right":    b"R\n",
    "stop":     b"S\n",
}


class SerialBridge:
    def __init__(self, port: str, baud: int):
        self.port = port
        self.baud = baud
        self._serial: serial.Serial | None = None

    def connect(self):
        try:
            self._serial = serial.Serial(self.port, self.baud, timeout=1, write_timeout=1)
            log.info("Serial connection opened: %s @ %d baud", self.port, self.baud)
        except serial.SerialException as e:
            log.warning("Could not open serial port %s: %s — running without hardware", self.port, e)
            self._serial = None

    def disconnect(self):
        if self._serial and self._serial.is_open:
            self._serial.close()
            log.info("Serial connection closed")

    def send(self, direction: str):
        cmd = COMMAND_MAP.get(direction)
        if cmd is None:
            log.warning("No serial mapping for direction: %s", direction)
            return
        if self._serial and self._serial.is_open:
            try:
                self._serial.write(cmd)
                log.debug("Serial write: %s", cmd)
            except (serial.SerialTimeoutException, serial.SerialException) as e:
                log.warning("Serial write failed (%s) — reconnecting", e)
                self.disconnect()
                self.connect()
        else:
            log.info("(no serial) would send: %s -> %s", direction, cmd)
