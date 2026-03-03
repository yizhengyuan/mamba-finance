export interface GenerateRepaymentPlansInput {
  principal: number;
  monthlyRate: number;
  startDate: Date;
  months: number;
}

export interface RepaymentPlanDraft {
  periodIndex: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  status: "pending";
}

const CENTS_FACTOR = 100;

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * CENTS_FACTOR) / CENTS_FACTOR;
}

function getDaysInUtcMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

export function addMonthsWithAnchor(startDate: Date, monthsToAdd: number): Date {
  if (!Number.isInteger(monthsToAdd) || monthsToAdd < 0) {
    throw new Error("monthsToAdd must be a non-negative integer");
  }

  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const anchorDay = startDate.getUTCDate();

  const targetMonthIndex = startMonth + monthsToAdd;
  const targetYear = startYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const maxDay = getDaysInUtcMonth(targetYear, targetMonth);
  const targetDay = Math.min(anchorDay, maxDay);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      startDate.getUTCHours(),
      startDate.getUTCMinutes(),
      startDate.getUTCSeconds(),
      startDate.getUTCMilliseconds(),
    ),
  );
}

export function generateRepaymentPlans(
  input: GenerateRepaymentPlansInput,
): RepaymentPlanDraft[] {
  const { principal, monthlyRate, startDate, months } = input;

  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error("principal must be greater than 0");
  }

  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0 || monthlyRate > 1) {
    throw new Error("monthlyRate must be between 0 and 1");
  }

  if (!Number.isInteger(months) || months < 1) {
    throw new Error("months must be an integer greater than or equal to 1");
  }

  const interestPerPeriod = round2(principal * monthlyRate);
  const roundedPrincipal = round2(principal);

  return Array.from({ length: months }, (_, index) => {
    const periodIndex = index + 1;
    const principalDue = periodIndex === months ? roundedPrincipal : 0;
    const interestDue = interestPerPeriod;
    const totalDue = round2(principalDue + interestDue);

    return {
      periodIndex,
      dueDate: addMonthsWithAnchor(startDate, periodIndex),
      principalDue,
      interestDue,
      totalDue,
      status: "pending",
    };
  });
}
