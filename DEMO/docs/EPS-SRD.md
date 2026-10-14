\# EPS-SRD: Electrical Power Subsystem Requirements Document

Project: DEMOSAT-1 (fictional 3U cubesat) · Version 1.0



\## 4. Power management requirements



\### 4.1 General

4.1.1 The EPS shall supply the bus with regulated power during sunlight and eclipse.



\### 4.2 Safe mode

4.2.1 \*\*REQ-EPS-014\*\*: When the battery voltage drops below 7.0 V, the satellite shall enter SAFE\_MODE within 10 s.

4.2.2 \*\*REQ-EPS-030\*\*: Once in SAFE\_MODE, the satellite shall not return to NOMINAL during eclipse.



\### 4.3 Battery protection

4.3.1 \*\*REQ-EPS-021\*\*: The battery voltage shall not drop below 6.5 V at any time.

4.3.2 \*\*REQ-EPS-017\*\*: The battery voltage shall not exceed 8.4 V at any time.



\### 4.4 Recovery

4.4.1 \*\*REQ-EPS-009\*\*: The satellite should return to NOMINAL after the battery is sufficiently charged.

&#x20;  (Note: no voltage threshold is specified.)

4.4.2 \*\*REQ-EPS-025\*\*: The EPS should react promptly to a low bus voltage condition.

&#x20;  (Note: "promptly" is not quantified.)

