-- Агентство работает только с App Store: убираем платформу и локали, которых нет в App Store Connect.

ALTER TABLE "App" DROP COLUMN "platform";
DROP TYPE "Platform";

UPDATE "App" SET "primaryLocale" = 'en-US' WHERE "primaryLocale" NOT IN ('ar-SA','ca','zh-Hans','zh-Hant','hr','cs','da','nl-NL','en-US','en-GB','en-AU','en-CA','fi','fr-FR','fr-CA','de-DE','el','he','hi','hu','id','it','ja','ko','ms','no','pl','pt-BR','pt-PT','ro','ru','sk','es-ES','es-MX','sv','th','tr','uk','vi');
INSERT INTO "Localization" ("id", "appId", "locale", "updatedAt")
  SELECT 'loc_' || a."id", a."id", 'en-US', NOW() FROM "App" a
  WHERE NOT EXISTS (SELECT 1 FROM "Localization" l WHERE l."appId" = a."id" AND l."locale" = 'en-US')
    AND a."primaryLocale" = 'en-US';
DELETE FROM "LocaleScreenshot" WHERE "locale" NOT IN ('ar-SA','ca','zh-Hans','zh-Hant','hr','cs','da','nl-NL','en-US','en-GB','en-AU','en-CA','fi','fr-FR','fr-CA','de-DE','el','he','hi','hu','id','it','ja','ko','ms','no','pl','pt-BR','pt-PT','ro','ru','sk','es-ES','es-MX','sv','th','tr','uk','vi');
DELETE FROM "Localization" WHERE "locale" NOT IN ('ar-SA','ca','zh-Hans','zh-Hant','hr','cs','da','nl-NL','en-US','en-GB','en-AU','en-CA','fi','fr-FR','fr-CA','de-DE','el','he','hi','hu','id','it','ja','ko','ms','no','pl','pt-BR','pt-PT','ro','ru','sk','es-ES','es-MX','sv','th','tr','uk','vi');
