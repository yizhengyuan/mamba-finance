import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { generateRepaymentPlans } from "../src/lib/domain/repayment-plan-generator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for seed");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  await prisma.attachment.deleteMany();
  await prisma.repaymentPlan.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.account.deleteMany();

  const cashAccount = await prisma.account.create({
    data: {
      name: "现金账户",
      type: "cash",
      openingBalance: 50000,
      currentBalance: 50000,
    },
  });

  const wechatAccount = await prisma.account.create({
    data: {
      name: "微信收款",
      type: "wechat",
      openingBalance: 20000,
      currentBalance: 20000,
    },
  });

  const orders = [
    {
      orderNo: "ORD-20260303-001",
      borrowerName: "张三",
      borrowerPhone: "13800000001",
      principal: 10000,
      monthlyRate: 0.01,
      startDate: new Date("2026-02-10T00:00:00.000Z"),
      months: 3,
      collateralDesc: "金饰",
      notes: "测试订单1",
    },
    {
      orderNo: "ORD-20260303-002",
      borrowerName: "李四",
      borrowerPhone: "13800000002",
      principal: 8000,
      monthlyRate: 0.0125,
      startDate: new Date("2026-01-31T00:00:00.000Z"),
      months: 2,
      collateralDesc: "手机",
      notes: "测试订单2",
    },
  ];

  for (const orderInput of orders) {
    const order = await prisma.order.create({
      data: {
        orderNo: orderInput.orderNo,
        borrowerName: orderInput.borrowerName,
        borrowerPhone: orderInput.borrowerPhone,
        principal: orderInput.principal,
        monthlyRate: orderInput.monthlyRate,
        startDate: orderInput.startDate,
        months: orderInput.months,
        collateralDesc: orderInput.collateralDesc,
        notes: orderInput.notes,
        status: "active",
      },
    });

    const plans = generateRepaymentPlans({
      principal: orderInput.principal,
      monthlyRate: orderInput.monthlyRate,
      startDate: orderInput.startDate,
      months: orderInput.months,
    });

    await prisma.repaymentPlan.createMany({
      data: plans.map((plan) => ({
        orderId: order.id,
        periodIndex: plan.periodIndex,
        dueDate: plan.dueDate,
        principalDue: plan.principalDue,
        interestDue: plan.interestDue,
        totalDue: plan.totalDue,
        status: plan.status,
      })),
    });

    await prisma.attachment.create({
      data: {
        orderId: order.id,
        category: "collateral_photo",
        fileName: `${orderInput.orderNo}-collateral.jpg`,
        fileUrl: `/uploads/${orderInput.orderNo}-collateral.jpg`,
        mimeType: "image/jpeg",
        sizeBytes: 1024,
      },
    });
  }

  console.log(
    `Seed complete. Accounts: ${[cashAccount.name, wechatAccount.name].join(", ")}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
