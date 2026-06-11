import { format, differenceInDays, addMonths } from "date-fns";

export function formatDate(date: Date | string, pattern = "dd MMM yyyy") {
  return format(new Date(date), pattern);
}

export function daysUntil(date: Date | string) {
  return differenceInDays(new Date(date), new Date());
}

export function defaultProbationEnd(joiningDate: Date) {
  return addMonths(joiningDate, 3);
}
