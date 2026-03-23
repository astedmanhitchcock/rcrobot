#include <Servo.h>

Servo myservo;
const int servoPin = 7;
const int NEUTRAL = 90;
const int STEP = 5;
const int LOOP_DELAY = 20;

int currentPos = NEUTRAL;
char command = 'S';

void setup() {
  Serial.begin(9600);
  myservo.attach(servoPin);
  myservo.write(currentPos);
}

void loop() {
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == 'L' || c == 'R' || c == 'S') {
      command = c;
    }
  }

  if (command == 'L') {
    currentPos = max(0, currentPos + STEP);
  } else if (command == 'R') {
    currentPos = min(180, currentPos - STEP);
  } else {
    if (currentPos < NEUTRAL) currentPos = min(NEUTRAL, currentPos + STEP);
    else if (currentPos > NEUTRAL) currentPos = max(NEUTRAL, currentPos - STEP);
  }

  myservo.write(currentPos);
  delay(LOOP_DELAY);
}
