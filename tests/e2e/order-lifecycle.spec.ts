import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

function makePrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
}

function toUtcDateText(date: Date): string {
  return date.toISOString().slice(0, 10);
}

test("order lifecycle: create -> collect -> closed", async ({ page }) => {
  const prisma = makePrisma();
  test.skip(!prisma, "DATABASE_URL is required for e2e test");

  const tag = `E2E-${Date.now()}`;
  const borrowerName = `${tag}-Borrower`;
  const accountName = `${tag}-Account`;

  let createdOrderId: string | null = null;
  let createdAccountId: string | null = null;

  try {
    const account = await prisma!.account.create({
      data: {
        name: accountName,
        type: "cash",
        openingBalance: 5000,
        currentBalance: 5000,
      },
    });
    createdAccountId = account.id;

    await page.goto("/orders");

    await page.getByRole("button", { name: "New Order" }).click();
    await page.getByLabel("Borrower *").fill(borrowerName);
    await page.getByLabel("Principal *").fill("1000");
    await page.getByLabel("Monthly Rate *").fill("0.01");
    await page.getByLabel("Months *").fill("1");
    await page.getByRole("button", { name: "Create Order" }).click();

    await expect(page.getByText(borrowerName)).toBeVisible();

    const order = await prisma!.order.findFirst({
      where: { borrowerName },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    expect(order).toBeTruthy();
    createdOrderId = order!.id;

    await page.goto(`/orders/${createdOrderId}`);
    await expect(page.getByText("Repayment Plans")).toBeVisible();

    await page.getByRole("button", { name: "Collect" }).first().click();

    const accountOption = page.getByLabel("Account *");
    await accountOption.selectOption(createdAccountId!);

    await page.getByRole("button", { name: "Confirm Collect" }).click();

    await expect(page.getByText("Settled")).toBeVisible();
    await expect(page.getByText("CLOSED")).toBeVisible();
  } finally {
    if (createdOrderId) {
      const plans = await prisma!.repaymentPlan.findMany({
        where: { orderId: createdOrderId },
        select: { id: true, transactionId: true },
      });

      const transactionIds = plans
        .map((p) => p.transactionId)
        .filter((id): id is string => Boolean(id));

      await prisma!.attachment.deleteMany({ where: { orderId: createdOrderId } });
      if (transactionIds.length > 0) {
        await prisma!.transaction.deleteMany({ where: { id: { in: transactionIds } } });
      }
      await prisma!.repaymentPlan.deleteMany({ where: { orderId: createdOrderId } });
      await prisma!.order.delete({ where: { id: createdOrderId } });
    }

    if (createdAccountId) {
      await prisma!.account.deleteMany({ where: { id: createdAccountId } });
    }

    await prisma!.$disconnect();
  }
});

test("calendar drawer can collect repayment for filtered borrower", async ({ page }) => {
  const prisma = makePrisma();
  test.skip(!prisma, "DATABASE_URL is required for e2e test");

  const tag = `CAL-${Date.now()}`;
  const borrowerName = `${tag}-Borrower`;
  const accountName = `${tag}-Account`;
  const now = new Date();
  const dayStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dueDateText = toUtcDateText(dayStartUtc);

  let createdOrderId: string | null = null;
  let createdAccountId: string | null = null;

  try {
    const account = await prisma!.account.create({
      data: {
        name: accountName,
        type: "cash",
        openingBalance: 3000,
        currentBalance: 3000,
      },
    });
    createdAccountId = account.id;

    const order = await prisma!.order.create({
      data: {
        orderNo: `${tag}-ORDER`,
        borrowerName,
        principal: 1000,
        monthlyRate: 0.01,
        startDate: dayStartUtc,
        months: 1,
        status: "active",
      },
    });
    createdOrderId = order.id;

    const plan = await prisma!.repaymentPlan.create({
      data: {
        orderId: order.id,
        periodIndex: 1,
        dueDate: new Date(dayStartUtc.getTime() + 12 * 60 * 60 * 1000),
        principalDue: 1000,
        interestDue: 10,
        totalDue: 1010,
        status: "pending",
      },
    });
    await page.goto("/repayments/calendar");
    await page.getByTestId("calendar-keyword-input").fill(borrowerName);
    await page.getByTestId("calendar-search-button").click();

    await page.getByTestId(`calendar-cell-${dueDateText}`).click();
    await page.getByTestId(`calendar-drawer-collect-${plan.id}`).click();

    const accountOption = page.getByTestId("calendar-collect-account-select");
    await accountOption.selectOption(createdAccountId!);
    await page.getByTestId("calendar-collect-confirm-button").click();

    await expect(page.getByText("Settled")).toBeVisible();

    const refreshedPlan = await prisma!.repaymentPlan.findUnique({
      where: { id: plan.id },
      select: { status: true, transactionId: true },
    });
    expect(refreshedPlan?.status).toBe("paid");
    expect(refreshedPlan?.transactionId).toBeTruthy();
  } finally {
    if (createdOrderId) {
      const plans = await prisma!.repaymentPlan.findMany({
        where: { orderId: createdOrderId },
        select: { id: true, transactionId: true },
      });

      const transactionIds = plans
        .map((p) => p.transactionId)
        .filter((id): id is string => Boolean(id));

      await prisma!.attachment.deleteMany({ where: { orderId: createdOrderId } });
      await prisma!.repaymentPlan.deleteMany({ where: { orderId: createdOrderId } });
      if (transactionIds.length > 0) {
        await prisma!.transaction.deleteMany({ where: { id: { in: transactionIds } } });
      }
      await prisma!.order.delete({ where: { id: createdOrderId } });
    }

    if (createdAccountId) {
      await prisma!.transaction.deleteMany({ where: { accountId: createdAccountId } });
      await prisma!.account.deleteMany({ where: { id: createdAccountId } });
    }

    await prisma!.$disconnect();
  }
});
