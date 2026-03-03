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

    const accountOption = page.locator("select").first();
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
