/*
  Warnings:

  - You are about to alter the column `account_number` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `transaction_date` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.

*/
-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "account_number" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "transaction_date" SET DATA TYPE VARCHAR(30);
