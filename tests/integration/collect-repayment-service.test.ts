import assert from "node:assert/strict";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  collectRepayment,
  CollectRepaymentError,
} from "../../src/lib/services/collect-repayment-service.ts";

let prisma: PrismaClient | null = null;

function mustPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error("prisma not initialized");
  }

  return prisma;
}

let dbReady: boolean | undefined;

async function ensureDbReady(): Promise<boolean> {
  if (dbReady !== undefined) {
    return dbReady;
  }

  if (!process.env.DATABASE_URL) {
    dbReady = false;
    return false;
  }

  try {
    if (!prisma) {
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      });
    }
    await mustPrisma().$queryRaw`SELECT 1`;
    dbReady = true;
  } catch {
    dbReady = false;
  }

  return dbReady;
}

async function cleanup(ids: {
  attachmentIds?: string[];
  planIds?: string[];
  transactionIds?: string[];
  orderIds?: string[];
  accountIds?: string[];
}) {
  if (!prisma) {
    return;
  }

  if (ids.attachmentIds?.length) {
    await prisma.attachment.deleteMany({ where: { id: { in: ids.attachmentIds } } });
  }

  if (ids.planIds?.length) {
    await prisma.repaymentPlan.deleteMany({ where: { id: { in: ids.planIds } } });
  }

  if (ids.transactionIds?.length) {
    await prisma.transaction.deleteMany({ where: { id: { in: ids.transactionIds } } });
  }

  if (ids.orderIds?.length) {
    await prisma.order.deleteMany({ where: { id: { in: ids.orderIds } } });
  }

  if (ids.accountIds?.length) {
    await prisma.account.deleteMany({ where: { id: { in: ids.accountIds } } });
  }
}

async function seedSinglePlanFixture(tag: string) {
  const p = mustPrisma();

  const account = await p.account.create({
    data: {
      name: `INT-${tag}-Account`,
      type: "cash",
      openingBalance: 1000,
      currentBalance: 1000,
    },
  });

  const order = await p.order.create({
    data: {
      orderNo: `INT-${tag}-${Date.now()}`,
      borrowerName: "Integration Borrower",
      principal: 1000,
      monthlyRate: 0.01,
      startDate: new Date("2026-03-01T00:00:00.000Z"),
      months: 1,
      status: "active",
    },
  });

  const plan = await p.repaymentPlan.create({
    data: {
      orderId: order.id,
      periodIndex: 1,
      dueDate: new Date("2026-03-10T00:00:00.000Z"),
      principalDue: 1000,
      interestDue: 10,
      totalDue: 1010,
      status: "pending",
    },
  });

  return { account, order, plan };
}

test("collectRepayment success updates plan, account, tx and order status", async (t) => {
  if (!(await ensureDbReady())) {
    t.skip("DATABASE_URL is not available for integration test");
    return;
  }

  const fixture = await seedSinglePlanFixture("SUCCESS");

  try {
    const p = mustPrisma();
    const result = await collectRepayment(p, {
      planId: fixture.plan.id,
      accountId: fixture.account.id,
      amount: 1010,
      occurredAt: new Date("2026-03-10T10:00:00.000Z"),
      note: "integration collect",
    });

    assert.equal(result.planId, fixture.plan.id);
    assert.equal(result.orderId, fixture.order.id);
    assert.equal(result.orderStatus, "closed");

    const [plan, account, order, tx] = await Promise.all([
      p.repaymentPlan.findUnique({ where: { id: fixture.plan.id } }),
      p.account.findUnique({ where: { id: fixture.account.id } }),
      p.order.findUnique({ where: { id: fixture.order.id } }),
      p.transaction.findUnique({ where: { id: result.transactionId } }),
    ]);

    assert.equal(plan?.status, "paid");
    assert.equal(Number(plan?.totalDue), 1010);
    assert.equal(Number(account?.currentBalance), 2010);
    assert.equal(order?.status, "closed");
    assert.equal(tx?.type, "inflow");
    assert.equal(Number(tx?.amount), 1010);
  } finally {
    await cleanup({
      planIds: [fixture.plan.id],
      orderIds: [fixture.order.id],
      accountIds: [fixture.account.id],
    });
  }
});

test("collectRepayment with amount mismatch rolls back all writes", async (t) => {
  if (!(await ensureDbReady())) {
    t.skip("DATABASE_URL is not available for integration test");
    return;
  }

  const fixture = await seedSinglePlanFixture("ROLLBACK");

  try {
    await assert.rejects(
      () =>
        collectRepayment(mustPrisma(), {
          planId: fixture.plan.id,
          accountId: fixture.account.id,
          amount: 1000,
          occurredAt: new Date("2026-03-10T10:00:00.000Z"),
        }),
      (err: unknown) =>
        err instanceof CollectRepaymentError && err.code === "AMOUNT_MISMATCH",
    );

    const [plan, account, txCount] = await Promise.all([
      mustPrisma().repaymentPlan.findUnique({ where: { id: fixture.plan.id } }),
      mustPrisma().account.findUnique({ where: { id: fixture.account.id } }),
      mustPrisma().transaction.count({
        where: {
          counterparty: "Integration Borrower",
          occurredAt: new Date("2026-03-10T10:00:00.000Z"),
        },
      }),
    ]);

    assert.equal(plan?.status, "pending");
    assert.equal(Number(account?.currentBalance), 1000);
    assert.equal(txCount, 0);
  } finally {
    await cleanup({
      planIds: [fixture.plan.id],
      orderIds: [fixture.order.id],
      accountIds: [fixture.account.id],
    });
  }
});

test("collectRepayment concurrent calls allow only one success", async (t) => {
  if (!(await ensureDbReady())) {
    t.skip("DATABASE_URL is not available for integration test");
    return;
  }

  const fixture = await seedSinglePlanFixture("CONCURRENT");

  try {
    const settled = await Promise.allSettled([
      collectRepayment(mustPrisma(), {
        planId: fixture.plan.id,
        accountId: fixture.account.id,
        amount: 1010,
        occurredAt: new Date("2026-03-10T11:00:00.000Z"),
      }),
      collectRepayment(mustPrisma(), {
        planId: fixture.plan.id,
        accountId: fixture.account.id,
        amount: 1010,
        occurredAt: new Date("2026-03-10T11:00:00.000Z"),
      }),
    ]);

    const fulfilled = settled.filter((r) => r.status === "fulfilled").length;
    const rejected = settled.filter((r) => r.status === "rejected").length;

    assert.equal(fulfilled, 1);
    assert.equal(rejected, 1);

    const [plan, txCount] = await Promise.all([
      mustPrisma().repaymentPlan.findUnique({ where: { id: fixture.plan.id } }),
      mustPrisma().transaction.count({
        where: {
          counterparty: "Integration Borrower",
          occurredAt: new Date("2026-03-10T11:00:00.000Z"),
        },
      }),
    ]);

    assert.equal(plan?.status, "paid");
    assert.equal(txCount, 1);
  } finally {
    await cleanup({
      planIds: [fixture.plan.id],
      orderIds: [fixture.order.id],
      accountIds: [fixture.account.id],
    });
  }
});

test.after(async () => {
  await prisma?.$disconnect();
});
