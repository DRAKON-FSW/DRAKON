/* eps_config.h (DEMOSAT-1, fictional) */
#ifndef EPS_CONFIG_H
#define EPS_CONFIG_H

float THRESH_SAFE = 7.0f;          /* V: enter SAFE_MODE below this value */
#define TLM_SAMPLE_PERIOD_S 30     /* s: battery telemetry sampling period (conflicts with EPS-SRD 4.5.1: 10 s) */

#endif