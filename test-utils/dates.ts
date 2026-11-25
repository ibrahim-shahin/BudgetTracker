import { addDays, periodOf, today } from '@/utils/dates';

/** Today and nearby days, so tests about "this month" work on any date. */
export const TODAY = today();
export const YESTERDAY = addDays(TODAY, -1);
export const THIS_MONTH = periodOf(TODAY, 1);
/** A day in the previous calendar month. */
export const LAST_MONTH_DAY = addDays(`${THIS_MONTH}-01`, -3);
export const LAST_MONTH = periodOf(LAST_MONTH_DAY, 1);
