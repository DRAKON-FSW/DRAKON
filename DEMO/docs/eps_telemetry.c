/* eps_telemetry.c (DEMOSAT-1, fictional) */
#include <math.h>
#include "eps_config.h"

/* Every telemetry sample must carry a valid battery voltage. */
int eps_report_vbat(float vbat, float *out)
{
    if (isnan(vbat)) {
        return -1;            /* invalid sample is never reported */
    }
    *out = vbat;
    return 0;
}