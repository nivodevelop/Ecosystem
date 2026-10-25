-- Этапы канбана переезжают из enum в таблицу, которую редактирует админ.
-- Существующие данные переносятся: id этапа = прежнее значение enum в нижнем регистре.

ALTER TYPE "Stage" RENAME TO "Stage_old";

CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Stage" ("id", "name", "color", "sortOrder") VALUES
  ('development',  'Разработка',             '#94a3b8', 0),
  ('first_review', 'Первичная модерация',    '#f59e0b', 1),
  ('rejected',     'Реджект',                '#ef4444', 2),
  ('live_white',   'Белая в сторе',          '#38bdf8', 3),
  ('tech_update',  'Техническое обновление', '#a78bfa', 4),
  ('screenshots',  'Скрины',                 '#f472b6', 5),
  ('working',      'Работающая',             '#22c55e', 6),
  ('blocked',      'Заблокированная',        '#71717a', 7);

-- App.stage -> App.stageId
DROP INDEX "App_stage_position_idx";
ALTER TABLE "App" ADD COLUMN "stageId" TEXT;
UPDATE "App" SET "stageId" = lower("stage"::text);
ALTER TABLE "App" ALTER COLUMN "stageId" SET NOT NULL;
ALTER TABLE "App" DROP COLUMN "stage";
CREATE INDEX "App_stageId_position_idx" ON "App"("stageId", "position");
ALTER TABLE "App" ADD CONSTRAINT "App_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StageChange: ссылки на этапы + имена на момент перехода
ALTER TABLE "StageChange"
  ADD COLUMN "fromStageId" TEXT,
  ADD COLUMN "fromStageName" TEXT,
  ADD COLUMN "toStageId" TEXT,
  ADD COLUMN "toStageName" TEXT;
UPDATE "StageChange" sc SET
  "fromStageId" = lower(sc."fromStage"::text),
  "toStageId" = lower(sc."toStage"::text);
UPDATE "StageChange" sc SET "fromStageName" = s."name" FROM "Stage" s WHERE s."id" = sc."fromStageId";
UPDATE "StageChange" sc SET "toStageName" = s."name" FROM "Stage" s WHERE s."id" = sc."toStageId";
ALTER TABLE "StageChange" ALTER COLUMN "toStageName" SET NOT NULL;
ALTER TABLE "StageChange" DROP COLUMN "fromStage", DROP COLUMN "toStage";
ALTER TABLE "StageChange" ADD CONSTRAINT "StageChange_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StageChange" ADD CONSTRAINT "StageChange_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TYPE "Stage_old";
